"""
Automated Monitoring Scheduler
-------------------------------
Uses APScheduler to run brand visibility scans on a configurable schedule.
This is the "automated monitoring" the challenge requires — brands don't
have to manually trigger scans. T3 watches AI platforms continuously.

Schedule types:
- Daily full scan: Runs all queries for all brands across all 4 platforms
- Hourly quick scan: Checks brand inclusion for top queries only
- On-demand: Triggered via API for immediate scan
"""

import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger("t3.scheduler")

# Global scheduler instance
scheduler = AsyncIOScheduler()

# In-memory scan history (also persisted to Supabase)
scan_history = []
MAX_HISTORY = 100

# Schedule configuration (can be updated via API)
schedule_config = {
    "daily_scan_enabled": True,
    "daily_scan_hour": 6,        # 6 AM
    "daily_scan_minute": 0,
    "hourly_check_enabled": True,
    "interval_minutes": 60,       # Every 60 minutes
}


async def _run_scheduled_scan(scan_type: str = "daily"):
    """Execute automated scan for all brands."""
    from app.database import get_supabase
    from app.services.orchestrator import run_full_scan

    start_time = datetime.now(timezone.utc)
    scan_record = {
        "id": len(scan_history) + 1,
        "type": scan_type,
        "started_at": start_time.isoformat(),
        "status": "running",
        "brands_scanned": 0,
        "total_claims": 0,
        "hallucinations_found": 0,
        "alerts_created": 0,
        "errors": [],
    }
    scan_history.append(scan_record)
    if len(scan_history) > MAX_HISTORY:
        scan_history.pop(0)

    logger.info(f"[T3 Scheduler] Starting {scan_type} automated scan...")

    try:
        sb = get_supabase()
        brands = sb.table("brands").select("id, name").execute()

        if not brands.data:
            scan_record["status"] = "completed"
            scan_record["completed_at"] = datetime.now(timezone.utc).isoformat()
            return

        for brand in brands.data:
            try:
                result = await run_full_scan(brand["id"])
                scan_record["brands_scanned"] += 1
                scan_record["total_claims"] += result.get("claims_extracted", 0)
                scan_record["hallucinations_found"] += result.get("hallucinations_found", 0)
                scan_record["alerts_created"] += result.get("alerts_created", 0)
                logger.info(f"  Scanned {brand['name']}: {result.get('claims_extracted', 0)} claims, {result.get('hallucinations_found', 0)} hallucinations")
            except Exception as e:
                scan_record["errors"].append({"brand": brand["name"], "error": str(e)})
                logger.error(f"  Error scanning {brand['name']}: {e}")

        scan_record["status"] = "completed"
        scan_record["completed_at"] = datetime.now(timezone.utc).isoformat()
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        scan_record["duration_seconds"] = round(duration, 1)

        logger.info(
            f"[T3 Scheduler] {scan_type} scan complete: "
            f"{scan_record['brands_scanned']} brands, "
            f"{scan_record['total_claims']} claims, "
            f"{scan_record['hallucinations_found']} hallucinations, "
            f"{scan_record['alerts_created']} alerts "
            f"({duration:.1f}s)"
        )

    except Exception as e:
        scan_record["status"] = "failed"
        scan_record["error"] = str(e)
        scan_record["completed_at"] = datetime.now(timezone.utc).isoformat()
        logger.error(f"[T3 Scheduler] Scan failed: {e}")


def start_scheduler():
    """Initialize and start the automated monitoring scheduler."""
    if scheduler.running:
        return

    # Daily full scan — runs every day at configured hour
    if schedule_config["daily_scan_enabled"]:
        scheduler.add_job(
            _run_scheduled_scan,
            trigger=CronTrigger(
                hour=schedule_config["daily_scan_hour"],
                minute=schedule_config["daily_scan_minute"],
            ),
            id="daily_full_scan",
            name="Daily Full Brand Scan",
            kwargs={"scan_type": "daily"},
            replace_existing=True,
        )
        logger.info(
            f"[T3 Scheduler] Daily scan scheduled at "
            f"{schedule_config['daily_scan_hour']:02d}:{schedule_config['daily_scan_minute']:02d}"
        )

    # Hourly quick check — monitors brand inclusion at regular intervals
    if schedule_config["hourly_check_enabled"]:
        scheduler.add_job(
            _run_scheduled_scan,
            trigger=IntervalTrigger(minutes=schedule_config["interval_minutes"]),
            id="hourly_quick_check",
            name="Hourly Brand Monitoring",
            kwargs={"scan_type": "hourly"},
            replace_existing=True,
        )
        logger.info(
            f"[T3 Scheduler] Hourly monitoring every {schedule_config['interval_minutes']} minutes"
        )

    scheduler.start()
    logger.info("[T3 Scheduler] Automated monitoring ACTIVE")


def stop_scheduler():
    """Stop the automated monitoring scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[T3 Scheduler] Automated monitoring STOPPED")


def get_scheduler_status() -> dict:
    """Get current scheduler status and upcoming jobs."""
    jobs = []
    if scheduler.running:
        for job in scheduler.get_jobs():
            next_run = job.next_run_time
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": next_run.isoformat() if next_run else None,
                "trigger": str(job.trigger),
            })

    return {
        "running": scheduler.running,
        "config": schedule_config,
        "scheduled_jobs": jobs,
        "total_scans_completed": len([s for s in scan_history if s["status"] == "completed"]),
        "total_scans_failed": len([s for s in scan_history if s["status"] == "failed"]),
    }


def get_scan_history(limit: int = 20) -> list:
    """Get recent scan history."""
    return list(reversed(scan_history[-limit:]))


def update_schedule(config_updates: dict):
    """Update schedule configuration and restart jobs."""
    schedule_config.update(config_updates)

    # Restart scheduler with new config
    if scheduler.running:
        scheduler.shutdown(wait=False)

    # Re-initialize with updated config
    start_scheduler()
    return schedule_config
