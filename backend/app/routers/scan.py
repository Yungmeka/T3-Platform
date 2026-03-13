"""Full scan orchestrator API routes."""

from fastapi import APIRouter, HTTPException
from app.database import get_supabase
from app.services.orchestrator import run_full_scan

router = APIRouter()


@router.post("/{brand_id}")
async def trigger_full_scan(brand_id: int):
    """Run a complete monitoring scan for a brand across all AI platforms."""
    sb = get_supabase()
    brand = sb.table("brands").select("id").eq("id", brand_id).execute()
    if not brand.data:
        raise HTTPException(status_code=404, detail="Brand not found")
    return await run_full_scan(brand_id)
