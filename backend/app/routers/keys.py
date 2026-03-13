"""
API Key Management — T3 Sentinel
----------------------------------
Provides CRUD operations for API keys used to authenticate external
integrations (e.g., the HDE embeddable API).

Security model:
- Raw keys are NEVER stored. Only a SHA-256 hash is persisted.
- The full key is returned exactly once, at creation time.
- The prefix (first 12 chars) is stored for UI identification.
- Deletion is a soft-delete: sets revoked_at, leaves the row intact
  for audit purposes.

Endpoints:
    POST   /api/keys          — Create a new key (returns full key once)
    GET    /api/keys          — List all keys for the authenticated user
    DELETE /api/keys/{key_id} — Revoke a key (soft delete)
"""

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field
from app.database import get_supabase

router = APIRouter()

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class CreateKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Human-readable label for this key")
    brand_id: int = Field(..., description="Brand this key grants access to")
    environment: str = Field("production", description="'production' or 'test'")
    user_id: str = Field(..., description="UUID of the owning user (from Supabase auth)")
    rate_limit: int = Field(100, ge=1, le=10000, description="Max requests per minute")


class CreateKeyResponse(BaseModel):
    id: int
    key: str                  # Full key — shown ONCE only
    prefix: str               # First 12 chars for future identification
    name: str
    brand_id: int
    environment: str
    rate_limit: int
    created_at: str


class KeySummary(BaseModel):
    id: int
    prefix: str               # Never expose key_hash or the raw key
    name: str
    brand_id: int
    environment: str
    rate_limit: int
    usage_count: int
    last_used_at: Optional[str]
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_key(environment: str) -> tuple[str, str, str]:
    """
    Generate a new API key.

    Returns:
        full_key  — the raw key to hand to the caller (never stored)
        key_hash  — SHA-256 hex digest to persist in the database
        prefix    — first 12 chars of full_key for UI identification
    """
    token = secrets.token_urlsafe(32)
    tag = "live" if environment == "production" else "test"
    full_key = f"t3_{tag}_{token}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    prefix = full_key[:12]
    return full_key, key_hash, prefix


def _get_user_id_from_header(authorization: Optional[str]) -> str:
    """
    Extract the user_id from a Bearer token header.
    In production this would verify the JWT with Supabase; here we
    accept an explicit user_id in the request body to keep the
    implementation self-contained and testable without a live auth session.
    """
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return ""


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("", response_model=CreateKeyResponse, status_code=201)
async def create_api_key(req: CreateKeyRequest):
    """
    Create a new API key for the given brand.

    The response contains the full raw key exactly once.
    Store it securely — it cannot be retrieved again.
    """
    if req.environment not in ("production", "test"):
        raise HTTPException(
            status_code=422,
            detail="environment must be 'production' or 'test'",
        )

    full_key, key_hash, prefix = _generate_key(req.environment)
    sb = get_supabase()

    # Guard against the astronomically unlikely hash collision
    existing = (
        sb.table("api_keys")
        .select("id")
        .eq("key_hash", key_hash)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=500, detail="Key collision — please retry")

    row = {
        "brand_id": req.brand_id,
        "user_id": req.user_id,
        "key_hash": key_hash,
        "prefix": prefix,
        "name": req.name,
        "environment": req.environment,
        "rate_limit": req.rate_limit,
        "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = sb.table("api_keys").insert(row).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to persist API key")

    created = result.data[0]

    return {
        "id": created["id"],
        "key": full_key,          # Raw key — only time it is ever returned
        "prefix": prefix,
        "name": created["name"],
        "brand_id": created["brand_id"],
        "environment": created.get("environment", req.environment),
        "rate_limit": created["rate_limit"],
        "created_at": created["created_at"],
    }


@router.get("", response_model=list[KeySummary])
async def list_api_keys(
    user_id: str = Query(..., description="UUID of the owning user"),
    brand_id: Optional[int] = Query(None, description="Filter by brand"),
):
    """
    List all active (non-revoked) API keys owned by a user.
    The prefix is returned for identification; the raw key and hash
    are never exposed.
    """
    sb = get_supabase()

    query = (
        sb.table("api_keys")
        .select(
            "id, prefix, name, brand_id, environment, rate_limit, "
            "usage_count, last_used_at, created_at"
        )
        .eq("user_id", user_id)
        .is_("revoked_at", "null")
        .order("created_at", desc=True)
    )

    if brand_id is not None:
        query = query.eq("brand_id", brand_id)

    result = query.execute()
    return result.data or []


@router.delete("/{key_id}", status_code=200)
async def revoke_api_key(
    key_id: int,
    user_id: str = Query(..., description="UUID of the owning user"),
):
    """
    Revoke an API key by setting its revoked_at timestamp (soft delete).

    The row is retained for audit purposes. Any subsequent request using
    this key will receive a 401.
    """
    sb = get_supabase()

    # Verify the key exists and belongs to this user before revoking
    existing = (
        sb.table("api_keys")
        .select("id, revoked_at")
        .eq("id", key_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="API key not found or does not belong to this user",
        )

    if existing.data[0].get("revoked_at"):
        raise HTTPException(status_code=409, detail="API key is already revoked")

    result = (
        sb.table("api_keys")
        .update({"revoked_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", key_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to revoke API key")

    return {"id": key_id, "revoked": True, "revoked_at": result.data[0]["revoked_at"]}
