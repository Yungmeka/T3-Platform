import os
import json

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


async def parse_ai_response(response_text: str, brand_name: str) -> list[dict]:
    """Extract product claims from an AI response about a specific brand."""

    if ANTHROPIC_API_KEY:
        return await _parse_with_claude(response_text, brand_name)
    else:
        return _parse_basic(response_text, brand_name)


async def _parse_with_claude(response_text: str, brand_name: str) -> list[dict]:
    """Use Claude to extract structured claims from AI response."""
    import httpx

    prompt = f"""Analyze this AI shopping assistant response and extract all factual claims about the brand "{brand_name}".

For each claim, provide:
- claim_type: one of "price", "feature", "availability", "policy", "comparison"
- claim_text: the exact text of the claim
- extracted_value: the specific value stated

Return a JSON array of claims. Only include claims specifically about {brand_name}.

AI Response:
{response_text}

Return ONLY valid JSON array, no other text."""

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
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        data = resp.json()
        text = data["content"][0]["text"]

        # Extract JSON from response
        try:
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return _parse_basic(response_text, brand_name)


def _parse_basic(response_text: str, brand_name: str) -> list[dict]:
    """Basic regex-based claim extraction as fallback."""
    import re

    claims = []
    brand_lower = brand_name.lower()

    if brand_lower not in response_text.lower():
        return claims

    # Find price mentions
    price_pattern = rf'{brand_name}[^$]*?\$(\d+(?:\.\d{{2}})?)'
    for match in re.finditer(price_pattern, response_text, re.IGNORECASE):
        context_start = max(0, match.start() - 20)
        context_end = min(len(response_text), match.end() + 50)
        claims.append({
            "claim_type": "price",
            "claim_text": response_text[context_start:context_end].strip(),
            "extracted_value": f"${match.group(1)}",
        })

    # Find feature mentions near brand name
    sentences = response_text.split(".")
    for sentence in sentences:
        if brand_lower in sentence.lower():
            # Look for RAM
            ram_match = re.search(r'(\d+)\s*GB\s*(?:DDR\d\s*)?RAM', sentence, re.IGNORECASE)
            if ram_match:
                claims.append({
                    "claim_type": "feature",
                    "claim_text": f"{ram_match.group(0)}",
                    "extracted_value": ram_match.group(0),
                })

            # Look for storage
            storage_match = re.search(r'(\d+)\s*(?:GB|TB)\s*SSD', sentence, re.IGNORECASE)
            if storage_match:
                claims.append({
                    "claim_type": "feature",
                    "claim_text": f"{storage_match.group(0)}",
                    "extracted_value": storage_match.group(0),
                })

            # Look for display
            display_match = re.search(r'(\d+(?:\.\d+)?)[- ]inch', sentence, re.IGNORECASE)
            if display_match:
                claims.append({
                    "claim_type": "feature",
                    "claim_text": f"{display_match.group(0)}",
                    "extracted_value": display_match.group(0),
                })

    return claims
