"""
Improvement Tracker Engine
--------------------------
"How the company will improve results over time"

Tracks before/after impact of content changes,
measures which optimizations actually moved AI answers,
and builds a historical record proving ROI.
"""

from app.database import get_supabase


def track_improvement(brand_id: int, query_id: int, before_response_id: int, after_response_id: int) -> dict:
    """Compare AI responses before and after a content optimization."""

    sb = get_supabase()

    before_resp = sb.table("ai_responses").select("*").eq("id", before_response_id).execute()
    after_resp = sb.table("ai_responses").select("*").eq("id", after_response_id).execute()

    if not before_resp.data or not after_resp.data:
        return {"error": "Response IDs not found"}

    before = before_resp.data[0]
    after = after_resp.data[0]

    # Get claims for both
    before_claims = sb.table("claims").select("*").eq("response_id", before_response_id).execute()
    after_claims = sb.table("claims").select("*").eq("response_id", after_response_id).execute()

    b_claims = before_claims.data or []
    a_claims = after_claims.data or []

    # Calculate improvements
    b_accurate = len([c for c in b_claims if c["status"] == "accurate"])
    b_hallucinated = len([c for c in b_claims if c["status"] == "hallucinated"])
    a_accurate = len([c for c in a_claims if c["status"] == "accurate"])
    a_hallucinated = len([c for c in a_claims if c["status"] == "hallucinated"])

    b_accuracy = (b_accurate / len(b_claims) * 100) if b_claims else 0
    a_accuracy = (a_accurate / len(a_claims) * 100) if a_claims else 0

    # Check if brand mentioned
    brand_result = sb.table("brands").select("name").eq("id", brand_id).execute()
    brand_name = brand_result.data[0]["name"] if brand_result.data else ""
    b_mentioned = brand_name.lower() in before["response_text"].lower()
    a_mentioned = brand_name.lower() in after["response_text"].lower()

    return {
        "query_id": query_id,
        "brand_id": brand_id,
        "before": {
            "response_id": before_response_id,
            "platform": before["platform"],
            "date": before["queried_at"],
            "brand_mentioned": b_mentioned,
            "total_claims": len(b_claims),
            "accurate": b_accurate,
            "hallucinated": b_hallucinated,
            "accuracy_rate": round(b_accuracy, 1),
        },
        "after": {
            "response_id": after_response_id,
            "platform": after["platform"],
            "date": after["queried_at"],
            "brand_mentioned": a_mentioned,
            "total_claims": len(a_claims),
            "accurate": a_accurate,
            "hallucinated": a_hallucinated,
            "accuracy_rate": round(a_accuracy, 1),
        },
        "improvement": {
            "visibility_changed": a_mentioned and not b_mentioned,
            "accuracy_delta": round(a_accuracy - b_accuracy, 1),
            "hallucinations_delta": a_hallucinated - b_hallucinated,
            "improved": a_accuracy > b_accuracy or (a_mentioned and not b_mentioned),
        },
    }


def get_improvement_history(brand_id: int) -> dict:
    """Get historical improvement data from analytics snapshots."""

    sb = get_supabase()

    snapshots = (
        sb.table("analytics_snapshots")
        .select("*")
        .eq("brand_id", brand_id)
        .order("date", desc=False)
        .execute()
    )

    if not snapshots.data or len(snapshots.data) < 2:
        return {"message": "Need more data to show improvement history"}

    data = snapshots.data
    first_week = data[:7]
    last_week = data[-7:]

    def avg(records, field):
        vals = [r[field] for r in records if r.get(field) is not None]
        return round(sum(vals) / len(vals), 1) if vals else 0

    return {
        "brand_id": brand_id,
        "total_days_monitored": len(data),
        "first_week_avg": {
            "inclusion_rate": avg(first_week, "inclusion_rate"),
            "accuracy_score": avg(first_week, "accuracy_score"),
            "hallucination_rate": avg(first_week, "hallucination_rate"),
            "brand_trust_score": avg(first_week, "brand_trust_score"),
        },
        "last_week_avg": {
            "inclusion_rate": avg(last_week, "inclusion_rate"),
            "accuracy_score": avg(last_week, "accuracy_score"),
            "hallucination_rate": avg(last_week, "hallucination_rate"),
            "brand_trust_score": avg(last_week, "brand_trust_score"),
        },
        "total_improvement": {
            "inclusion_rate": round(avg(last_week, "inclusion_rate") - avg(first_week, "inclusion_rate"), 1),
            "accuracy_score": round(avg(last_week, "accuracy_score") - avg(first_week, "accuracy_score"), 1),
            "hallucination_rate": round(avg(last_week, "hallucination_rate") - avg(first_week, "hallucination_rate"), 1),
            "brand_trust_score": round(avg(last_week, "brand_trust_score") - avg(first_week, "brand_trust_score"), 1),
        },
        "timeline": [
            {"date": s["date"], "trust": s.get("brand_trust_score"), "accuracy": s.get("accuracy_score"), "hallucination": s.get("hallucination_rate"), "visibility": s.get("inclusion_rate")}
            for s in data
        ],
    }


def calculate_roi_metrics(brand_id: int) -> dict:
    """Calculate business ROI metrics from monitoring improvements."""

    history = get_improvement_history(brand_id)

    if isinstance(history, dict) and "message" in history:
        return history

    improvements = history["total_improvement"]

    # Estimated business impact (based on industry benchmarks)
    visibility_lift = max(0, improvements["inclusion_rate"])
    accuracy_lift = max(0, improvements["accuracy_score"])
    hallucination_reduction = max(0, -improvements["hallucination_rate"])

    return {
        "brand_id": brand_id,
        "monitoring_period": f"{history['total_days_monitored']} days",
        "improvements": improvements,
        "estimated_impact": {
            "customer_reach": f"+{visibility_lift:.0f}% more customers seeing brand in AI answers",
            "misinformation_reduction": f"{hallucination_reduction:.0f}% fewer incorrect claims about products",
            "accuracy_gain": f"+{accuracy_lift:.0f}% more accurate product representation",
            "support_ticket_reduction": f"Estimated {hallucination_reduction * 2:.0f}% fewer AI-related support inquiries",
            "return_rate_impact": f"Estimated {hallucination_reduction * 1.5:.0f}% reduction in returns from misinformed purchases",
        },
    }
