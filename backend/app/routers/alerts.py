from fastapi import APIRouter, Query
from app.database import get_supabase

router = APIRouter()


@router.get("/")
def get_alerts(
    brand_id: int = Query(default=None),
    resolved: bool = Query(default=None),
    severity: str = Query(default=None),
    alert_type: str = Query(default=None),
):
    sb = get_supabase()
    query = sb.table("alerts").select("*, brands(name)")

    if brand_id is not None:
        query = query.eq("brand_id", brand_id)
    if resolved is not None:
        query = query.eq("resolved", resolved)
    if severity is not None:
        query = query.eq("severity", severity)
    if alert_type is not None:
        query = query.eq("alert_type", alert_type)

    result = query.order("created_at", desc=True).execute()
    return result.data


@router.patch("/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    sb = get_supabase()
    result = (
        sb.table("alerts")
        .update({"resolved": True})
        .eq("id", alert_id)
        .execute()
    )
    return result.data


@router.get("/stats")
def get_alert_stats(brand_id: int = Query(default=None)):
    sb = get_supabase()
    query = sb.table("alerts").select("*")

    if brand_id is not None:
        query = query.eq("brand_id", brand_id)

    result = query.execute()
    alerts = result.data if result.data else []

    return {
        "total": len(alerts),
        "unresolved": len([a for a in alerts if not a.get("resolved", False)]),
        "critical": len([a for a in alerts if a.get("severity", "unknown") == "critical"]),
        "by_type": {
            "hallucination": len([a for a in alerts if a.get("alert_type", "unknown") == "hallucination"]),
            "anomaly": len([a for a in alerts if a.get("alert_type", "unknown") == "anomaly"]),
            "data_validation": len([a for a in alerts if a.get("alert_type", "unknown") == "data_validation"]),
            "visibility_drop": len([a for a in alerts if a.get("alert_type", "unknown") == "visibility_drop"]),
        },
    }
