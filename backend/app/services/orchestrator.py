"""
Multi-Platform Orchestrator
----------------------------
Runs the full T3 pipeline: query all AI platforms → parse responses →
extract claims → detect hallucinations → analyze sources →
generate alerts → update analytics.

This is the main engine that ties everything together.
"""

import asyncio
from datetime import date
from app.database import get_supabase
from app.services.query_engine import run_query_against_ai
from app.services.parser import parse_ai_response
from app.services.hallucination import check_claims
from app.services.source_intelligence import analyze_sources
from app.services.anomaly import detect_anomalies

PLATFORMS = ["chatgpt", "gemini", "perplexity", "copilot"]


async def run_full_scan(brand_id: int) -> dict:
    """Run a complete monitoring scan for a brand across all AI platforms."""

    sb = get_supabase()

    # Get brand info
    brand = sb.table("brands").select("*").eq("id", brand_id).execute()
    if not brand.data:
        return {"error": "Brand not found"}
    brand_name = brand.data[0]["name"]

    # Get queries for this brand
    queries = sb.table("queries").select("*").eq("target_brand_id", brand_id).execute()
    if not queries.data:
        return {"error": "No queries configured for this brand"}

    results = {
        "brand": brand_name,
        "queries_run": 0,
        "responses_collected": 0,
        "claims_extracted": 0,
        "hallucinations_found": 0,
        "alerts_created": 0,
        "platforms_queried": PLATFORMS,
        "details": [],
    }

    # Get ground truth products
    products = sb.table("products").select("*").eq("brand_id", brand_id).execute()
    product_data = products.data or []

    for query in queries.data:
        for platform in PLATFORMS:
            try:
                # Query AI platform
                response_text = await run_query_against_ai(query["query_text"], platform)
                results["queries_run"] += 1

                # Save response
                resp_record = sb.table("ai_responses").insert({
                    "query_id": query["id"],
                    "platform": platform,
                    "response_text": response_text,
                }).execute()
                response_id = resp_record.data[0]["id"]
                results["responses_collected"] += 1

                # Parse claims
                parsed_claims = await parse_ai_response(response_text, brand_name)

                # Check claims against ground truth
                verified_claims = check_claims(parsed_claims, product_data, brand_name)

                # Save claims and create alerts
                for claim in verified_claims:
                    saved = sb.table("claims").insert({
                        "response_id": response_id,
                        "brand_id": brand_id,
                        "claim_type": claim.get("claim_type", "unknown"),
                        "claim_text": claim.get("claim_text", ""),
                        "extracted_value": claim.get("extracted_value", ""),
                        "status": claim.get("status", "accurate"),
                        "ground_truth_value": claim.get("ground_truth_value", ""),
                        "confidence": claim.get("confidence", 0.5),
                    }).execute()
                    results["claims_extracted"] += 1

                    if claim.get("status") == "hallucinated":
                        results["hallucinations_found"] += 1
                        sb.table("alerts").insert({
                            "brand_id": brand_id,
                            "alert_type": "hallucination",
                            "severity": "critical",
                            "title": f"[{platform}] Hallucinated {claim.get('claim_type', 'info')}: {claim.get('claim_text', '')[:80]}",
                            "description": f"Query: \"{query['query_text']}\"\nAI claimed: {claim.get('claim_text', '')}\nGround truth: {claim.get('ground_truth_value', 'N/A')}",
                            "claim_id": saved.data[0]["id"],
                        }).execute()
                        results["alerts_created"] += 1

                # Analyze sources
                source_analysis = await analyze_sources(response_text, brand_name, platform)

                results["details"].append({
                    "query": query["query_text"],
                    "platform": platform,
                    "brand_mentioned": brand_name.lower() in response_text.lower(),
                    "claims_found": len(verified_claims),
                    "hallucinations": len([c for c in verified_claims if c.get("status") == "hallucinated"]),
                    "sources": source_analysis.get("likely_sources", []),
                })

            except Exception as e:
                results["details"].append({
                    "query": query["query_text"],
                    "platform": platform,
                    "error": str(e),
                })

    # Check for anomalies
    anomalies = detect_anomalies(brand_id)
    for anomaly in anomalies:
        sb.table("alerts").insert({
            "brand_id": brand_id,
            "alert_type": anomaly["type"],
            "severity": anomaly["severity"],
            "title": anomaly["title"],
            "description": anomaly["description"],
        }).execute()
        results["alerts_created"] += 1

    # Update daily analytics snapshot
    await _update_daily_snapshot(brand_id, results)

    return results


async def _update_daily_snapshot(brand_id: int, scan_results: dict):
    """Update or create today's analytics snapshot based on scan results."""

    sb = get_supabase()
    today = date.today().isoformat()

    total_queries = scan_results["queries_run"]
    total_mentions = len([d for d in scan_results["details"] if d.get("brand_mentioned")])
    total_claims = scan_results["claims_extracted"]
    hallucinated = scan_results["hallucinations_found"]
    details = scan_results["details"]
    accurate = len([d for d in details if d.get("status") == "accurate"])

    inclusion_rate = round((total_mentions / total_queries * 100), 1) if total_queries > 0 else 0
    accuracy_score = round((accurate / total_claims * 100), 1) if total_claims > 0 else 0
    hallucination_rate = round((hallucinated / total_claims * 100), 1) if total_claims > 0 else 0
    brand_trust_score = round((inclusion_rate * 0.4 + accuracy_score * 0.4 + (100 - hallucination_rate) * 0.2), 1)

    # Upsert (check if exists first)
    existing = (
        sb.table("analytics_snapshots")
        .select("id")
        .eq("brand_id", brand_id)
        .eq("date", today)
        .execute()
    )

    snapshot_data = {
        "brand_id": brand_id,
        "date": today,
        "inclusion_rate": inclusion_rate,
        "accuracy_score": accuracy_score,
        "hallucination_rate": hallucination_rate,
        "brand_trust_score": brand_trust_score,
        "total_queries": total_queries,
        "total_mentions": total_mentions,
        "total_claims": total_claims,
        "accurate_claims": accurate,
        "hallucinated_claims": hallucinated,
    }

    if existing.data:
        sb.table("analytics_snapshots").update(snapshot_data).eq("id", existing.data[0]["id"]).execute()
    else:
        sb.table("analytics_snapshots").insert(snapshot_data).execute()
