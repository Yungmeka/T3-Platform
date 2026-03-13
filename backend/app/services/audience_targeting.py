"""
Audience Targeting Engine
-------------------------
Maps AI shopping queries to audience segments so companies
can understand which customers they're reaching and which
they're missing through AI-assisted shopping.
"""


# Query category to audience segment mapping
AUDIENCE_SEGMENTS = {
    "price": {
        "segment": "Budget-Conscious Shoppers",
        "description": "Consumers primarily driven by price, looking for deals and value",
        "demographics": "Students, young professionals, price-sensitive families",
        "ai_behavior": "Ask 'best under $X', 'cheapest', 'deals on', 'affordable'",
    },
    "recommendation": {
        "segment": "Research-Driven Buyers",
        "description": "Consumers seeking expert recommendations before purchasing",
        "demographics": "Professionals, first-time buyers, quality-focused consumers",
        "ai_behavior": "Ask 'best for X', 'what should I buy', 'recommend', 'top rated'",
    },
    "comparison": {
        "segment": "Comparison Shoppers",
        "description": "Consumers actively evaluating multiple brands/products",
        "demographics": "Tech-savvy users, professionals making business decisions",
        "ai_behavior": "Ask 'X vs Y', 'compare', 'difference between', 'which is better'",
    },
    "feature": {
        "segment": "Feature-Focused Buyers",
        "description": "Consumers who know exactly what specs or capabilities they need",
        "demographics": "Power users, professionals, enthusiasts",
        "ai_behavior": "Ask about specific features, specs, capabilities, compatibility",
    },
    "trust": {
        "segment": "Trust-Seeking Consumers",
        "description": "Consumers concerned about safety, legitimacy, and reliability",
        "demographics": "New online shoppers, cautious buyers, older demographics",
        "ai_behavior": "Ask 'is X safe', 'is X legit', 'can I trust', 'reviews of'",
    },
    "manual": {
        "segment": "General Shoppers",
        "description": "Consumers with general shopping queries",
        "demographics": "Broad demographic",
        "ai_behavior": "General product and brand questions",
    },
}


def analyze_audience_reach(queries: list[dict], responses_with_mentions: list[dict]) -> dict:
    """
    Analyze which audience segments a brand is reaching through AI answers.

    queries: list of query records with 'category' field
    responses_with_mentions: list of AI responses where brand was mentioned
    """

    segment_data = {}

    # Count total queries per segment
    for query in queries:
        category = query.get("category", "manual")
        segment = AUDIENCE_SEGMENTS.get(category, AUDIENCE_SEGMENTS["manual"])
        segment_name = segment["segment"]

        if segment_name not in segment_data:
            segment_data[segment_name] = {
                **segment,
                "total_queries": 0,
                "brand_mentioned": 0,
                "reach_rate": 0,
                "sample_queries": [],
            }

        segment_data[segment_name]["total_queries"] += 1
        if len(segment_data[segment_name]["sample_queries"]) < 3:
            segment_data[segment_name]["sample_queries"].append(query.get("query_text", ""))

    # Count mentions per segment
    for resp in responses_with_mentions:
        query_category = resp.get("query_category", "manual")
        segment = AUDIENCE_SEGMENTS.get(query_category, AUDIENCE_SEGMENTS["manual"])
        segment_name = segment["segment"]
        if segment_name in segment_data:
            segment_data[segment_name]["brand_mentioned"] += 1

    # Calculate reach rates
    for name, data in segment_data.items():
        if data["total_queries"] > 0:
            data["reach_rate"] = round((data["brand_mentioned"] / data["total_queries"]) * 100, 1)

    # Sort by reach rate (lowest first = biggest opportunity)
    sorted_segments = sorted(segment_data.values(), key=lambda x: x["reach_rate"])

    # Identify gaps and opportunities
    reached = [s for s in sorted_segments if s["reach_rate"] >= 50]
    underserved = [s for s in sorted_segments if 0 < s["reach_rate"] < 50]
    invisible = [s for s in sorted_segments if s["reach_rate"] == 0]

    return {
        "segments": sorted_segments,
        "reached_audiences": [s["segment"] for s in reached],
        "underserved_audiences": [s["segment"] for s in underserved],
        "invisible_audiences": [s["segment"] for s in invisible],
        "recommendations": _generate_targeting_recommendations(reached, underserved, invisible),
    }


def _generate_targeting_recommendations(reached: list, underserved: list, invisible: list) -> list[dict]:
    """Generate actionable recommendations for each audience gap."""

    recommendations = []

    for segment in invisible:
        recommendations.append({
            "priority": "critical",
            "segment": segment["segment"],
            "action": f"Create targeted content for {segment['segment'].lower()}",
            "detail": (
                f"Your brand is completely invisible to {segment['segment'].lower()} "
                f"({segment['description'].lower()}). These users typically {segment['ai_behavior'].lower()}. "
                f"Add content to your product pages that directly addresses these query patterns."
            ),
        })

    for segment in underserved:
        recommendations.append({
            "priority": "high",
            "segment": segment["segment"],
            "action": f"Improve reach with {segment['segment'].lower()}",
            "detail": (
                f"Your brand appears in only {segment['reach_rate']}% of queries from "
                f"{segment['segment'].lower()}. Optimize product descriptions and FAQ content "
                f"to better match how this audience asks AI for recommendations."
            ),
        })

    for segment in reached:
        recommendations.append({
            "priority": "maintain",
            "segment": segment["segment"],
            "action": f"Maintain visibility with {segment['segment'].lower()}",
            "detail": (
                f"Strong reach at {segment['reach_rate']}%. Continue monitoring accuracy "
                f"for this audience segment to maintain trust."
            ),
        })

    return recommendations
