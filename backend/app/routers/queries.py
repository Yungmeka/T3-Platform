from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.database import get_supabase
from app.services.query_engine import run_query_against_ai
from app.services.parser import parse_ai_response
from app.services.hallucination import check_claims

router = APIRouter()


class RunQueryRequest(BaseModel):
    query_text: str
    platform: str = "chatgpt"
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
    """Run a live query against an AI platform, parse claims, and check for hallucinations."""
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

    # Get brand products for ground truth
    products = (
        sb.table("products")
        .select("*")
        .eq("brand_id", request.brand_id)
        .execute()
    )

    brand = sb.table("brands").select("*").eq("id", request.brand_id).execute()
    brand_name = brand.data[0]["name"] if brand.data else "Unknown"

    # Parse claims from AI response
    claims = await parse_ai_response(ai_response_text, brand_name)

    # Check claims against ground truth
    verified_claims = check_claims(claims, products.data, brand_name)

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

        # Create alert for hallucinations
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
        "claims": saved_claims,
        "summary": {
            "total_claims": len(saved_claims),
            "accurate": len([c for c in verified_claims if c["status"] == "accurate"]),
            "hallucinated": len([c for c in verified_claims if c["status"] == "hallucinated"]),
            "outdated": len([c for c in verified_claims if c["status"] == "outdated"]),
        },
    }
