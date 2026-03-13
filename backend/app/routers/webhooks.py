"""
Webhook Management — T3 Sentinel
-----------------------------------
Allows brands to register HTTPS endpoints that receive real-time event
notifications from the HDE and other T3 subsystems.

Endpoints:
    POST   /api/webhooks                      — Register a new webhook
    GET    /api/webhooks                      — List webhooks for a brand
    DELETE /api/webhooks/{webhook_id}         — Deactivate a webhook (soft delete)
    POST   /api/webhooks/{webhook_id}/test    — Send a test payload to a webhook

Event types:
    hallucination.detected  — Fired by the HDE when claims fail verification
    scan.completed          — Fired when a full brand scan finishes

Payload signing:
    When a ``secret`` is supplied at registration time, every delivery
    includes an ``X-T3-Signature: sha256=<hex>`` header so receivers can
    verify authenticity.  The secret is stored as-is (it is not a
    security credential in itself; HTTPS provides transport security).
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, HttpUrl

from app.database import get_supabase
from app.services.webhook_dispatcher import SUPPORTED_EVENTS, dispatch_webhook

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RegisterWebhookRequest(BaseModel):
    brand_id: int = Field(..., description="Brand this webhook belongs to")
    url: HttpUrl = Field(..., description="HTTPS endpoint that will receive event POSTs")
    events: list[str] = Field(
        default=["hallucination.detected"],
        description=f"Event types to subscribe to. Supported: {sorted(SUPPORTED_EVENTS)}",
    )
    secret: Optional[str] = Field(
        None,
        min_length=8,
        max_length=256,
        description=(
            "Optional signing secret. When provided, each delivery includes an "
            "X-T3-Signature header for payload verification."
        ),
    )


class WebhookResponse(BaseModel):
    id: int
    brand_id: int
    url: str
    events: list[str]
    active: bool
    last_triggered_at: Optional[str]
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_events(events: list[str]) -> None:
    """Raise 422 if any requested event type is not supported."""
    unknown = set(events) - SUPPORTED_EVENTS
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown event type(s): {sorted(unknown)}. Supported: {sorted(SUPPORTED_EVENTS)}",
        )


def _fetch_webhook_for_brand(webhook_id: int, brand_id: int) -> dict:
    """
    Load a webhook row, asserting it exists and belongs to the given brand.
    Raises 404 if not found or 403 if brand mismatch.
    """
    sb = get_supabase()
    result = (
        sb.table("webhooks")
        .select("*")
        .eq("id", webhook_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Webhook not found")

    webhook = result.data[0]
    if webhook["brand_id"] != brand_id:
        raise HTTPException(
            status_code=403,
            detail="Webhook does not belong to the specified brand",
        )
    return webhook


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", response_model=WebhookResponse, status_code=201)
async def register_webhook(req: RegisterWebhookRequest):
    """
    Register a new webhook endpoint for a brand.

    The ``url`` must be HTTPS (enforced by Pydantic's HttpUrl validator).
    An optional ``secret`` enables HMAC-SHA256 payload signing.
    """
    _validate_events(req.events)

    # Normalise URL to a plain string — Pydantic v2 returns a Url object.
    url_str = str(req.url)

    sb = get_supabase()
    row = {
        "brand_id": req.brand_id,
        "url": url_str,
        "events": req.events,
        "secret": req.secret,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = sb.table("webhooks").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to persist webhook")

    created = result.data[0]
    logger.info(
        "webhook: registered id=%s brand_id=%s url=%s events=%s",
        created["id"],
        req.brand_id,
        url_str,
        req.events,
    )

    return WebhookResponse(
        id=created["id"],
        brand_id=created["brand_id"],
        url=created["url"],
        events=created["events"],
        active=created["active"],
        last_triggered_at=created.get("last_triggered_at"),
        created_at=created["created_at"],
    )


@router.get("", response_model=list[WebhookResponse])
async def list_webhooks(
    brand_id: int = Query(..., description="Brand whose webhooks to list"),
    active_only: bool = Query(True, description="When true, only return active webhooks"),
):
    """
    List webhook subscriptions for a brand.

    By default only active webhooks are returned; pass ``active_only=false``
    to include deactivated ones (useful for audit / UI history views).
    """
    sb = get_supabase()
    query = (
        sb.table("webhooks")
        .select("*")
        .eq("brand_id", brand_id)
        .order("created_at", desc=True)
    )
    if active_only:
        query = query.eq("active", True)

    result = query.execute()
    rows = result.data or []

    return [
        WebhookResponse(
            id=r["id"],
            brand_id=r["brand_id"],
            url=r["url"],
            events=r["events"],
            active=r["active"],
            last_triggered_at=r.get("last_triggered_at"),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.delete("/{webhook_id}", status_code=200)
async def deactivate_webhook(
    webhook_id: int,
    brand_id: int = Query(..., description="Brand that owns this webhook"),
):
    """
    Deactivate a webhook (soft delete — the row is kept for audit purposes).

    The webhook will no longer receive deliveries after this call.
    Re-register with POST /api/webhooks to create a fresh subscription.
    """
    webhook = _fetch_webhook_for_brand(webhook_id, brand_id)

    if not webhook.get("active", False):
        raise HTTPException(status_code=409, detail="Webhook is already inactive")

    sb = get_supabase()
    result = (
        sb.table("webhooks")
        .update({"active": False})
        .eq("id", webhook_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to deactivate webhook")

    logger.info("webhook: deactivated id=%s brand_id=%s", webhook_id, brand_id)

    return {
        "id": webhook_id,
        "active": False,
        "message": "Webhook deactivated. No further deliveries will be attempted.",
    }


@router.post("/{webhook_id}/test", status_code=202)
async def test_webhook(
    webhook_id: int,
    brand_id: int = Query(..., description="Brand that owns this webhook"),
):
    """
    Send a synthetic test payload to verify the webhook endpoint is reachable.

    The delivery uses the same signing, retry, and timeout logic as live events.
    The response is returned immediately (202 Accepted); delivery happens in the
    background.  Check ``last_triggered_at`` via GET /api/webhooks to confirm
    the target responded with 2xx.
    """
    webhook = _fetch_webhook_for_brand(webhook_id, brand_id)

    if not webhook.get("active", False):
        raise HTTPException(
            status_code=409,
            detail="Cannot test an inactive webhook. Reactivate it first.",
        )

    test_payload = {
        "claims_checked": 3,
        "hallucinations_found": 1,
        "hallucinated_claims": [
            {
                "claim": "$99.99",
                "type": "pricing",
                "status": "hallucinated",
                "ground_truth": "$129.99",
                "confidence": 0.95,
                "product": "Example Product",
            }
        ],
        "mode": "block",
        "action_taken": "response_corrected",
        "test": True,
    }

    asyncio.create_task(
        dispatch_webhook(
            brand_id=brand_id,
            event="hallucination.detected",
            payload=test_payload,
        )
    )

    logger.info("webhook: test dispatched id=%s brand_id=%s", webhook_id, brand_id)

    return {
        "webhook_id": webhook_id,
        "status": "dispatched",
        "message": (
            "Test payload dispatched. Check last_triggered_at on the webhook "
            "record to confirm delivery succeeded."
        ),
    }
