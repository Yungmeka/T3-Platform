"""Ethics Monitoring API routes."""

from fastapi import APIRouter
from app.services.ethics_monitor import generate_ethics_report

router = APIRouter()


@router.get("/report/{brand_id}")
def get_ethics_report(brand_id: int):
    """Generate comprehensive ethics monitoring report for a brand."""
    return generate_ethics_report(brand_id)
