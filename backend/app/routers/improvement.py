"""Improvement Tracking API routes."""

from fastapi import APIRouter
from app.services.improvement_tracker import get_improvement_history, calculate_roi_metrics

router = APIRouter()


@router.get("/history/{brand_id}")
def get_history(brand_id: int):
    """Get improvement history showing before/after metrics over time."""
    return get_improvement_history(brand_id)


@router.get("/roi/{brand_id}")
def get_roi(brand_id: int):
    """Calculate business ROI from T3 monitoring and improvements."""
    return calculate_roi_metrics(brand_id)
