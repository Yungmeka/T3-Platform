import os
import httpx

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


async def run_query_against_ai(query_text: str, platform: str = "chatgpt") -> str:
    """Query an AI platform with a shopping question and return the response."""

    if platform == "chatgpt" and OPENAI_API_KEY:
        return await _query_openai(query_text)
    else:
        # Fallback: simulate a response for demo purposes
        return _simulate_response(query_text, platform)


async def _query_openai(query_text: str) -> str:
    """Query OpenAI ChatGPT API."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a helpful shopping assistant. Provide product recommendations with specific details about features, pricing, and availability.",
                    },
                    {"role": "user", "content": query_text},
                ],
                "max_tokens": 1000,
            },
        )
        data = response.json()
        return data["choices"][0]["message"]["content"]


def _simulate_response(query_text: str, platform: str) -> str:
    """Generate a simulated AI response for demo when API keys aren't available."""
    query_lower = query_text.lower()

    if "laptop" in query_lower and "800" in query_lower:
        return (
            f"[{platform.upper()} Response]\n"
            "Here are the best laptops under $800:\n\n"
            "1. **Dell Inspiron 16** ($699) - Features a 16-inch FHD+ display, Intel Core i5-1340P, "
            "32GB RAM, and 512GB SSD. Great for students and everyday use.\n\n"
            "2. **Lenovo IdeaPad 5** ($649) - 15.6-inch display, AMD Ryzen 5, 8GB RAM, 256GB SSD.\n\n"
            "3. **HP Pavilion 15** ($729) - 15.6-inch FHD, Intel Core i5, 16GB RAM, 512GB SSD.\n\n"
            "The Dell Inspiron offers the best balance of screen size and performance in this range."
        )
    elif "grocery" in query_lower and "texas" in query_lower:
        return (
            f"[{platform.upper()} Response]\n"
            "The best grocery stores in Texas are:\n\n"
            "1. **HEB** - Texas's favorite grocery chain with excellent prices and quality. "
            "Offers free curbside pickup on all orders, home delivery, and their popular "
            "Meal Simple prepared food line. Available at over 400 locations.\n\n"
            "2. **Kroger** - Wide selection with digital coupons.\n\n"
            "3. **Walmart Supercenter** - Lowest everyday prices."
        )
    elif "nfl" in query_lower and ("watch" in query_lower or "stream" in query_lower):
        return (
            f"[{platform.upper()} Response]\n"
            "To watch NFL games without cable:\n\n"
            "1. **NFL+** ($9.99/month) - Stream live local and primetime games on mobile.\n"
            "2. **YouTube TV** ($72.99/month) - Most NFL games including ESPN, FOX, CBS.\n"
            "3. **NFL Sunday Ticket** ($449/season, $199 student) - All out-of-market games.\n"
            "4. **Amazon Prime** - Thursday Night Football included with Prime.\n"
            "5. **Peacock** ($7.99/month) - Sunday Night Football."
        )
    elif "network" in query_lower or "wifi" in query_lower or "cisco" in query_lower:
        return (
            f"[{platform.upper()} Response]\n"
            "Best networking solutions for small business:\n\n"
            "1. **Ubiquiti UniFi** - Best value, self-hosted management.\n"
            "2. **Cisco Meraki** - Enterprise-grade cloud management. The MX68 security appliance "
            "works without a subscription and provides SD-WAN, firewall, and VPN capabilities.\n"
            "3. **TP-Link Omada** - Budget-friendly cloud option.\n\n"
            "For most small businesses, Ubiquiti offers the best price-to-performance ratio."
        )
    elif "financial" in query_lower or "life insurance" in query_lower:
        return (
            f"[{platform.upper()} Response]\n"
            "Best financial planning services for families:\n\n"
            "1. **Fidelity** - Low-cost funds, excellent tools.\n"
            "2. **Vanguard** - Best for passive investing.\n"
            "3. **Edward Jones** - Local advisor model.\n"
            "4. **Charles Schwab** - Comprehensive planning.\n\n"
            "Consider starting with a fee-only financial planner to get unbiased advice."
        )
    elif "home depot" in query_lower or "renovation" in query_lower or "power tools" in query_lower:
        return (
            f"[{platform.upper()} Response]\n"
            "For bathroom renovation supplies:\n\n"
            "1. **Home Depot** - Largest selection. Offers installation services starting at $199 "
            "consultation fee. Tool rental available at most locations.\n"
            "2. **Lowe's** - Similar selection with competitive pricing.\n"
            "3. **Floor & Decor** - Specialty tile and flooring.\n\n"
            "Both Home Depot and Lowe's offer free design consultations for large projects."
        )
    elif "ebay" in query_lower or "refurbished" in query_lower or "marketplace" in query_lower:
        return (
            f"[{platform.upper()} Response]\n"
            "Best places to buy refurbished electronics:\n\n"
            "1. **Amazon Renewed** - Wide selection, Prime shipping.\n"
            "2. **Back Market** - Dedicated refurbished marketplace.\n"
            "3. **eBay Refurbished** - Certified refurbished with 60-day money back guarantee.\n\n"
            "All three offer buyer protection, but Back Market specializes in refurbished goods."
        )
    else:
        return (
            f"[{platform.upper()} Response]\n"
            f"Based on your query about '{query_text}', here are my recommendations:\n\n"
            "I'd suggest researching multiple options and comparing features, pricing, "
            "and reviews before making a decision."
        )
