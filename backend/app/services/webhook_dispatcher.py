"""
Webhook Dispatcher — T3 Sentinel
----------------------------------
Delivers event notifications to company-registered webhook URLs when the HDE
detects hallucinations or other tracked events occur.

Delivery guarantees:
- HMAC-SHA256 signature via X-T3-Signature header (when a secret is set)
- Up to 3 delivery attempts with exponential backoff: 1 s, 4 s, 16 s
- 4xx client errors are not retried (assume permanent misconfiguration)
- last_triggered_at is stamped on the webhook row after a successful delivery

Usage:
    asyncio.create_task(dispatch_webhook(
        brand_id=4,
        event="hallucination.detected",
        payload={...},
    ))
"""

import asyncio
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone

import httpx

from app.database import get_supabase

logger = logging.getLogger(__name__)

# Supported event types — kept here as the single source of truth so both
# the router validators and the dispatcher agree on the valid set.
SUPPORTED_EVENTS = frozenset(["hallucination.detected", "scan.completed"])


async def dispatch_webhook(brand_id: int, event: str, payload: dict) -> None:
    """
    Send a webhook notification to every active, subscribed URL for this brand.

    The function is designed to be called as a fire-and-forget asyncio task;
    it never raises — all errors are logged and swallowed so callers are not
    blocked.

    Args:
        brand_id: The brand whose webhook subscriptions should be queried.
        event:    The event name (e.g. "hallucination.detected").
        payload:  Arbitrary dict that becomes the ``data`` field in the body.
    """
    try:
        sb = get_supabase()
        result = (
            sb.table("webhooks")
            .select("*")
            .eq("brand_id", brand_id)
            .eq("active", True)
            .execute()
        )
        webhooks = result.data or []
    except Exception:
        logger.exception(
            "webhook_dispatcher: failed to query webhooks for brand_id=%s", brand_id
        )
        return

    for webhook in webhooks:
        if event not in webhook.get("events", []):
            continue
        # Each webhook gets its own task so one slow/failing target cannot
        # block delivery to the others.
        asyncio.create_task(_deliver(webhook, event, payload))


async def _deliver(
    webhook: dict,
    event: str,
    payload: dict,
    max_retries: int = 3,
) -> bool:
    """
    Deliver a webhook to a single target URL with retry/backoff logic.

    Args:
        webhook:     Full webhook row from the database.
        event:       Event name being dispatched.
        payload:     The event-specific data dict.
        max_retries: Maximum delivery attempts (default 3).

    Returns:
        True if delivered successfully, False after all retries are exhausted.
    """
    timestamp = datetime.now(timezone.utc).isoformat()

    body = {
        "event": event,
        "timestamp": timestamp,
        "data": payload,
    }

    # Serialize once; both the HMAC computation and the HTTP body use the
    # same canonical representation so the receiver's verification passes.
    body_json = json.dumps(body, sort_keys=True, separators=(",", ":"))

    headers = {
        "Content-Type": "application/json",
        "X-T3-Event": event,
        "X-T3-Timestamp": timestamp,
    }

    secret = webhook.get("secret")
    if secret:
        signature = hmac.new(
            secret.encode(),
            body_json.encode(),
            hashlib.sha256,
        ).hexdigest()
        headers["X-T3-Signature"] = f"sha256={signature}"

    # Backoff delays in seconds: attempt 0 → 1 s, attempt 1 → 4 s, attempt 2 → 16 s
    BACKOFF = [1, 4, 16]

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    webhook["url"],
                    content=body_json,
                    headers=headers,
                )

            if resp.status_code < 300:
                _stamp_last_triggered(webhook["id"], timestamp)
                logger.info(
                    "webhook_dispatcher: delivered event=%s webhook_id=%s status=%s attempt=%s",
                    event,
                    webhook["id"],
                    resp.status_code,
                    attempt + 1,
                )
                return True

            if 400 <= resp.status_code < 500:
                # Client-side error — retrying will not help.
                logger.warning(
                    "webhook_dispatcher: client error, aborting "
                    "event=%s webhook_id=%s status=%s",
                    event,
                    webhook["id"],
                    resp.status_code,
                )
                return False

            # 5xx — server-side error, eligible for retry.
            logger.warning(
                "webhook_dispatcher: server error, will retry "
                "event=%s webhook_id=%s status=%s attempt=%s",
                event,
                webhook["id"],
                resp.status_code,
                attempt + 1,
            )

        except httpx.TimeoutException:
            logger.warning(
                "webhook_dispatcher: timeout event=%s webhook_id=%s attempt=%s",
                event,
                webhook["id"],
                attempt + 1,
            )
        except Exception:
            logger.exception(
                "webhook_dispatcher: unexpected error event=%s webhook_id=%s attempt=%s",
                event,
                webhook["id"],
                attempt + 1,
            )

        if attempt < max_retries - 1:
            await asyncio.sleep(BACKOFF[attempt])

    logger.error(
        "webhook_dispatcher: all retries exhausted event=%s webhook_id=%s",
        event,
        webhook["id"],
    )
    return False


def _stamp_last_triggered(webhook_id: int, timestamp: str) -> None:
    """
    Update last_triggered_at on the webhook row after a successful delivery.

    Runs synchronously and swallows errors — this is a best-effort stat update
    and must never surface to the caller.
    """
    try:
        sb = get_supabase()
        sb.table("webhooks").update(
            {"last_triggered_at": timestamp}
        ).eq("id", webhook_id).execute()
    except Exception:
        logger.warning(
            "webhook_dispatcher: failed to stamp last_triggered_at for webhook_id=%s",
            webhook_id,
        )
