from fastapi import APIRouter, Query
from app.database import get_supabase

router = APIRouter()


@router.get("/snapshots/{brand_id}")
def get_snapshots(brand_id: int, days: int = Query(default=30)):
    sb = get_supabase()
    result = (
        sb.table("analytics_snapshots")
        .select("*")
        .eq("brand_id", brand_id)
        .order("date", desc=False)
        .limit(days)
        .execute()
    )
    return result.data


@router.get("/summary/{brand_id}")
def get_brand_summary(brand_id: int):
    sb = get_supabase()

    # Get latest snapshot
    latest = (
        sb.table("analytics_snapshots")
        .select("*")
        .eq("brand_id", brand_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )

    # Get total claims by status
    claims = (
        sb.table("claims")
        .select("*")
        .eq("brand_id", brand_id)
        .execute()
    )

    claim_data = claims.data if claims.data else []
    total = len(claim_data)
    accurate = len([c for c in claim_data if c["status"] == "accurate"])
    hallucinated = len([c for c in claim_data if c["status"] == "hallucinated"])
    outdated = len([c for c in claim_data if c["status"] == "outdated"])

    # Get unresolved alerts count
    alerts = (
        sb.table("alerts")
        .select("id", count="exact")
        .eq("brand_id", brand_id)
        .eq("resolved", False)
        .execute()
    )

    return {
        "latest_snapshot": latest.data[0] if latest.data else None,
        "claims": {
            "total": total,
            "accurate": accurate,
            "hallucinated": hallucinated,
            "outdated": outdated,
        },
        "unresolved_alerts": alerts.count if alerts.count else 0,
    }


@router.get("/overview")
def get_all_brands_overview():
    sb = get_supabase()
    brands = sb.table("brands").select("*").execute()

    overview = []
    for brand in brands.data:
        latest = (
            sb.table("analytics_snapshots")
            .select("*")
            .eq("brand_id", brand["id"])
            .order("date", desc=True)
            .limit(1)
            .execute()
        )

        unresolved = (
            sb.table("alerts")
            .select("id", count="exact")
            .eq("brand_id", brand["id"])
            .eq("resolved", False)
            .execute()
        )

        overview.append({
            "brand": brand,
            "latest_snapshot": latest.data[0] if latest.data else None,
            "unresolved_alerts": unresolved.count if unresolved.count else 0,
        })

    return overview
