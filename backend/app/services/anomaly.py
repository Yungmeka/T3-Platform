from app.database import get_supabase


def detect_anomalies(brand_id: int) -> list[dict]:
    """Detect anomalies in brand visibility and accuracy trends."""
    sb = get_supabase()

    snapshots = (
        sb.table("analytics_snapshots")
        .select("*")
        .eq("brand_id", brand_id)
        .order("date", desc=True)
        .limit(7)
        .execute()
    )

    if not snapshots.data or len(snapshots.data) < 3:
        return []

    anomalies = []
    recent = snapshots.data[0]
    previous = snapshots.data[1]

    # Check for visibility drop
    if recent["inclusion_rate"] is not None and previous["inclusion_rate"] is not None:
        drop = previous["inclusion_rate"] - recent["inclusion_rate"]
        if drop > 10:
            anomalies.append({
                "type": "visibility_drop",
                "severity": "critical" if drop > 20 else "warning",
                "title": f"Visibility dropped {drop:.1f}% in one day",
                "description": f"Inclusion rate fell from {previous['inclusion_rate']}% to {recent['inclusion_rate']}%.",
            })

    # Check for hallucination spike
    if recent["hallucination_rate"] is not None and previous["hallucination_rate"] is not None:
        spike = recent["hallucination_rate"] - previous["hallucination_rate"]
        if spike > 5:
            anomalies.append({
                "type": "anomaly",
                "severity": "warning",
                "title": f"Hallucination rate spiked {spike:.1f}%",
                "description": f"Hallucination rate increased from {previous['hallucination_rate']}% to {recent['hallucination_rate']}%.",
            })

    # Check for accuracy drop
    if recent["accuracy_score"] is not None and previous["accuracy_score"] is not None:
        acc_drop = previous["accuracy_score"] - recent["accuracy_score"]
        if acc_drop > 8:
            anomalies.append({
                "type": "data_validation",
                "severity": "warning",
                "title": f"Accuracy dropped {acc_drop:.1f}%",
                "description": f"Accuracy score fell from {previous['accuracy_score']}% to {recent['accuracy_score']}%.",
            })

    return anomalies
