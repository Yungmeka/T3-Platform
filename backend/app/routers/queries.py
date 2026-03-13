"""
Query & Visibility API Routes
-------------------------------
Challenge: "track whether its products or brand show up in AI answers"

Key endpoints:
- POST /run — Single platform query with claim extraction
- POST /scan — Multi-platform visibility scan (the core feature)
- GET /claims — View all extracted claims
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from app.database import get_supabase
from app.services.query_engine import run_query_against_ai, run_query_all_platforms, check_brand_inclusion
from app.services.parser import parse_ai_response
from app.services.hallucination import check_claims
from app.services.source_intelligence import analyze_sources

router = APIRouter()


class RunQueryRequest(BaseModel):
    query_text: str = Field(..., min_length=1, max_length=500)
    platform: str = "chatgpt"
    brand_id: int


class VisibilityScanRequest(BaseModel):
    query_text: str = Field(..., min_length=1, max_length=500)
    brand_id: int


@router.get("/")
def get_queries(brand_id: int = Query(default=None)):
    sb = get_supabase()
    query = sb.table("queries").select("*")
    if brand_id is not None:
        query = query.eq("target_brand_id", brand_id)
    result = query.execute()
    return result.data


@router.get("/responses")
def get_responses(brand_id: int = Query(default=None), limit: int = Query(default=20)):
    sb = get_supabase()
    query = sb.table("ai_responses").select("*, queries(*)")
    result = query.order("queried_at", desc=True).limit(limit).execute()

    if brand_id is not None:
        filtered = [
            r for r in result.data
            if r.get("queries", {}).get("target_brand_id") == brand_id
        ]
        return filtered

    return result.data


@router.get("/claims")
def get_claims(brand_id: int = Query(default=None), status: str = Query(default=None)):
    sb = get_supabase()
    query = sb.table("claims").select("*, ai_responses(platform, queried_at, queries(query_text))")

    if brand_id is not None:
        query = query.eq("brand_id", brand_id)
    if status is not None:
        query = query.eq("status", status)

    result = query.order("detected_at", desc=True).execute()
    return result.data


@router.post("/run")
async def run_query(request: RunQueryRequest):
    """Run a live query against a single AI platform, parse claims, check for hallucinations."""
    sb = get_supabase()

    # Save or find query
    existing = (
        sb.table("queries")
        .select("*")
        .eq("query_text", request.query_text)
        .eq("target_brand_id", request.brand_id)
        .execute()
    )

    if existing.data:
        query_id = existing.data[0]["id"]
    else:
        new_query = (
            sb.table("queries")
            .insert({"query_text": request.query_text, "target_brand_id": request.brand_id, "category": "manual"})
            .execute()
        )
        query_id = new_query.data[0]["id"]

    # Query the AI platform
    ai_response_text = await run_query_against_ai(request.query_text, request.platform)

    # Save response
    response_record = (
        sb.table("ai_responses")
        .insert({"query_id": query_id, "platform": request.platform, "response_text": ai_response_text})
        .execute()
    )
    response_id = response_record.data[0]["id"]

    # Get brand and products for ground truth
    brand = sb.table("brands").select("*").eq("id", request.brand_id).execute()
    brand_name = brand.data[0]["name"] if brand.data else "Unknown"

    products = sb.table("products").select("*").eq("brand_id", request.brand_id).execute()

    # Parse claims from AI response
    claims = await parse_ai_response(ai_response_text, brand_name)

    # Check claims against ground truth
    verified_claims = check_claims(claims, products.data, brand_name)

    # Check brand inclusion
    inclusion = check_brand_inclusion(ai_response_text, brand_name)

    # Save claims and create alerts for hallucinations
    saved_claims = []
    for claim in verified_claims:
        saved = (
            sb.table("claims")
            .insert({
                "response_id": response_id,
                "brand_id": request.brand_id,
                "claim_type": claim["claim_type"],
                "claim_text": claim["claim_text"],
                "extracted_value": claim.get("extracted_value", ""),
                "status": claim["status"],
                "ground_truth_value": claim.get("ground_truth_value", ""),
                "confidence": claim.get("confidence", 0.9),
            })
            .execute()
        )
        saved_claims.append(saved.data[0])

        if claim["status"] == "hallucinated":
            sb.table("alerts").insert({
                "brand_id": request.brand_id,
                "alert_type": "hallucination",
                "severity": "critical",
                "title": f"Hallucinated {claim['claim_type']}: {claim['claim_text'][:80]}",
                "description": f"AI ({request.platform}) claimed: {claim['claim_text']}. Ground truth: {claim.get('ground_truth_value', 'N/A')}",
                "claim_id": saved.data[0]["id"],
            }).execute()

    return {
        "query": request.query_text,
        "platform": request.platform,
        "response": ai_response_text,
        "brand_mentioned": inclusion["mentioned"],
        "brand_position": inclusion["position"],
        "brand_rank": inclusion["rank"],
        "competitors": inclusion["competitors_mentioned"],
        "claims": saved_claims,
        "summary": {
            "total_claims": len(saved_claims),
            "accurate": len([c for c in verified_claims if c["status"] == "accurate"]),
            "hallucinated": len([c for c in verified_claims if c["status"] == "hallucinated"]),
            "outdated": len([c for c in verified_claims if c["status"] == "outdated"]),
        },
    }


@router.post("/scan")
async def visibility_scan(request: VisibilityScanRequest):
    """
    THE CORE FEATURE: Multi-platform visibility scan.

    Sends the same consumer query to ALL 4 AI platforms simultaneously.
    For each platform, shows:
    - Whether the brand is mentioned
    - What position/rank it appears at
    - What competitors are mentioned instead
    - What claims are made (accurate vs hallucinated)
    - What sources AI seems to rely on

    This answers the challenge: "track whether its products or brand show up in AI answers,
    what information the AI seems to rely on"
    """
    sb = get_supabase()

    # Get brand info
    brand = sb.table("brands").select("*").eq("id", request.brand_id).execute()
    if not brand.data:
        raise HTTPException(status_code=404, detail="Brand not found")
    brand_name = brand.data[0]["name"]

    # Get products for ground truth
    products = sb.table("products").select("*").eq("brand_id", request.brand_id).execute()
    product_data = products.data or []

    # Query all 4 platforms simultaneously
    all_responses = await run_query_all_platforms(request.query_text)

    # Analyze each platform's response
    platform_results = []
    all_claims = []
    platforms_mentioned = 0
    total_hallucinations = 0
    all_competitors = []

    for platform, resp_data in all_responses.items():
        if resp_data.get("error"):
            platform_results.append({
                "platform": platform,
                "error": True,
                "mentioned": False,
            })
            continue

        response_text = resp_data["response"]

        # 1. Check inclusion
        inclusion = check_brand_inclusion(response_text, brand_name)
        if inclusion["mentioned"]:
            platforms_mentioned += 1

        # 2. Parse claims
        claims = await parse_ai_response(response_text, brand_name)
        verified_claims = check_claims(claims, product_data, brand_name)

        hallucinated = [c for c in verified_claims if c.get("status") == "hallucinated"]
        total_hallucinations += len(hallucinated)

        # 3. Analyze sources
        source_analysis = await analyze_sources(response_text, brand_name, platform)

        # 4. Track competitors
        all_competitors.extend(inclusion["competitors_mentioned"])

        platform_results.append({
            "platform": platform,
            "response": response_text,
            "mentioned": inclusion["mentioned"],
            "position": inclusion["position"],
            "rank": inclusion["rank"],
            "competitors": inclusion["competitors_mentioned"],
            "claims": [{
                "claim_type": c.get("claim_type", ""),
                "claim_text": c.get("claim_text", ""),
                "status": c.get("status", ""),
                "ground_truth_value": c.get("ground_truth_value", ""),
                "confidence": c.get("confidence", 0),
            } for c in verified_claims],
            "claim_summary": {
                "total": len(verified_claims),
                "accurate": len([c for c in verified_claims if c.get("status") == "accurate"]),
                "hallucinated": len(hallucinated),
            },
            "sources": source_analysis.get("likely_sources", []),
            "content_gaps": source_analysis.get("content_gaps", []),
        })

    # Aggregate competitor frequency
    competitor_freq = {}
    for comp in all_competitors:
        competitor_freq[comp] = competitor_freq.get(comp, 0) + 1
    top_competitors = sorted(competitor_freq.items(), key=lambda x: x[1], reverse=True)

    # Calculate visibility score
    platform_count = len(all_responses) or 1
    inclusion_rate = round((platforms_mentioned / platform_count) * 100, 1)

    return {
        "query": request.query_text,
        "brand": brand_name,
        "visibility_summary": {
            "platforms_checked": platform_count,
            "platforms_mentioned": platforms_mentioned,
            "inclusion_rate": inclusion_rate,
            "total_claims_extracted": sum(p.get("claim_summary", {}).get("total", 0) for p in platform_results if not p.get("error")),
            "total_hallucinations": total_hallucinations,
            "top_competitors": [{"name": c[0], "mentions": c[1]} for c in top_competitors[:5]],
            "verdict": _get_visibility_verdict(inclusion_rate, total_hallucinations),
        },
        "platforms": platform_results,
    }


def _get_visibility_verdict(inclusion_rate: float, hallucinations: int) -> str:
    if inclusion_rate == 0:
        return "INVISIBLE — Your brand does not appear in any AI platform's response. Immediate action needed."
    elif inclusion_rate <= 25:
        return "CRITICAL — Your brand appears on only 1 of 4 platforms. Most consumers using AI will never see you."
    elif inclusion_rate <= 50:
        return "LOW — Your brand appears on half the platforms. Significant audience is being missed."
    elif inclusion_rate <= 75:
        if hallucinations > 2:
            return "VISIBLE BUT INACCURATE — Good inclusion but AI is spreading wrong information about your products."
        return "MODERATE — Appearing on most platforms but not all. Room for improvement."
    else:
        if hallucinations > 0:
            return "STRONG VISIBILITY, ACCURACY ISSUES — Great inclusion across all platforms but hallucinations detected."
        return "EXCELLENT — Strong visibility and accuracy across all AI platforms."
