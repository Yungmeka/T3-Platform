"""
Automated Monitoring API Routes
---------------------------------
Endpoints for managing T3's automated brand monitoring system.
This is what makes T3 truly automated — not just on-demand scans.

- GET /status — Current scheduler status and next scan times
- GET /history — Past scan results and metrics
- POST /trigger — Manually trigger an immediate scan
- PUT /config — Update scan frequency and schedule
- POST /start — Start automated monitoring
- POST /stop — Pause automated monitoring
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from app.services.scheduler import (
    get_scheduler_status,
    get_scan_history,
    start_scheduler,
    stop_scheduler,
    update_schedule,
    _run_scheduled_scan,
)

router = APIRouter()


class ScheduleConfig(BaseModel):
    daily_scan_enabled: Optional[bool] = None
    daily_scan_hour: Optional[int] = None
    daily_scan_minute: Optional[int] = None
    hourly_check_enabled: Optional[bool] = None
    interval_minutes: Optional[int] = None


@router.get("/status")
def monitoring_status():
    """Get current automated monitoring status, schedule, and next scan times."""
    return get_scheduler_status()


@router.get("/history")
def monitoring_history(limit: int = Query(default=20, le=100)):
    """Get recent automated scan history with results."""
    return get_scan_history(limit)


@router.post("/trigger")
async def trigger_scan(scan_type: str = Query(default="manual")):
    """Manually trigger an immediate automated scan of all brands."""
    await _run_scheduled_scan(scan_type=scan_type)
    history = get_scan_history(1)
    return history[0] if history else {"status": "triggered"}


@router.put("/config")
def update_monitoring_config(config: ScheduleConfig):
    """Update automated monitoring schedule (frequency, time, enable/disable)."""
    updates = {k: v for k, v in config.dict().items() if v is not None}
    if not updates:
        return {"error": "No config changes provided"}
    new_config = update_schedule(updates)
    return {"message": "Schedule updated", "config": new_config}


@router.post("/start")
def start_monitoring():
    """Start the automated monitoring scheduler."""
    start_scheduler()
    return get_scheduler_status()


@router.post("/stop")
def stop_monitoring():
    """Pause automated monitoring (can be restarted)."""
    stop_scheduler()
    return {"status": "stopped", "message": "Automated monitoring paused"}
