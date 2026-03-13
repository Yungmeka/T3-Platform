"""
Consumer Fact-Checker Engine
----------------------------
Our differentiator: a consumer-facing tool where shoppers can paste
an AI recommendation and get a trust score with verified vs unverified
vs incorrect claims flagged.

This makes T3 two-sided: serves businesses AND protects consumers.
"""

import os
import json
import re
import httpx


async def factcheck_recommendation(recommendation_text: str) -> dict:
    """Fact-check a consumer's AI shopping recommendation."""
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if anthropic_api_key:
        return await _factcheck_with_claude(recommendation_text)
    return _factcheck_basic(recommendation_text)


async def _factcheck_with_claude(recommendation_text: str) -> dict:
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    prompt = f"""You are a product fact-checker. Analyze this AI shopping recommendation that a consumer received.

For each factual claim in the recommendation, classify it as:
- "verified" — this is commonly known to be accurate
- "unverified" — this cannot be confirmed without checking the source
- "likely_incorrect" — this appears to contain an error, hallucination, or outdated info
- "misleading" — technically true but presented in a way that could mislead

AI Recommendation:
{recommendation_text}

Return JSON:
{{
    "trust_score": 0-100,
    "summary": "one sentence summary of overall trustworthiness",
    "claims": [
        {{
            "claim": "the specific claim",
            "status": "verified/unverified/likely_incorrect/misleading",
            "explanation": "why this classification",
            "suggestion": "what the consumer should do"
        }}
    ],
    "overall_advice": "what should the consumer do before making a purchase decision",
    "red_flags": ["list of concerning elements"]
}}

Return ONLY valid JSON."""

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 2000,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["content"][0]["text"]
        except Exception:
            return _factcheck_basic(recommendation_text)

        try:
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return _factcheck_basic(recommendation_text)


def _factcheck_basic(recommendation_text: str) -> dict:
    """Heuristic-based fact-checking without API."""

    text = recommendation_text
    claims = []
    red_flags = []

    # Extract price claims
    prices = re.findall(r'\$(\d+(?:\.\d{2})?)', text)
    for price in prices:
        claims.append({
            "claim": f"Price: ${price}",
            "status": "unverified",
            "explanation": "Prices change frequently. This price should be verified on the retailer's website.",
            "suggestion": "Check the official product page for current pricing.",
        })

    # Check for superlatives (often hallucinated)
    superlatives = re.findall(r'\b(best|fastest|cheapest|most popular|top-rated|#1|number one)\b', text.lower())
    for s in set(superlatives):
        claims.append({
            "claim": f"Product described as '{s}'",
            "status": "unverified",
            "explanation": "Superlative claims from AI should be verified with independent reviews.",
            "suggestion": "Check multiple review sources like Wirecutter, CNET, or Consumer Reports.",
        })
        red_flags.append(f"Uses superlative '{s}' which may not be objectively verifiable")

    # Check for specific feature claims
    feature_patterns = [
        (r'(\d+)\s*GB\s*RAM', "RAM specification"),
        (r'(\d+)\s*(?:GB|TB)\s*(?:SSD|storage)', "Storage specification"),
        (r'(\d+)\s*(?:hour|hr)\s*battery', "Battery life claim"),
        (r'(\d+)\s*(?:inch|")\s*(?:display|screen)', "Display size"),
    ]
    for pattern, label in feature_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            claims.append({
                "claim": f"{label}: {match}",
                "status": "unverified",
                "explanation": f"This {label.lower()} should be verified on the manufacturer's spec sheet.",
                "suggestion": "Visit the manufacturer's product page to confirm exact specifications.",
            })

    # Check for availability claims
    avail_patterns = ["in stock", "available now", "ships free", "free shipping", "free delivery"]
    for pattern in avail_patterns:
        if pattern in text.lower():
            claims.append({
                "claim": f"Availability: '{pattern}'",
                "status": "unverified",
                "explanation": "Availability and shipping terms change in real-time.",
                "suggestion": "Check the retailer directly for current stock and shipping options.",
            })

    # Check for comparison claims
    if any(word in text.lower() for word in ["better than", "outperforms", "beats", "superior to"]):
        claims.append({
            "claim": "Contains comparative performance claims",
            "status": "misleading",
            "explanation": "AI comparisons may not account for recent product updates or all relevant factors.",
            "suggestion": "Read head-to-head comparison reviews from trusted tech publications.",
        })
        red_flags.append("Contains comparative claims that may be oversimplified")

    # Calculate trust score
    if not claims:
        trust_score = 50  # Can't assess without specific claims
    else:
        verified = len([c for c in claims if c["status"] == "verified"])
        incorrect = len([c for c in claims if c["status"] == "likely_incorrect"])
        misleading = len([c for c in claims if c["status"] == "misleading"])
        unverified = len([c for c in claims if c["status"] == "unverified"])
        total = len(claims)

        trust_score = int(
            (verified * 100 + unverified * 50 + misleading * 25 + incorrect * 0) / total
        )

    if not claims:
        claims.append({
            "claim": "General recommendation",
            "status": "unverified",
            "explanation": "This recommendation should be cross-referenced with official product pages and reviews.",
            "suggestion": "Always verify AI recommendations before making a purchase.",
        })

    return {
        "trust_score": trust_score,
        "summary": _get_trust_summary(trust_score),
        "claims": claims,
        "overall_advice": (
            "Always verify AI shopping recommendations by checking official product pages "
            "for current pricing, specifications, and availability. Cross-reference with "
            "independent review sites for unbiased opinions."
        ),
        "red_flags": red_flags if red_flags else ["No major red flags detected"],
    }


def _get_trust_summary(score: int) -> str:
    if score >= 80:
        return "This recommendation appears mostly reliable, but always verify pricing and availability."
    elif score >= 60:
        return "This recommendation has some unverified claims. Cross-check key details before purchasing."
    elif score >= 40:
        return "This recommendation contains several unverifiable claims. Exercise caution and verify independently."
    else:
        return "This recommendation contains potentially inaccurate or misleading information. Verify everything independently."
