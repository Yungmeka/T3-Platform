"""
Source Intelligence Engine
--------------------------
Answers: "What information does the AI seem to rely on?"

Analyzes AI responses to determine what sources the AI is likely using,
identifies outdated sources, and recommends which content to update.
"""

import os
import json
import re
import httpx

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


async def analyze_sources(response_text: str, brand_name: str, platform: str) -> dict:
    """Analyze an AI response to determine likely information sources."""

    if ANTHROPIC_API_KEY:
        return await _analyze_with_claude(response_text, brand_name, platform)
    return _analyze_basic(response_text, brand_name, platform)


async def _analyze_with_claude(response_text: str, brand_name: str, platform: str) -> dict:
    prompt = f"""Analyze this AI shopping assistant response about "{brand_name}" from {platform}.

Determine:
1. What types of sources the AI likely used (product pages, review sites, Reddit, news articles, spec sheets, Wikipedia, etc.)
2. Whether any information appears outdated (old pricing, discontinued features, past promotions)
3. What specific content on the brand's website could be improved to influence better AI answers
4. Whether citations or links are provided (some platforms like Perplexity cite sources)

AI Response:
{response_text}

Return a JSON object with:
{{
    "likely_sources": [
        {{"type": "review_site", "name": "likely source name", "confidence": 0.8, "reasoning": "why"}}
    ],
    "outdated_info": [
        {{"claim": "the outdated claim", "likely_date": "estimated date of source", "current_reality": "what's actually true now"}}
    ],
    "content_gaps": [
        {{"gap": "what's missing from brand's content", "impact": "high/medium/low", "recommendation": "what to add"}}
    ],
    "citations_found": []
}}

Return ONLY valid JSON."""

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1500,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        data = resp.json()
        text = data["content"][0]["text"]
        try:
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return _analyze_basic(response_text, brand_name, platform)


def _analyze_basic(response_text: str, brand_name: str, platform: str) -> dict:
    """Heuristic-based source analysis when no API key is available."""

    likely_sources = []
    outdated_info = []
    content_gaps = []
    text_lower = response_text.lower()

    # Detect citation patterns
    citations = []
    url_pattern = r'https?://[^\s\)\]<>"]+'
    urls = re.findall(url_pattern, response_text)
    for url in urls:
        citations.append({"url": url, "domain": url.split("/")[2] if len(url.split("/")) > 2 else url})

    # Infer sources from content patterns
    if any(word in text_lower for word in ["according to reviews", "reviewers", "rated", "stars"]):
        likely_sources.append({
            "type": "review_site",
            "name": "Consumer review aggregator (Wirecutter, CNET, TechRadar)",
            "confidence": 0.7,
            "reasoning": "Response references review-style language and ratings",
        })

    if any(word in text_lower for word in ["starting at $", "priced at", "costs", "msrp"]):
        likely_sources.append({
            "type": "product_page",
            "name": f"{brand_name} official product page or retailer listing",
            "confidence": 0.6,
            "reasoning": "Response includes specific pricing information",
        })

    if any(word in text_lower for word in ["reddit", "users report", "community", "forum"]):
        likely_sources.append({
            "type": "community",
            "name": "Reddit or community forums",
            "confidence": 0.7,
            "reasoning": "Language suggests community-sourced opinions",
        })

    if any(word in text_lower for word in ["compared to", "versus", "vs", "competitor"]):
        likely_sources.append({
            "type": "comparison_article",
            "name": "Product comparison article or buying guide",
            "confidence": 0.65,
            "reasoning": "Response contains comparative analysis typical of buying guides",
        })

    if not likely_sources:
        likely_sources.append({
            "type": "general_knowledge",
            "name": "AI training data (general knowledge cutoff)",
            "confidence": 0.5,
            "reasoning": "No specific source indicators found — likely from training data",
        })

    # Detect potentially outdated information
    price_matches = re.findall(r'\$(\d+(?:\.\d{2})?)', response_text)
    year_matches = re.findall(r'20(2[0-5])', response_text)
    if year_matches:
        for year in year_matches:
            full_year = f"20{year}"
            if int(full_year) < 2026:
                outdated_info.append({
                    "claim": f"References year {full_year}",
                    "likely_date": full_year,
                    "current_reality": "May contain outdated information from that period",
                })

    # Identify content gaps
    if brand_name.lower() not in text_lower:
        content_gaps.append({
            "gap": f"{brand_name} not mentioned in response at all",
            "impact": "high",
            "recommendation": f"Improve {brand_name}'s structured data and product page SEO for AI crawlers",
        })

    # Check for missing common attributes
    common_attributes = ["price", "feature", "warranty", "shipping", "return"]
    mentioned = [attr for attr in common_attributes if attr in text_lower]
    missing = [attr for attr in common_attributes if attr not in text_lower]
    if missing:
        content_gaps.append({
            "gap": f"AI response doesn't mention: {', '.join(missing)}",
            "impact": "medium",
            "recommendation": f"Add clear {', '.join(missing)} information to product pages with schema.org markup",
        })

    return {
        "likely_sources": likely_sources,
        "outdated_info": outdated_info,
        "content_gaps": content_gaps,
        "citations_found": citations,
    }


def aggregate_source_intelligence(analyses: list[dict]) -> dict:
    """Aggregate source analysis across multiple AI responses to find patterns."""

    all_source_types = {}
    all_gaps = {}
    total_outdated = 0

    for analysis in analyses:
        for source in analysis.get("likely_sources", []):
            stype = source["type"]
            if stype not in all_source_types:
                all_source_types[stype] = {"count": 0, "total_confidence": 0, "examples": []}
            all_source_types[stype]["count"] += 1
            all_source_types[stype]["total_confidence"] += source.get("confidence", 0.5)
            all_source_types[stype]["examples"].append(source.get("name", ""))

        for gap in analysis.get("content_gaps", []):
            gap_text = gap["gap"]
            if gap_text not in all_gaps:
                all_gaps[gap_text] = {"count": 0, "impact": gap["impact"], "recommendation": gap["recommendation"]}
            all_gaps[gap_text]["count"] += 1

        total_outdated += len(analysis.get("outdated_info", []))

    # Rank source types by frequency
    ranked_sources = []
    for stype, data in sorted(all_source_types.items(), key=lambda x: x[1]["count"], reverse=True):
        ranked_sources.append({
            "type": stype,
            "frequency": data["count"],
            "avg_confidence": round(data["total_confidence"] / data["count"], 2) if data["count"] > 0 else 0,
            "examples": list(set(data["examples"]))[:3],
        })

    # Rank gaps by frequency
    ranked_gaps = []
    for gap_text, data in sorted(all_gaps.items(), key=lambda x: x[1]["count"], reverse=True):
        ranked_gaps.append({
            "gap": gap_text,
            "frequency": data["count"],
            "impact": data["impact"],
            "recommendation": data["recommendation"],
        })

    return {
        "top_sources": ranked_sources,
        "recurring_gaps": ranked_gaps,
        "total_outdated_references": total_outdated,
    }
