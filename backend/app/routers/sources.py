"""Source Intelligence API routes."""

import asyncio

from fastapi import APIRouter, Query
from app.database import get_supabase
from app.services.source_intelligence import analyze_sources, aggregate_source_intelligence

router = APIRouter()


@router.get("/{brand_id}")
async def get_source_intelligence(brand_id: int, limit: int = Query(default=10)):
    """Analyze what sources AI platforms rely on for a brand."""
    sb = get_supabase()

    brand = sb.table("brands").select("name").eq("id", brand_id).execute()
    if not brand.data:
        return {"error": "Brand not found"}
    brand_name = brand.data[0]["name"]

    # Get recent AI responses for this brand's queries
    queries = sb.table("queries").select("id").eq("target_brand_id", brand_id).execute()
    query_ids = [q["id"] for q in (queries.data or [])]

    if not query_ids:
        return {"error": "No queries found for this brand"}

    responses = (
        sb.table("ai_responses")
        .select("*")
        .in_("query_id", query_ids)
        .order("queried_at", desc=True)
        .limit(limit)
        .execute()
    )

    analyses = await asyncio.gather(
        *[
            analyze_sources(resp["response_text"], brand_name, resp["platform"])
            for resp in (responses.data or [])
        ]
    )
    analyses = list(analyses)

    aggregated = aggregate_source_intelligence(analyses) if analyses else {}

    return {
        "brand": brand_name,
        "responses_analyzed": len(analyses),
        "individual_analyses": analyses[:5],
        "aggregated": aggregated,
    }
