# T3 Sentinel — Integration Architecture Specification

**Version:** 1.0.0
**Date:** 2026-03-13
**Status:** Design Specification

---

## Overview

T3 Sentinel's Hallucination Detection Engine (HDE) is an embeddable API that companies plug into their own AI-powered products — chatbots, copilots, RAG pipelines, customer service agents — to intercept AI-generated responses before they reach end users and verify all factual claims against the company's registered ground truth product data.

The integration surface consists of five layers:

1. API Key Management — provisioning and scoping access per company
2. Auth Middleware — validating every inbound HDE request
3. Webhook System — pushing hallucination events to client infrastructure
4. Python SDK (`t3-sentinel`) — native integration for Python AI stacks
5. JavaScript SDK (`@t3sentinel/sdk`) — native integration for Node.js and frontend AI stacks

---

## End-to-End Integration Flow

```
Company AI Product                T3 Sentinel API                 Company Infrastructure
─────────────────────             ────────────────────            ──────────────────────

User sends message
       │
       ▼
AI generates response
       │
       ▼
┌──────────────────┐   X-API-Key   ┌────────────────────┐
│  SDK / HTTP call │──────────────▶│  Auth Middleware    │
│  POST /api/hde/  │               │  - Validate key     │
│  check           │               │  - Extract brand_id │
└──────────────────┘               │  - Check rate limit │
                                   └────────────┬───────┘
                                                │ authenticated
                                                ▼
                                   ┌────────────────────┐
                                   │  HDE Check Engine  │
                                   │  - Extract claims  │
                                   │  - Load products   │
                                   │  - Verify claims   │
                                   │  - Apply mode      │
                                   └────────────┬───────┘
                                                │
                              ┌─────────────────┼──────────────────┐
                              │                 │                  │
                        mode=block         mode=flag          mode=log
                              │                 │                  │
                    Return corrected    Return original     Return original
                    text               + claims array      text (silent)
                              │
                    ┌─────────┴──────────┐
                    │ Hallucination       │
                    │ found?              │
                    │  YES               │
                    └─────────┬──────────┘
                              │ async, non-blocking
                              ▼
                   ┌──────────────────────┐
                   │  Webhook Dispatcher  │
                   │  - Find active hooks │
                   │  - Sign payload      │
                   │  - POST to URL       │──────────▶  Company webhook
                   │  - Retry on failure  │             endpoint receives
                   └──────────────────────┘             hallucination event
```

---

## Part 1 — API Key Management System

### 1.1 Key Format and Scoping

Every company receives API keys scoped to their `brand_id`. Keys are never stored in plaintext; only a SHA-256 hash is persisted. The full key is shown exactly once at creation time.

**Key format:**

```
t3_live_<24 random alphanumeric characters>
t3_test_<24 random alphanumeric characters>
```

Examples:
- `t3_live_7fK9mNpQrXw2sL4vHy8tUj3a`
- `t3_test_3bR8nMkWqZp1xC6dAe9vFh7m`

The prefix (`t3_live_` or `t3_test_`) is stored separately in the `prefix` column so keys can be identified in logs without exposing the secret portion. Test keys point to a sandboxed check that always returns synthetic data without consuming Supabase reads.

### 1.2 Supabase Table: `api_keys`

```sql
CREATE TABLE api_keys (
  id            BIGSERIAL PRIMARY KEY,
  brand_id      BIGINT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id       UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash      TEXT   NOT NULL UNIQUE,          -- SHA-256 of full key
  prefix        TEXT   NOT NULL,                 -- "t3_live_" or "t3_test_"
  name          TEXT   NOT NULL,                 -- Human label, e.g. "Production Key"
  environment   TEXT   NOT NULL DEFAULT 'live'   -- "live" | "test"
    CHECK (environment IN ('live', 'test')),
  rate_limit    INTEGER NOT NULL DEFAULT 1000,   -- Requests per minute
  usage_count   BIGINT  NOT NULL DEFAULT 0,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ                      -- NULL means active
);

CREATE INDEX idx_api_keys_key_hash  ON api_keys(key_hash);
CREATE INDEX idx_api_keys_brand_id  ON api_keys(brand_id);
CREATE INDEX idx_api_keys_user_id   ON api_keys(user_id);
```

**Row-level security:** Users may only read and revoke their own keys. Brand admins may read all keys scoped to their brand.

### 1.3 API Endpoints

#### POST /api/keys — Create a new API key

**Authentication:** Supabase session JWT (dashboard user, not API key)

**Request body:**

```json
{
  "name": "Production Chatbot",
  "environment": "live",
  "rate_limit": 500
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Human-readable label for this key |
| `environment` | `"live"` \| `"test"` | no | Defaults to `"live"` |
| `rate_limit` | integer | no | Requests per minute. Defaults to plan limit |

**Response 201:**

```json
{
  "id": 42,
  "name": "Production Chatbot",
  "environment": "live",
  "prefix": "t3_live_",
  "key": "t3_live_7fK9mNpQrXw2sL4vHy8tUj3a",
  "rate_limit": 500,
  "brand_id": 7,
  "created_at": "2026-03-13T10:00:00Z",
  "warning": "Store this key securely. It will not be shown again."
}
```

The `key` field is returned only in this response. All subsequent requests return the `prefix` only.

**Response 400 — Validation failure:**

```json
{
  "error": "validation_error",
  "message": "name is required and must be between 1 and 100 characters",
  "field": "name"
}
```

**Response 403 — Plan limit reached:**

```json
{
  "error": "key_limit_reached",
  "message": "Your plan allows a maximum of 5 API keys. Revoke an existing key or upgrade your plan.",
  "limit": 5,
  "current": 5
}
```

---

#### GET /api/keys — List all API keys for the authenticated user's brand

**Authentication:** Supabase session JWT

**Response 200:**

```json
{
  "keys": [
    {
      "id": 42,
      "name": "Production Chatbot",
      "environment": "live",
      "prefix": "t3_live_",
      "rate_limit": 500,
      "usage_count": 18432,
      "last_used_at": "2026-03-13T09:58:11Z",
      "created_at": "2026-03-01T10:00:00Z",
      "revoked_at": null,
      "active": true
    },
    {
      "id": 38,
      "name": "Staging Test Key",
      "environment": "test",
      "prefix": "t3_test_",
      "rate_limit": 1000,
      "usage_count": 203,
      "last_used_at": "2026-03-12T15:22:07Z",
      "created_at": "2026-02-15T08:30:00Z",
      "revoked_at": null,
      "active": true
    }
  ],
  "total": 2
}
```

The full key secret is never returned after creation. Only `prefix` is returned to identify which environment the key belongs to.

---

#### DELETE /api/keys/{id} — Revoke an API key

**Authentication:** Supabase session JWT

**Path parameter:** `id` — integer, the key's database ID

**Response 200:**

```json
{
  "id": 42,
  "revoked_at": "2026-03-13T10:05:00Z",
  "message": "Key revoked. Requests using this key will be rejected immediately."
}
```

**Response 404:**

```json
{
  "error": "key_not_found",
  "message": "No active key with id 42 found for your account."
}
```

Revocation is soft-delete via `revoked_at` timestamp. Keys are never deleted from the database, preserving audit history. Rate limit and usage counters remain queryable on revoked keys for billing reconciliation.

---

### 1.4 Key Generation Implementation Notes

```
Key generation algorithm:
1. Generate 18 cryptographically random bytes via secrets.token_bytes(18)
2. Base62-encode to produce 24-character suffix
3. Prepend "t3_live_" or "t3_test_" based on environment
4. Compute SHA-256 hash of the full key string
5. Store hash + prefix in api_keys table
6. Return full key to caller exactly once
7. Increment a usage_count column via database-level atomic UPDATE
   (UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW()
    WHERE key_hash = $1)
```

---

## Part 2 — Auth Middleware for HDE

### 2.1 FastAPI Dependency: `require_api_key`

This dependency replaces the current unauthenticated HDE endpoint. It validates the `X-API-Key` header, resolves the `brand_id`, enforces per-key rate limits, and injects a typed context object into the route handler. Because `brand_id` is extracted from the key, API consumers no longer need to pass it in the request body.

### 2.2 Updated `HDECheckRequest` Schema

**Before (current):**
```json
{
  "text": "...",
  "brand_id": 4,
  "mode": "block"
}
```

**After (with auth middleware):**
```json
{
  "text": "...",
  "mode": "block"
}
```

`brand_id` is removed from the request body. It is extracted from the resolved API key. This is a breaking change from the current schema, mitigated by the versioning strategy in Part 6.

### 2.3 Middleware Implementation Spec

```python
# app/dependencies/api_key_auth.py

"""
FastAPI dependency that authenticates HDE requests via X-API-Key header.

Usage in route:
    @router.post("/check")
    async def hde_check(req: HDECheckRequest, ctx: APIKeyContext = Depends(require_api_key)):
        # ctx.brand_id is resolved from the key — no need for brand_id in request body
        # ctx.key_id is available for per-key usage logging
        # ctx.environment is "live" or "test"
        ...
"""

import hashlib
from dataclasses import dataclass
from fastapi import Depends, HTTPException, Header
from app.database import get_supabase

# Rate limit window in seconds
RATE_LIMIT_WINDOW = 60

@dataclass
class APIKeyContext:
    key_id: int
    brand_id: int
    environment: str    # "live" | "test"
    rate_limit: int     # requests per minute for this key
    key_name: str       # human label, useful for logging


async def require_api_key(x_api_key: str = Header(...)) -> APIKeyContext:
    """
    Validates X-API-Key header and returns resolved API key context.

    Raises HTTP 401 if the key is missing, malformed, not found, or revoked.
    Raises HTTP 429 if the per-key rate limit is exceeded.
    """
    if not x_api_key or not x_api_key.startswith(("t3_live_", "t3_test_")):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "invalid_api_key",
                "message": "X-API-Key header must be a valid T3 Sentinel key (t3_live_... or t3_test_...)"
            }
        )

    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()

    sb = get_supabase()
    result = (
        sb.table("api_keys")
        .select("id, brand_id, environment, rate_limit, name, revoked_at")
        .eq("key_hash", key_hash)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "api_key_not_found",
                "message": "The provided API key does not exist."
            }
        )

    key_row = result.data

    if key_row["revoked_at"] is not None:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "api_key_revoked",
                "message": "This API key has been revoked. Create a new key in the T3 dashboard.",
                "revoked_at": key_row["revoked_at"]
            }
        )

    # Rate limiting: enforce per-key limit using a sliding window counter.
    # In production, replace with a Redis-backed counter for distributed accuracy.
    # The current in-process approach is correct for single-instance deployments.
    _check_rate_limit(key_row["id"], key_row["rate_limit"])

    # Increment usage counter asynchronously (fire-and-forget, non-blocking)
    sb.table("api_keys").update({
        "usage_count": sb.rpc("increment_key_usage", {"key_id": key_row["id"]}),
        "last_used_at": "NOW()"
    }).eq("id", key_row["id"]).execute()

    return APIKeyContext(
        key_id=key_row["id"],
        brand_id=key_row["brand_id"],
        environment=key_row["environment"],
        rate_limit=key_row["rate_limit"],
        key_name=key_row["name"],
    )


def _check_rate_limit(key_id: int, limit: int):
    """
    Sliding window rate limiter per API key.
    In a single-instance deployment this is sufficient.
    For distributed deployments, replace with Redis INCR + EXPIRE.
    """
    import time
    from collections import deque

    # Module-level store: key_id -> deque of request timestamps
    if not hasattr(_check_rate_limit, "_windows"):
        _check_rate_limit._windows = {}

    now = time.time()
    window = _check_rate_limit._windows.setdefault(key_id, deque())

    # Remove timestamps older than 60 seconds
    while window and window[0] < now - RATE_LIMIT_WINDOW:
        window.popleft()

    if len(window) >= limit:
        raise HTTPException(
            status_code=429,
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(now + RATE_LIMIT_WINDOW)),
            },
            detail={
                "error": "rate_limit_exceeded",
                "message": f"This API key is limited to {limit} requests per minute.",
                "retry_after_seconds": 60,
            }
        )

    window.append(now)
```

### 2.4 Updated HDE Route Signature

```python
# app/routers/hde.py  (updated signature)

class HDECheckRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    mode: str = Field(default="block", pattern="^(block|flag|log)$")
    # brand_id is intentionally removed — resolved from API key


@router.post("/check")
async def hde_check(
    req: HDECheckRequest,
    ctx: APIKeyContext = Depends(require_api_key),
):
    """
    Main HDE endpoint. brand_id is resolved from the authenticated API key.
    Companies do not pass brand_id in the request body.
    """
    sb = get_supabase()
    products = sb.table("products").select("*").eq("brand_id", ctx.brand_id).execute()
    # ... rest of existing logic unchanged
```

### 2.5 Response Headers on Every HDE Response

All HDE responses include rate limit state headers so SDK clients can implement intelligent backoff:

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 463
X-RateLimit-Reset: 1741863660
X-Request-Id: 3f8a2b1c-9d4e-4f7a-b2c1-8e3d5f6a9b2c
```

---

## Part 3 — Webhook System

### 3.1 Overview

When a hallucination is detected (any claim with status `"hallucinated"` or `"outdated"`), Sentinel dispatches a signed HTTP POST to all active webhook URLs registered by the brand. Delivery is asynchronous and non-blocking — the HDE check response is returned to the caller immediately; webhook dispatch happens in a background task.

### 3.2 Supabase Table: `webhooks`

```sql
CREATE TABLE webhooks (
  id           BIGSERIAL PRIMARY KEY,
  brand_id     BIGINT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  url          TEXT   NOT NULL,
  secret       TEXT   NOT NULL,      -- HMAC-SHA256 signing secret (stored encrypted)
  name         TEXT   NOT NULL,      -- e.g. "Slack Alert Handler"
  events       TEXT[] NOT NULL DEFAULT ARRAY['hallucination.detected'],
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fired_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0  -- consecutive delivery failures
);

CREATE INDEX idx_webhooks_brand_id ON webhooks(brand_id);
CREATE INDEX idx_webhooks_active   ON webhooks(brand_id, active);
```

**Supported event types:**

| Event | Trigger |
|---|---|
| `hallucination.detected` | One or more hallucinated claims found in a check |
| `check.completed` | Every completed HDE check (use sparingly — high volume) |
| `key.rate_limit_warning` | Key usage exceeds 80% of its rate limit in a minute |

### 3.3 Webhook Registration Endpoints

#### POST /api/webhooks — Register a webhook

**Authentication:** Supabase session JWT

**Request body:**

```json
{
  "url": "https://your-company.com/hooks/sentinel",
  "name": "Production Alert Handler",
  "events": ["hallucination.detected"],
  "secret": "your_signing_secret_min_32_chars"
}
```

**Response 201:**

```json
{
  "id": 9,
  "name": "Production Alert Handler",
  "url": "https://your-company.com/hooks/sentinel",
  "events": ["hallucination.detected"],
  "active": true,
  "brand_id": 7,
  "created_at": "2026-03-13T10:00:00Z"
}
```

#### GET /api/webhooks — List webhooks for brand

**Response 200:**

```json
{
  "webhooks": [
    {
      "id": 9,
      "name": "Production Alert Handler",
      "url": "https://your-company.com/hooks/sentinel",
      "events": ["hallucination.detected"],
      "active": true,
      "last_fired_at": "2026-03-13T09:58:00Z",
      "failure_count": 0
    }
  ]
}
```

#### DELETE /api/webhooks/{id} — Delete a webhook

**Response 200:**

```json
{ "id": 9, "deleted": true }
```

#### POST /api/webhooks/{id}/test — Send a test event

Sends a synthetic `hallucination.detected` payload to verify the URL is reachable and the signature validation is working on the receiving end.

**Response 200:**

```json
{
  "delivered": true,
  "status_code": 200,
  "duration_ms": 142
}
```

---

### 3.4 Webhook Payload Schema

Every POST to a registered webhook URL contains the following JSON body:

```json
{
  "event": "hallucination.detected",
  "id": "evt_01HX9K2M3N4P5Q6R7S8T9U0V",
  "timestamp": "2026-03-13T10:01:30Z",
  "brand_id": 7,
  "check": {
    "mode": "block",
    "original_text": "Our ProMax Drill costs $89 and works with all Ryobi tools.",
    "corrected_text": "Our ProMax Drill costs $129 and works with RYOBI ONE+ tools (not 40V).",
    "claims_checked": 3,
    "hallucinations_found": 2,
    "action_taken": "response_corrected"
  },
  "hallucinations": [
    {
      "claim": "$89",
      "type": "pricing",
      "status": "hallucinated",
      "ground_truth": "$129.00",
      "confidence": 0.95,
      "product": "ProMax Drill"
    },
    {
      "claim": "works with all Ryobi tools",
      "type": "feature",
      "status": "hallucinated",
      "ground_truth": "Compatible with ONE+ line only, NOT 40V tools",
      "confidence": 0.93,
      "product": "ProMax Drill"
    }
  ]
}
```

### 3.5 Payload Signing

Each webhook delivery includes an `X-T3-Signature` header for payload verification:

```
X-T3-Signature: sha256=3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e
X-T3-Delivery-Id: evt_01HX9K2M3N4P5Q6R7S8T9U0V
X-T3-Event: hallucination.detected
```

**Signature computation:**

```
signature = HMAC-SHA256(secret, payload_body_bytes)
header_value = "sha256=" + hex(signature)
```

**Receiver verification (Python):**

```python
import hmac, hashlib

def verify_webhook(payload_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

**Receiver verification (JavaScript):**

```javascript
import crypto from "crypto";

function verifyWebhook(payloadBody, signatureHeader, secret) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(payloadBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}
```

### 3.6 Delivery and Retry Logic

```
Delivery attempt 1 — immediate, timeout 10s
  Success (2xx)  ──── record last_fired_at, reset failure_count
  Failure        ──── wait 30s

Delivery attempt 2 — after 30s, timeout 10s
  Success (2xx)  ──── record delivery, reset failure_count
  Failure        ──── wait 300s (5 minutes)

Delivery attempt 3 — after 5 minutes, timeout 10s
  Success (2xx)  ──── record delivery, reset failure_count
  Failure        ──── mark delivery as failed, increment failure_count
                       if failure_count >= 10: set active = FALSE
                       send dashboard notification to brand owner
```

**FastAPI background task integration:**

```python
# In hde.py, after computing hallucinations:

from fastapi import BackgroundTasks
from app.services.webhook_dispatcher import dispatch_hallucination_event

@router.post("/check")
async def hde_check(
    req: HDECheckRequest,
    background_tasks: BackgroundTasks,
    ctx: APIKeyContext = Depends(require_api_key),
):
    # ... existing check logic ...

    if hallucinations and req.mode != "log":
        background_tasks.add_task(
            dispatch_hallucination_event,
            brand_id=ctx.brand_id,
            check_result=result,
            hallucinations=hallucinations,
        )

    return result
```

```python
# app/services/webhook_dispatcher.py

import asyncio
import hashlib
import hmac
import json
import time
import httpx
from datetime import datetime, timezone
from app.database import get_supabase

RETRY_DELAYS = [30, 300]  # seconds between attempts 1->2 and 2->3
MAX_CONSECUTIVE_FAILURES = 10


async def dispatch_hallucination_event(
    brand_id: int,
    check_result: dict,
    hallucinations: list[dict],
):
    """
    Fetch all active webhooks subscribed to hallucination.detected for this brand,
    then fire each one with retry logic.
    """
    sb = get_supabase()
    hooks = (
        sb.table("webhooks")
        .select("*")
        .eq("brand_id", brand_id)
        .eq("active", True)
        .contains("events", ["hallucination.detected"])
        .execute()
    )

    if not hooks.data:
        return

    event_id = _generate_event_id()
    payload = {
        "event": "hallucination.detected",
        "id": event_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "brand_id": brand_id,
        "check": {
            "mode": check_result["mode"],
            "original_text": check_result["original_text"],
            "corrected_text": check_result.get("corrected_text"),
            "claims_checked": check_result["claims_checked"],
            "hallucinations_found": check_result["hallucinations_found"],
            "action_taken": check_result["action_taken"],
        },
        "hallucinations": hallucinations,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode()

    await asyncio.gather(
        *[_deliver_with_retry(hook, payload_bytes, event_id) for hook in hooks.data]
    )


async def _deliver_with_retry(hook: dict, payload_bytes: bytes, event_id: str):
    signature = _sign_payload(payload_bytes, hook["secret"])
    headers = {
        "Content-Type": "application/json",
        "X-T3-Signature": signature,
        "X-T3-Delivery-Id": event_id,
        "X-T3-Event": "hallucination.detected",
        "User-Agent": "T3Sentinel-Webhook/1.0",
    }

    sb = get_supabase()
    attempts = [0] + RETRY_DELAYS

    for i, delay in enumerate(attempts):
        if delay > 0:
            await asyncio.sleep(delay)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(hook["url"], content=payload_bytes, headers=headers)
                if resp.status_code < 300:
                    sb.table("webhooks").update({
                        "last_fired_at": datetime.now(timezone.utc).isoformat(),
                        "failure_count": 0,
                    }).eq("id", hook["id"]).execute()
                    return
        except Exception:
            pass

        if i == len(attempts) - 1:
            # All attempts exhausted
            new_failure_count = hook["failure_count"] + 1
            update = {"failure_count": new_failure_count}
            if new_failure_count >= MAX_CONSECUTIVE_FAILURES:
                update["active"] = False
            sb.table("webhooks").update(update).eq("id", hook["id"]).execute()


def _sign_payload(payload_bytes: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def _generate_event_id() -> str:
    import secrets
    return "evt_" + secrets.token_urlsafe(16)
```

---

## Part 4 — Python SDK: `t3-sentinel`

### 4.1 Package Overview

```
pip install t3-sentinel
```

The SDK is a thin, zero-dependency-by-default HTTP client that wraps the HDE API. Optional extras pull in integration shims:

```
pip install t3-sentinel[openai]      # includes OpenAI wrapper
pip install t3-sentinel[anthropic]   # includes Anthropic wrapper
pip install t3-sentinel[langchain]   # includes LangChain callback
pip install t3-sentinel[all]         # everything
```

### 4.2 Client Initialization

```python
from t3_sentinel import T3Sentinel

# Synchronous client
client = T3Sentinel(api_key="t3_live_7fK9mNpQrXw2sL4vHy8tUj3a")

# With custom configuration
client = T3Sentinel(
    api_key="t3_live_7fK9mNpQrXw2sL4vHy8tUj3a",
    base_url="https://api.t3platform.com",   # default
    timeout=5.0,                              # seconds, default 5.0
    mode="block",                             # default mode for all checks
    raise_on_hallucination=False,             # if True, raises HallucinationError
)

# Async client — same interface, all methods are coroutines
from t3_sentinel import AsyncT3Sentinel

async_client = AsyncT3Sentinel(api_key="t3_live_...")
```

Constructor validates the key format immediately and raises `T3ConfigError` if the key does not match `t3_live_*` or `t3_test_*`.

### 4.3 `client.check()` — Core Method

```python
result = client.check(
    text="Our ProMax Drill costs $89 and covers 400 sq ft.",
    mode="block",          # "block" | "flag" | "log" — overrides client default
)

# Async variant
result = await async_client.check(text="...", mode="block")
```

**Return type: `CheckResult`**

```python
@dataclass
class CheckResult:
    safe: bool
    original_text: str
    corrected_text: str | None
    claims_checked: int
    hallucinations_found: int
    claims: list[ClaimDetail]
    mode: str
    action_taken: str

    # Convenience properties
    @property
    def text(self) -> str:
        """Returns corrected_text if available (block mode), else original_text."""
        return self.corrected_text or self.original_text

    @property
    def hallucinations(self) -> list[ClaimDetail]:
        return [c for c in self.claims if c.status in ("hallucinated", "outdated")]


@dataclass
class ClaimDetail:
    claim: str
    type: str           # "pricing" | "feature" | "availability" | "policy"
    status: str         # "accurate" | "hallucinated" | "outdated" | "unverified"
    ground_truth: str | None
    confidence: float
    product: str | None
```

**Usage patterns:**

```python
# Pattern 1: Replace AI output directly (block mode)
ai_response = llm.generate(prompt)
result = client.check(ai_response, mode="block")
show_to_user(result.text)   # .text handles the corrected vs original logic

# Pattern 2: Flag and inspect before deciding
result = client.check(ai_response, mode="flag")
if not result.safe:
    for h in result.hallucinations:
        print(f"CLAIM: {h.claim} | TRUTH: {h.ground_truth} | TYPE: {h.type}")

# Pattern 3: Log only — zero latency impact on response path (fire-and-forget async)
result = client.check(ai_response, mode="log")
show_to_user(ai_response)

# Pattern 4: Raise on hallucination
client_strict = T3Sentinel(api_key="...", raise_on_hallucination=True)
try:
    result = client_strict.check(ai_response, mode="block")
    show_to_user(result.text)
except HallucinationError as e:
    show_fallback_response()
    log_error(e.hallucinations)
```

**Exceptions:**

| Exception | When raised |
|---|---|
| `T3ConfigError` | Invalid API key format or missing key |
| `T3AuthError` | API returned 401 — key not found or revoked |
| `T3RateLimitError` | API returned 429 — includes `retry_after` attribute |
| `T3TimeoutError` | Request exceeded `timeout` seconds |
| `HallucinationError` | Hallucinations found and `raise_on_hallucination=True` |
| `T3APIError` | Any other non-2xx response |

### 4.4 `client.wrap_openai()` — OpenAI Monkey-Patch

Intercepts all `chat.completions.create()` calls and runs the response content through HDE before returning it to the caller. The caller's code is unchanged.

```python
import openai
from t3_sentinel import T3Sentinel

sentinel = T3Sentinel(api_key="t3_live_...", mode="block")
openai_client = openai.OpenAI(api_key="sk-...")

# Wrap — modifies openai_client in place, returns it for chaining
openai_client = sentinel.wrap_openai(openai_client)

# All subsequent calls are automatically checked
response = openai_client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me about the ProMax Drill price."}],
)
# response.choices[0].message.content is already corrected if hallucinations were found
# response.sentinel_result is injected — a CheckResult object
print(response.sentinel_result.hallucinations_found)
```

**Async variant:**

```python
from openai import AsyncOpenAI
async_openai = AsyncOpenAI(api_key="sk-...")
async_openai = await async_sentinel.wrap_openai(async_openai)

response = await async_openai.chat.completions.create(...)
```

**Implementation contract:**

The wrapper:
1. Replaces `client.chat.completions.create` with a closure
2. Calls original `create()`, extracts `choices[0].message.content`
3. Calls `sentinel.check(content, mode=self.mode)`
4. Mutates `choices[0].message.content` to `result.text`
5. Injects `result` as `response.sentinel_result`
6. Returns the mutated response object

Streaming responses (`stream=True`) are not intercepted in v1.0. Attempting to use `stream=True` on a wrapped client raises `T3StreamingNotSupportedError` with guidance to use `mode="log"` for streaming use cases.

### 4.5 `client.wrap_anthropic()` — Anthropic Monkey-Patch

Identical pattern, targeting `messages.create()`:

```python
import anthropic
from t3_sentinel import T3Sentinel

sentinel = T3Sentinel(api_key="t3_live_...", mode="flag")
claude = anthropic.Anthropic(api_key="sk-ant-...")
claude = sentinel.wrap_anthropic(claude)

response = claude.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "What does the ProMax Drill cost?"}],
)
# response.content[0].text is already corrected/flagged
# response.sentinel_result contains the full CheckResult
```

### 4.6 `client.langchain_callback()` — LangChain Integration

Returns a `BaseCallbackHandler` that intercepts `on_llm_end` events, runs the output through HDE, and either mutates the output (block mode) or logs hallucinations.

```python
from langchain_openai import ChatOpenAI
from t3_sentinel import T3Sentinel

sentinel = T3Sentinel(api_key="t3_live_...", mode="block")

llm = ChatOpenAI(
    model="gpt-4o",
    callbacks=[sentinel.langchain_callback()],
)

# Normal LangChain usage — sentinel intercepts automatically
chain = prompt | llm | output_parser
result = chain.invoke({"product": "ProMax Drill"})
```

**Callback handler contract:**

```python
class SentinelCallbackHandler(BaseCallbackHandler):
    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        for generations in response.generations:
            for gen in generations:
                check = self.sentinel.check(gen.text, mode=self.mode)
                gen.text = check.text
                gen.generation_info = gen.generation_info or {}
                gen.generation_info["sentinel_result"] = check
```

### 4.7 Full Async Example

```python
import asyncio
from t3_sentinel import AsyncT3Sentinel
import openai

async def main():
    sentinel = AsyncT3Sentinel(api_key="t3_live_...")
    client = openai.AsyncOpenAI(api_key="sk-...")
    client = await sentinel.wrap_openai(client)

    tasks = [
        client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": q}],
        )
        for q in ["ProMax Drill price?", "ProMax coverage?", "ProMax warranty?"]
    ]
    results = await asyncio.gather(*tasks)

    for r in results:
        sr = r.sentinel_result
        print(f"Safe: {sr.safe} | Hallucinations: {sr.hallucinations_found}")

asyncio.run(main())
```

### 4.8 SDK Module Structure

```
t3_sentinel/
├── __init__.py          # Exports T3Sentinel, AsyncT3Sentinel, exceptions
├── client.py            # T3Sentinel and AsyncT3Sentinel classes
├── models.py            # CheckResult, ClaimDetail dataclasses
├── exceptions.py        # T3AuthError, T3RateLimitError, HallucinationError, etc.
├── _http.py             # Internal httpx-based transport, retry, timeout logic
├── integrations/
│   ├── __init__.py
│   ├── openai.py        # wrap_openai implementation
│   ├── anthropic.py     # wrap_anthropic implementation
│   └── langchain.py     # SentinelCallbackHandler
└── py.typed             # PEP 561 marker — full type annotations
```

---

## Part 5 — JavaScript SDK: `@t3sentinel/sdk`

### 5.1 Package Overview

```
npm install @t3sentinel/sdk
# or
yarn add @t3sentinel/sdk
# or
pnpm add @t3sentinel/sdk
```

The package ships ESM and CJS builds with full TypeScript types. Zero runtime dependencies beyond the Fetch API (Node.js 18+ or any modern browser runtime).

```typescript
import { T3Sentinel } from "@t3sentinel/sdk";
// or CommonJS
const { T3Sentinel } = require("@t3sentinel/sdk");
```

### 5.2 Client Initialization

```typescript
const client = new T3Sentinel({
  apiKey: "t3_live_7fK9mNpQrXw2sL4vHy8tUj3a",
  baseUrl: "https://api.t3platform.com",   // default
  timeout: 5000,                            // ms, default 5000
  mode: "block",                            // default mode for all checks
  onHallucination: (result) => {            // optional global hook
    console.error("Hallucination caught:", result.hallucinations);
  },
});
```

Constructor throws `T3ConfigError` synchronously if the key format is invalid.

### 5.3 TypeScript Interfaces

```typescript
type CheckMode = "block" | "flag" | "log";
type ClaimType = "pricing" | "feature" | "availability" | "policy";
type ClaimStatus = "accurate" | "hallucinated" | "outdated" | "unverified";

interface CheckOptions {
  mode?: CheckMode;
}

interface ClaimDetail {
  claim: string;
  type: ClaimType;
  status: ClaimStatus;
  ground_truth: string | null;
  confidence: number;
  product: string | null;
}

interface CheckResult {
  safe: boolean;
  original_text: string;
  corrected_text: string | null;
  claims_checked: number;
  hallucinations_found: number;
  claims: ClaimDetail[];
  mode: CheckMode;
  action_taken: string;
  /** Convenience: corrected_text ?? original_text */
  readonly text: string;
  /** Convenience: claims filtered to hallucinated | outdated */
  readonly hallucinations: ClaimDetail[];
}

interface T3SentinelConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  mode?: CheckMode;
  onHallucination?: (result: CheckResult) => void;
}
```

### 5.4 `client.check()` — Core Method

```typescript
const result: CheckResult = await client.check(
  "Our ProMax Drill costs $89 and covers 400 sq ft.",
  { mode: "block" }
);

// Use result.text — handles corrected vs original automatically
showToUser(result.text);

if (!result.safe) {
  for (const h of result.hallucinations) {
    console.warn(`Hallucination: "${h.claim}" — truth: "${h.ground_truth}"`);
  }
}
```

**Error types:**

```typescript
class T3ConfigError extends Error {}      // bad key format / missing key
class T3AuthError extends Error {}        // 401 — key revoked or not found
class T3RateLimitError extends Error {    // 429
  retryAfter: number;                     // seconds
}
class T3TimeoutError extends Error {}
class T3APIError extends Error {          // any other non-2xx
  statusCode: number;
  body: unknown;
}
```

### 5.5 `client.middleware()` — Express / Fastify Middleware

Automatically intercepts responses containing AI-generated content before they are sent to the browser. The middleware reads the response body, runs it through HDE if a `x-ai-response: true` header is present on the outgoing response (set by your route handler), and replaces the body with the corrected version.

**Express usage:**

```typescript
import express from "express";
import { T3Sentinel } from "@t3sentinel/sdk";

const app = express();
const sentinel = new T3Sentinel({ apiKey: "t3_live_...", mode: "block" });

// Register middleware before routes that produce AI content
app.use(sentinel.middleware());

app.post("/chat", async (req, res) => {
  const aiResponse = await myLLM.generate(req.body.message);

  // Signal to sentinel middleware that this response needs checking
  res.setHeader("x-ai-response", "true");
  res.json({ reply: aiResponse });
  // sentinel middleware intercepts, checks, and corrects before send
});
```

**Fastify usage:**

```typescript
import Fastify from "fastify";
import { T3Sentinel } from "@t3sentinel/sdk";

const fastify = Fastify();
const sentinel = new T3Sentinel({ apiKey: "t3_live_...", mode: "block" });

// Register as a Fastify plugin
await fastify.register(sentinel.middleware());

fastify.post("/chat", async (request, reply) => {
  const aiResponse = await myLLM.generate(request.body.message);
  reply.header("x-ai-response", "true");
  return { reply: aiResponse };
});
```

**Middleware behavior:**

The middleware intercepts JSON responses where `x-ai-response: true` is set. It extracts string values from the response body (top-level string fields or an array of strings), runs them through HDE, and replaces them in the body before the response is flushed. No response buffering occurs for responses that do not carry the sentinel header.

```
Request arrives
      │
      ▼
Route handler runs
Sets x-ai-response: true header
Calls res.json({ reply: "AI text..." })
      │
      ▼
Sentinel middleware intercepts
Extracts text fields from body
Calls client.check(text)
Mutates body with corrected text
Removes x-ai-response header
      │
      ▼
Response sent to client
```

### 5.6 `client.wrapOpenAI()` — OpenAI Proxy

```typescript
import OpenAI from "openai";
import { T3Sentinel } from "@t3sentinel/sdk";

const openai = new OpenAI({ apiKey: "sk-..." });
const sentinel = new T3Sentinel({ apiKey: "t3_live_...", mode: "block" });

// Returns a Proxy that intercepts chat.completions.create
const checkedOpenAI = sentinel.wrapOpenAI(openai);

const response = await checkedOpenAI.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What does the ProMax Drill cost?" }],
});

// response.choices[0].message.content is already corrected
// response.sentinelResult is injected as a non-enumerable property
const sr = (response as any).sentinelResult as CheckResult;
console.log("Hallucinations found:", sr.hallucinations_found);
```

**Implementation:** Uses `Proxy` to intercept `chat.completions.create`. The proxy calls the original method, awaits it, then pipes `choices[0].message.content` through `client.check()` and mutates the response before resolving the outer promise.

Streaming (`stream: true`) is not supported in v1.0 and throws `T3StreamingNotSupportedError`.

### 5.7 `client.vercelAI()` — Vercel AI SDK Integration

Returns a middleware function compatible with the Vercel AI SDK's `streamText` / `generateText` pipeline, for use with Next.js Route Handlers and edge functions.

```typescript
// app/api/chat/route.ts (Next.js App Router)
import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { T3Sentinel } from "@t3sentinel/sdk";

const sentinel = new T3Sentinel({ apiKey: "t3_live_...", mode: "block" });

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Non-streaming: wrap generateText result
  const { text } = await generateText({
    model: openai("gpt-4o"),
    messages,
  });
  const result = await sentinel.check(text, { mode: "block" });
  return Response.json({ text: result.text });
}
```

**`client.vercelAI()` as a transform:**

```typescript
// Composable transform for use in pipelines
const sentinelTransform = sentinel.vercelAI();

const { text } = await generateText({
  model: openai("gpt-4o"),
  messages,
  experimental_transform: sentinelTransform,  // intercepts output
});
```

The `vercelAI()` transform:
1. Receives each generated text chunk (or full completion for non-streaming)
2. For non-streaming: runs full HDE check, returns corrected text
3. For streaming: buffers the complete streamed text, runs HDE on completion, then re-streams the corrected text — this introduces a latency spike equal to one full generation before any tokens are shown to the user, which is the inherent trade-off of hallucination checking on streamed output

### 5.8 SDK Module Structure

```
@t3sentinel/sdk/
├── src/
│   ├── index.ts              # Main exports
│   ├── client.ts             # T3Sentinel class
│   ├── types.ts              # CheckResult, ClaimDetail, config interfaces
│   ├── errors.ts             # Error classes
│   ├── http.ts               # fetch-based transport with timeout + retry
│   └── integrations/
│       ├── middleware.ts      # Express / Fastify middleware factory
│       ├── openai.ts          # wrapOpenAI Proxy implementation
│       └── vercel-ai.ts       # vercelAI() transform
├── dist/
│   ├── esm/                  # ES modules build
│   └── cjs/                  # CommonJS build
├── package.json
└── tsconfig.json
```

---

## Part 6 — API Versioning and Backward Compatibility

### 6.1 Current State

The existing `/api/hde/check` endpoint accepts `brand_id` in the request body and requires no authentication. The new design removes `brand_id` from the body and requires `X-API-Key`. This is a breaking change.

### 6.2 Versioning Strategy

URI versioning is used for the HDE API. The existing unauthenticated endpoint is preserved at its current path during a 90-day deprecation window.

```
/api/hde/check       — v1 (current, deprecated 2026-06-01, sunset 2026-09-01)
/api/v2/hde/check    — v2 (new, requires X-API-Key, no brand_id in body)
```

Both routes use identical response schemas. The only differences are:
- v2 requires `X-API-Key` header
- v2 does not accept `brand_id` in the request body (extracted from key)
- v2 includes `X-RateLimit-*` response headers

**Deprecation response headers on v1:**

```
Deprecation: true
Sunset: Sat, 01 Sep 2026 00:00:00 GMT
Link: <https://api.t3platform.com/api/v2/hde/check>; rel="successor-version"
```

### 6.3 `main.py` Router Registration

```python
# Existing v1 — kept for backward compatibility
app.include_router(hde.router, prefix="/api/hde", tags=["HDE v1 (deprecated)"])

# New v2 — authenticated, brand_id from key
app.include_router(hde_v2.router, prefix="/api/v2/hde", tags=["HDE v2"])
```

---

## Part 7 — Error Response Standard

All endpoints, including HDE, return errors in this consistent envelope:

```json
{
  "error": "snake_case_error_code",
  "message": "Human-readable description with actionable guidance.",
  "request_id": "3f8a2b1c-9d4e-4f7a-b2c1-8e3d5f6a9b2c",
  "docs_url": "https://docs.t3platform.com/errors/snake_case_error_code"
}
```

**Standard error codes:**

| HTTP Status | Error Code | Condition |
|---|---|---|
| 400 | `validation_error` | Request body fails schema validation |
| 400 | `text_too_long` | `text` field exceeds 10,000 characters |
| 400 | `invalid_mode` | `mode` is not `block`, `flag`, or `log` |
| 401 | `missing_api_key` | `X-API-Key` header absent |
| 401 | `invalid_api_key` | Key format does not match `t3_live_*` or `t3_test_*` |
| 401 | `api_key_not_found` | Key hash not in database |
| 401 | `api_key_revoked` | Key exists but `revoked_at` is set |
| 429 | `rate_limit_exceeded` | Per-key request rate exceeded |
| 500 | `internal_error` | Unhandled server error |
| 503 | `database_unavailable` | Supabase connection failure |

---

## Part 8 — OpenAPI 3.1 Schema Fragments

### 8.1 HDE v2 Check Endpoint

```yaml
/api/v2/hde/check:
  post:
    operationId: hde_check_v2
    summary: Check AI-generated text for hallucinations
    tags:
      - HDE v2
    security:
      - ApiKeyAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [text]
            properties:
              text:
                type: string
                minLength: 1
                maxLength: 10000
                description: The AI-generated text to fact-check
                example: "Our ProMax Drill costs $89 and covers 400 sq ft."
              mode:
                type: string
                enum: [block, flag, log]
                default: block
                description: |
                  block — return corrected text with hallucinations replaced
                  flag  — return original text with hallucinated claims annotated
                  log   — silently record the check, return original text unchanged
    responses:
      '200':
        description: Check completed successfully
        headers:
          X-RateLimit-Limit:
            schema: { type: integer }
          X-RateLimit-Remaining:
            schema: { type: integer }
          X-RateLimit-Reset:
            schema: { type: integer }
          X-Request-Id:
            schema: { type: string }
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/HDECheckResponse'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '429':
        $ref: '#/components/responses/RateLimited'
      '422':
        $ref: '#/components/responses/ValidationError'

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    HDECheckResponse:
      type: object
      required: [safe, original_text, claims_checked, hallucinations_found, claims, mode, action_taken]
      properties:
        safe:
          type: boolean
          description: True if no hallucinations or outdated claims were found
        original_text:
          type: string
        corrected_text:
          type: string
          nullable: true
          description: Populated only in block mode when hallucinations are found
        claims_checked:
          type: integer
          minimum: 0
        hallucinations_found:
          type: integer
          minimum: 0
        claims:
          type: array
          items:
            $ref: '#/components/schemas/ClaimDetail'
        mode:
          type: string
          enum: [block, flag, log]
        action_taken:
          type: string
          enum: [response_corrected, claims_flagged, silently_logged, passed_clean]

    ClaimDetail:
      type: object
      required: [claim, type, status, confidence]
      properties:
        claim:
          type: string
          description: The exact text of the claim extracted from the input
        type:
          type: string
          enum: [pricing, feature, availability, policy]
        status:
          type: string
          enum: [accurate, hallucinated, outdated, unverified]
        ground_truth:
          type: string
          nullable: true
        confidence:
          type: number
          minimum: 0.0
          maximum: 1.0
        product:
          type: string
          nullable: true

  responses:
    Unauthorized:
      description: API key missing, invalid, or revoked
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    RateLimited:
      description: Per-key rate limit exceeded
      headers:
        Retry-After:
          schema: { type: integer }
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    ValidationError:
      description: Request body failed schema validation
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    ErrorResponse:
      type: object
      required: [error, message]
      properties:
        error:
          type: string
        message:
          type: string
        request_id:
          type: string
        docs_url:
          type: string
```

---

## Part 9 — Implementation Sequence

The following order minimizes risk: each phase can be deployed independently and does not break the current live API.

```
Phase 1 — Database (no code changes required)
  ├── Create api_keys table in Supabase
  ├── Create webhooks table in Supabase
  └── Add increment_key_usage RPC function

Phase 2 — API Key Management (new endpoints, no changes to existing)
  ├── POST /api/keys
  ├── GET  /api/keys
  └── DELETE /api/keys/{id}

Phase 3 — Auth Middleware (new module, no changes to existing HDE route)
  └── app/dependencies/api_key_auth.py

Phase 4 — HDE v2 (new router mounted at /api/v2/hde)
  ├── app/routers/hde_v2.py  (copies hde.py, uses require_api_key, removes brand_id)
  ├── Mount at /api/v2/hde in main.py
  └── Add Deprecation headers to existing /api/hde routes

Phase 5 — Webhook System
  ├── POST /api/webhooks
  ├── GET  /api/webhooks
  ├── DELETE /api/webhooks/{id}
  ├── POST /api/webhooks/{id}/test
  └── app/services/webhook_dispatcher.py
      Integrate dispatch call into hde_v2.py

Phase 6 — SDKs (parallel work, no backend dependency)
  ├── t3-sentinel Python package
  └── @t3sentinel/sdk npm package

Phase 7 — Sunset v1
  └── 2026-09-01: Remove /api/hde unauthenticated endpoint
```

---

## Part 10 — Security Considerations

**API key storage:** Keys are hashed with SHA-256 before storage. The raw key is held in memory only during the single HTTP response that creates it. No logging framework should ever log the full `X-API-Key` header value — configure log scrubbing to redact this header.

**Webhook secret storage:** Webhook secrets are stored encrypted at rest in Supabase using Vault or an equivalent column-level encryption mechanism. The secret is never returned in GET responses after creation.

**Webhook signature verification:** Receivers must validate `X-T3-Signature` using constant-time comparison (`hmac.compare_digest` / `crypto.timingSafeEqual`) to prevent timing attacks.

**Rate limit bypass:** The in-process sliding window described in Part 2 is correct for single-instance deployments. When the API scales horizontally behind a load balancer, replace with a Redis-backed counter using `INCR` + `EXPIRE` commands to ensure the limit is enforced across all instances.

**Test key isolation:** Requests authenticated with `t3_test_*` keys must never read from or write to production Supabase tables. The auth middleware sets `ctx.environment = "test"` and the HDE check route must branch to a synthetic product dataset when `environment == "test"`.

**`X-API-Key` header logging:** Add a FastAPI middleware that scrubs or truncates this header from access logs before they are written:

```python
# Ensure the full API key never appears in logs
# Log only the prefix: "t3_live_[REDACTED]"
```

---

*End of T3 Sentinel Integration Architecture Specification v1.0.0*
