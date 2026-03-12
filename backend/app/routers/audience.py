"""Audience Targeting API routes."""

from fastapi import APIRouter
from app.database import get_supabase
from app.services.audience_targeting import analyze_audience_reach

router = APIRouter()


@router.get("/{brand_id}")
def get_audience_analysis(brand_id: int):
    """Analyze which audience segments a brand reaches through AI answers."""
    sb = get_supabase()

    # Get all queries for this brand
    queries = sb.table("queries").select("*").eq("target_brand_id", brand_id).execute()
    query_data = queries.data or []

    # Get AI responses and check which mention the brand
    brand = sb.table("brands").select("name").eq("id", brand_id).execute()
    if not brand.data:
        return {"error": "Brand not found"}
    brand_name = brand.data[0]["name"].lower()

    query_ids = [q["id"] for q in query_data]
    if not query_ids:
        return {"error": "No queries found"}

    responses = sb.table("ai_responses").select("*, queries(category)").in_("query_id", query_ids).execute()

    # Find responses where brand is mentioned
    mentioned_responses = []
    for resp in (responses.data or []):
        if brand_name in (resp.get("response_text", "") or "").lower():
            mentioned_responses.append({
                "query_category": resp.get("queries", {}).get("category", "manual"),
            })

    analysis = analyze_audience_reach(query_data, mentioned_responses)

    return {
        "brand": brand.data[0]["name"],
        **analysis,
    }
