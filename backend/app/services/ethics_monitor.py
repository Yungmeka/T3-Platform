"""
Ethics Monitoring Engine
------------------------
The case prompt requires answering:
1. How will you monitor issues over time?
2. What actions will your solution take when problems are found?
3. How will you show that monitoring improves customer trust and business outcomes?

This engine implements all three.
"""

from datetime import datetime, timedelta
from app.database import get_supabase


def generate_ethics_report(brand_id: int) -> dict:
    """Generate a comprehensive ethics monitoring report for a brand."""

    sb = get_supabase()

    # Get all claims for this brand
    claims_result = sb.table("claims").select("*").eq("brand_id", brand_id).execute()
    claims = claims_result.data or []

    # Get all alerts for this brand
    alerts_result = sb.table("alerts").select("*").eq("brand_id", brand_id).execute()
    alerts = alerts_result.data or []

    # Get analytics snapshots (last 30 days)
    snapshots_result = (
        sb.table("analytics_snapshots")
        .select("*")
        .eq("brand_id", brand_id)
        .order("date", desc=True)
        .limit(30)
        .execute()
    )
    snapshots = snapshots_result.data or []

    # --- Part 1: How we monitor issues over time ---
    monitoring_summary = _build_monitoring_summary(claims, snapshots)

    # --- Part 2: Actions taken when problems found ---
    actions_taken = _build_actions_report(alerts, claims)

    # --- Part 3: Proving improved trust and outcomes ---
    trust_improvement = _build_trust_metrics(snapshots)

    # --- Overall Ethics Score ---
    ethics_score = _calculate_ethics_score(monitoring_summary, actions_taken, trust_improvement)

    return {
        "brand_id": brand_id,
        "generated_at": datetime.utcnow().isoformat(),
        "ethics_score": ethics_score,
        "monitoring": monitoring_summary,
        "actions": actions_taken,
        "trust_improvement": trust_improvement,
    }


def _build_monitoring_summary(claims: list, snapshots: list) -> dict:
    """Part 1: How we monitor issues over time."""

    total_claims = len(claims)
    hallucinated = [c for c in claims if c.get("status") == "hallucinated"]
    outdated = [c for c in claims if c.get("status") == "outdated"]
    accurate = [c for c in claims if c.get("status") == "accurate"]

    # Categorize hallucinations by type
    hallucination_types = {}
    for claim in hallucinated:
        ctype = claim.get("claim_type", "unknown")
        hallucination_types[ctype] = hallucination_types.get(ctype, 0) + 1

    # Get hallucination rate trend
    hall_rates = [s.get("hallucination_rate", 0) for s in snapshots if s.get("hallucination_rate") is not None]

    return {
        "total_claims_analyzed": total_claims,
        "hallucinations_detected": len(hallucinated),
        "outdated_info_detected": len(outdated),
        "accurate_claims": len(accurate),
        "hallucination_rate": round(len(hallucinated) / total_claims * 100, 1) if total_claims > 0 else 0,
        "hallucination_by_type": hallucination_types,
        "most_common_hallucination": max(hallucination_types, key=hallucination_types.get) if hallucination_types else "none",
        "monitoring_frequency": "Daily automated scans across ChatGPT, Gemini, Perplexity, Copilot",
        "claim_categories_tracked": ["price", "feature", "availability", "policy", "comparison"],
        "hallucination_trend": {
            "current": hall_rates[0] if hall_rates else 0,
            "30_day_avg": round(sum(hall_rates) / len(hall_rates), 1) if hall_rates else 0,
            "direction": "improving" if len(hall_rates) >= 2 and hall_rates[0] < hall_rates[-1] else "worsening" if len(hall_rates) >= 2 and hall_rates[0] > hall_rates[-1] else "stable",
        },
    }


def _build_actions_report(alerts: list, claims: list) -> dict:
    """Part 2: What actions we take when problems are found."""

    resolved_alerts = [a for a in alerts if a.get("resolved")]
    unresolved_alerts = [a for a in alerts if not a.get("resolved")]

    # Categorize by action type
    actions = {
        "hallucination_alerts_raised": len([a for a in alerts if a.get("alert_type") == "hallucination"]),
        "anomaly_alerts_raised": len([a for a in alerts if a.get("alert_type") == "anomaly"]),
        "data_validation_alerts_raised": len([a for a in alerts if a.get("alert_type") == "data_validation"]),
        "visibility_alerts_raised": len([a for a in alerts if a.get("alert_type") == "visibility_drop"]),
    }

    action_pipeline = [
        {
            "step": 1,
            "action": "Detect",
            "description": "AI response parsed, claims extracted, compared against verified product database",
            "automated": True,
        },
        {
            "step": 2,
            "action": "Alert",
            "description": "Brand team notified with exact incorrect claim, correct information, and likely source",
            "automated": True,
        },
        {
            "step": 3,
            "action": "Generate Correction",
            "description": "Optimized content generated: corrected product description, schema.org data, FAQ content",
            "automated": True,
        },
        {
            "step": 4,
            "action": "Validate",
            "description": "3-step verification: scan sources, cross-check ground truth, flag inconsistencies",
            "automated": True,
        },
        {
            "step": 5,
            "action": "Verify Fix",
            "description": "Re-query AI platforms after correction to confirm improvement propagated",
            "automated": True,
        },
    ]

    return {
        "total_alerts": len(alerts),
        "resolved": len(resolved_alerts),
        "unresolved": len(unresolved_alerts),
        "resolution_rate": round(len(resolved_alerts) / len(alerts) * 100, 1) if alerts else 0,
        "alerts_by_type": actions,
        "action_pipeline": action_pipeline,
        "critical_unresolved": [
            {"title": a["title"], "description": a["description"], "created_at": a["created_at"]}
            for a in unresolved_alerts
            if a.get("severity") == "critical"
        ][:5],
    }


def _build_trust_metrics(snapshots: list) -> dict:
    """Part 3: Proving improved customer trust and business outcomes."""

    if not snapshots or len(snapshots) < 2:
        return {"message": "Insufficient data — need at least 2 days of monitoring"}

    latest = snapshots[0]
    oldest = snapshots[-1]

    trust_change = (latest.get("brand_trust_score", 0) or 0) - (oldest.get("brand_trust_score", 0) or 0)
    accuracy_change = (latest.get("accuracy_score", 0) or 0) - (oldest.get("accuracy_score", 0) or 0)
    hallucination_change = (latest.get("hallucination_rate", 0) or 0) - (oldest.get("hallucination_rate", 0) or 0)
    inclusion_change = (latest.get("inclusion_rate", 0) or 0) - (oldest.get("inclusion_rate", 0) or 0)

    return {
        "period": f"{oldest.get('date', '?')} to {latest.get('date', '?')}",
        "brand_trust_score": {
            "current": latest.get("brand_trust_score", 0),
            "change": round(trust_change, 1),
            "direction": "improved" if trust_change > 0 else "declined" if trust_change < 0 else "stable",
        },
        "accuracy_score": {
            "current": latest.get("accuracy_score", 0),
            "change": round(accuracy_change, 1),
            "direction": "improved" if accuracy_change > 0 else "declined" if accuracy_change < 0 else "stable",
        },
        "hallucination_rate": {
            "current": latest.get("hallucination_rate", 0),
            "change": round(hallucination_change, 1),
            "direction": "improved" if hallucination_change < 0 else "worsened" if hallucination_change > 0 else "stable",
        },
        "inclusion_rate": {
            "current": latest.get("inclusion_rate", 0),
            "change": round(inclusion_change, 1),
            "direction": "improved" if inclusion_change > 0 else "declined" if inclusion_change < 0 else "stable",
        },
        "business_impact_indicators": [
            f"Brand Trust Score {'increased' if trust_change > 0 else 'decreased'} by {abs(trust_change):.1f} points",
            f"AI accuracy {'improved' if accuracy_change > 0 else 'declined'} by {abs(accuracy_change):.1f}%",
            f"Hallucination rate {'reduced' if hallucination_change < 0 else 'increased'} by {abs(hallucination_change):.1f}%",
            f"AI visibility {'grew' if inclusion_change > 0 else 'dropped'} by {abs(inclusion_change):.1f}%",
        ],
        "projected_outcomes": [
            "Fewer customer support tickets from AI-misinformed buyers",
            "Reduced return rates from customers who received accurate AI recommendations",
            "Increased organic traffic from customers verifying AI recommendations on brand website",
            "Improved brand reputation through accurate AI representation",
        ],
    }


def _calculate_ethics_score(monitoring: dict, actions: dict, trust: dict) -> dict:
    """Calculate overall ethics compliance score."""

    scores = []

    # Monitoring coverage (are we tracking enough?)
    if monitoring["total_claims_analyzed"] >= 10:
        scores.append(90)
    elif monitoring["total_claims_analyzed"] >= 5:
        scores.append(70)
    else:
        scores.append(40)

    # Hallucination detection rate (lower is better)
    hall_rate = monitoring.get("hallucination_rate", 50)
    if hall_rate < 10:
        scores.append(95)
    elif hall_rate < 20:
        scores.append(75)
    else:
        scores.append(50)

    # Response rate (are we taking action?)
    resolution_rate = actions.get("resolution_rate", 0)
    scores.append(min(100, resolution_rate + 10))

    # Trust trend (is it improving?)
    trust_score = trust.get("brand_trust_score", {})
    if isinstance(trust_score, dict):
        if trust_score.get("direction") == "improved":
            scores.append(90)
        elif trust_score.get("direction") == "stable":
            scores.append(70)
        else:
            scores.append(40)

    overall = round(sum(scores) / len(scores), 1) if scores else 50

    return {
        "overall": overall,
        "grade": "A" if overall >= 90 else "B" if overall >= 75 else "C" if overall >= 60 else "D",
        "components": {
            "monitoring_coverage": scores[0] if len(scores) > 0 else 0,
            "hallucination_management": scores[1] if len(scores) > 1 else 0,
            "response_rate": scores[2] if len(scores) > 2 else 0,
            "trust_trend": scores[3] if len(scores) > 3 else 0,
        },
    }
