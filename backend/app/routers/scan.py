"""Full scan orchestrator API routes."""

from fastapi import APIRouter
from app.services.orchestrator import run_full_scan

router = APIRouter()


@router.post("/{brand_id}")
async def trigger_full_scan(brand_id: int):
    """Run a complete monitoring scan for a brand across all AI platforms."""
    return await run_full_scan(brand_id)
