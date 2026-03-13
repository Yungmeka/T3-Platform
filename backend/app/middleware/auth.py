"""
Authentication middleware for T3 Sentinel API.
-------------------------------------------------
Validates API keys passed via the X-API-Key header.
Keys are stored as SHA-256 hashes — the raw key is
never persisted and cannot be recovered after creation.

Usage:
    from app.middleware.auth import require_api_key

    @router.post("/check")
    async def my_endpoint(api_key_record: dict = Depends(require_api_key)):
        brand_id = api_key_record["brand_id"]
"""

import hashlib
from datetime import datetime, timezone

from fastapi import Header, HTTPException, Depends
from app.database import get_supabase


async def require_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> dict:
    """
    Validate an API key and return the associated key record.

    - Hashes the incoming key with SHA-256 and looks it up in the database.
    - Rejects keys that have been revoked (revoked_at is not null).
    - Increments usage_count and stamps last_used_at on every successful call.

    Returns the full api_keys row, which includes brand_id, rate_limit, etc.
    Raises HTTP 401 for any missing, malformed, or revoked key.
    """
    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    sb = get_supabase()

    result = (
        sb.table("api_keys")
        .select("*")
        .eq("key_hash", key_hash)
        .is_("revoked_at", "null")
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    key_record = result.data[0]

    # Fire-and-forget usage update — failure here should not block the request
    try:
        sb.table("api_keys").update(
            {
                "usage_count": key_record["usage_count"] + 1,
                "last_used_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", key_record["id"]).execute()
    except Exception:
        pass  # Non-fatal; stats are best-effort

    return key_record


async def optional_api_key(
    x_api_key: str = Header(None, alias="X-API-Key"),
) -> dict | None:
    """
    Like require_api_key but returns None when the header is absent.
    Use this on endpoints that support both authenticated and unauthenticated
    access (e.g. brand_id can come from the key OR the request body).
    """
    if x_api_key is None:
        return None
    return await require_api_key(x_api_key)
