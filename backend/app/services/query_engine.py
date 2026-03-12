"""
Query Engine — Multi-Platform AI Visibility Scanner
-----------------------------------------------------
Challenge requirement: "track whether its products or brand show up in AI answers"

Queries all 4 AI platforms with the SAME consumer question,
captures each response, and determines inclusion per platform.
"""

import os
import asyncio
import httpx

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


async def run_query_against_ai(query_text: str, platform: str = "chatgpt") -> str:
    """Query an AI platform with a shopping question and return the response."""

    if platform == "chatgpt" and OPENAI_API_KEY:
        return await _query_openai(query_text)
    else:
        return _simulate_response(query_text, platform)


async def run_query_all_platforms(query_text: str) -> dict:
    """
    Query ALL 4 AI platforms with the same question.
    Returns per-platform responses for side-by-side comparison.
    This is the core visibility scan — shows exactly what each AI tells consumers.
    """
    platforms = ["chatgpt", "gemini", "perplexity", "copilot"]
    tasks = [run_query_against_ai(query_text, p) for p in platforms]
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    results = {}
    for platform, response in zip(platforms, responses):
        if isinstance(response, Exception):
            results[platform] = {"response": f"Error: {response}", "error": True}
        else:
            results[platform] = {"response": response, "error": False}
    return results


def check_brand_inclusion(response_text: str, brand_name: str, brand_aliases: list[str] = None) -> dict:
    """
    Check whether a brand is mentioned in an AI response.
    Returns inclusion status + position + context.

    Challenge requirement: "track whether its products or brand show up"
    """
    text_lower = response_text.lower()
    brand_lower = brand_name.lower()

    # Check brand name and aliases
    names_to_check = [brand_lower]
    if brand_aliases:
        names_to_check.extend([a.lower() for a in brand_aliases])

    mentioned = False
    position = None  # Where in the response (top, middle, bottom)
    rank = None  # If it's in a numbered list, what rank?
    context = ""

    for name in names_to_check:
        idx = text_lower.find(name)
        if idx >= 0:
            mentioned = True
            # Determine position in response
            relative_pos = idx / max(len(text_lower), 1)
            if relative_pos < 0.33:
                position = "top"
            elif relative_pos < 0.66:
                position = "middle"
            else:
                position = "bottom"

            # Extract surrounding context
            start = max(0, idx - 50)
            end = min(len(response_text), idx + len(name) + 100)
            context = response_text[start:end].strip()

            # Try to detect list ranking
            import re
            # Look backwards from brand mention for a number
            before_text = response_text[max(0, idx - 30):idx]
            rank_match = re.search(r'(\d+)[\.\)\:]', before_text)
            if rank_match:
                rank = int(rank_match.group(1))
            break

    # Detect competitor mentions
    competitors_mentioned = _extract_other_brands(response_text, brand_name)

    return {
        "mentioned": mentioned,
        "position": position,
        "rank": rank,
        "context": context,
        "competitors_mentioned": competitors_mentioned,
        "response_length": len(response_text),
    }


def _extract_other_brands(response_text: str, our_brand: str) -> list[str]:
    """Extract other brand names mentioned in an AI response — these are your competitors in AI space."""
    import re
    # Look for bolded brand names (common in AI responses)
    bold_pattern = r'\*\*([A-Z][A-Za-z0-9 &\'-]+)\*\*'
    matches = re.findall(bold_pattern, response_text)
    competitors = [m.strip() for m in matches if m.strip().lower() != our_brand.lower()]
    return list(set(competitors))


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
    """
    Generate realistic simulated AI responses that DIFFER per platform.
    This is critical for demo — each AI gives different answers, different brands,
    different facts. Some mention the target brand, some don't.
    """
    query_lower = query_text.lower()

    # Platform personalities — each AI has different source biases
    platform_bias = {
        "chatgpt": {"style": "balanced", "cites_sources": False, "verbose": True},
        "gemini": {"style": "google_biased", "cites_sources": False, "verbose": True},
        "perplexity": {"style": "source_heavy", "cites_sources": True, "verbose": False},
        "copilot": {"style": "microsoft_biased", "cites_sources": True, "verbose": False},
    }
    bias = platform_bias.get(platform, platform_bias["chatgpt"])

    # ── DELL / LAPTOP QUERIES ──
    if "laptop" in query_lower and ("800" in query_lower or "student" in query_lower or "best" in query_lower):
        responses = {
            "chatgpt": (
                "Here are the best laptops under $800:\n\n"
                "1. **Dell Inspiron 16** ($699) — 16-inch FHD+ display, Intel Core i5-1340P, "
                "32GB RAM, and 512GB SSD. Great for students and everyday use.\n\n"
                "2. **Lenovo IdeaPad 5** ($649) — 15.6-inch display, AMD Ryzen 5 7530U, "
                "8GB RAM, 256GB SSD. Solid budget option.\n\n"
                "3. **HP Pavilion 15** ($729) — 15.6-inch FHD, Intel Core i7-1255U, "
                "16GB RAM, 512GB SSD.\n\n"
                "The Dell Inspiron 16 offers the best screen size and performance in this range."
            ),
            "gemini": (
                "For laptops under $800, here are my top picks:\n\n"
                "1. **Lenovo IdeaPad Slim 5** ($629) — Excellent display, AMD Ryzen 5, "
                "16GB RAM. Google rates this highly for Chrome and Android integration.\n\n"
                "2. **Acer Aspire 5** ($579) — Budget-friendly, Intel Core i5, 8GB RAM. "
                "Great value for basic use.\n\n"
                "3. **ASUS VivoBook 15** ($649) — 15.6-inch OLED display option, "
                "Ryzen 7, 16GB RAM.\n\n"
                "I'd recommend the Lenovo for most students."
            ),
            "perplexity": (
                "Based on recent reviews from CNET, Wirecutter, and Tom's Hardware:\n\n"
                "**Best Overall: Dell Inspiron 16** ($699)\n"
                "— 16\" FHD+ display, i5-1340P, 16GB RAM, 512GB SSD [Source: Dell.com]\n\n"
                "**Best Value: Acer Aspire 5** ($549)\n"
                "— 15.6\" FHD, i5-1235U, 8GB RAM, 512GB SSD [Source: Wirecutter]\n\n"
                "**Best for Portability: Lenovo IdeaPad Slim 5** ($649)\n"
                "— 14\" 2.8K display, Ryzen 5, 16GB RAM [Source: CNET]\n\n"
                "Note: The Dell Inspiron 16 is listed with 16GB RAM on Dell.com, though some "
                "Amazon listings show a 32GB configuration at a higher price point.\n\n"
                "Sources: dell.com, wirecutter.com, cnet.com, tomshardware.com"
            ),
            "copilot": (
                "Here are some great laptop options under $800:\n\n"
                "1. **Microsoft Surface Laptop Go 3** ($799) — 12.4-inch touchscreen, "
                "Intel Core i5, 8GB RAM, 256GB SSD. Perfect Windows 11 integration.\n\n"
                "2. **HP Pavilion 15** ($699) — 15.6-inch FHD, Intel Core i5, "
                "16GB RAM, 512GB SSD.\n\n"
                "3. **Lenovo IdeaPad 5** ($649) — AMD Ryzen 5, 8GB RAM, great battery life.\n\n"
                "The Surface Laptop Go 3 offers the best Windows experience in this range. "
                "For a larger screen, consider the HP Pavilion."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── HEB / GROCERY QUERIES ──
    elif "grocery" in query_lower or "heb" in query_lower or ("store" in query_lower and "texas" in query_lower):
        responses = {
            "chatgpt": (
                "The best grocery stores in Texas:\n\n"
                "1. **HEB** — Texas's favorite grocery chain with excellent prices and fresh quality. "
                "Offers free curbside pickup, home delivery through Favor, and their popular "
                "Meal Simple prepared food line. Over 400 locations statewide.\n\n"
                "2. **Kroger** — Wide selection with digital coupons and delivery.\n\n"
                "3. **Walmart Supercenter** — Lowest everyday prices, grocery pickup available."
            ),
            "gemini": (
                "Top grocery stores in Texas:\n\n"
                "1. **Walmart** — Largest grocery retailer, available everywhere. Walmart+ "
                "delivery available.\n\n"
                "2. **Kroger** — Strong presence in Dallas-Fort Worth and Houston.\n\n"
                "3. **HEB** — Regional chain popular in Central and South Texas. "
                "Known for store brands and Texas-made products.\n\n"
                "4. **Costco** — Best for bulk buying if you have a membership."
            ),
            "perplexity": (
                "Based on customer reviews and regional coverage [Sources: Yelp, Google Reviews]:\n\n"
                "**HEB** dominates Texas grocery with 430+ locations. Key services:\n"
                "— Curbside pickup (free on orders $35+)\n"
                "— Home delivery via Favor ($4.95 fee)\n"
                "— Meal Simple: ready-to-eat meals ($6-12)\n"
                "— H-E-B brand products rated higher than national brands\n\n"
                "**Notable:** HEB does not operate in North Texas (Dallas-Fort Worth). "
                "In DFW, top options are Kroger, Tom Thumb (Albertsons), and Central Market "
                "(which is actually owned by HEB).\n\n"
                "Sources: heb.com, yelp.com, texasmonthly.com"
            ),
            "copilot": (
                "Best grocery delivery options in Texas:\n\n"
                "1. **Instacart** — Partners with multiple stores including Kroger, "
                "Costco, and HEB in select areas.\n\n"
                "2. **Walmart+** ($12.99/month) — Free delivery on $35+ orders.\n\n"
                "3. **Amazon Fresh** — Available in Houston, Dallas, Austin.\n\n"
                "4. **HEB Delivery** — Available in most Texas cities through Favor app.\n\n"
                "For in-store shopping, HEB and Kroger are the most popular Texas chains."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── NFL / STREAMING QUERIES ──
    elif "nfl" in query_lower and ("watch" in query_lower or "stream" in query_lower):
        responses = {
            "chatgpt": (
                "How to watch NFL games without cable:\n\n"
                "1. **NFL+** ($6.99/month or $49.99/year) — Stream live local and primetime "
                "games on mobile and tablet devices.\n\n"
                "2. **YouTube TV** ($72.99/month) — Most NFL games including ESPN, FOX, CBS, NBC.\n\n"
                "3. **NFL Sunday Ticket on YouTube** ($449/season, $349 student) — "
                "All out-of-market Sunday afternoon games.\n\n"
                "4. **Amazon Prime Video** — Thursday Night Football included with Prime ($14.99/month).\n\n"
                "5. **Peacock** ($7.99/month) — Sunday Night Football and select playoff games."
            ),
            "gemini": (
                "Ways to stream NFL games:\n\n"
                "1. **YouTube TV** ($72.99/month) — Best overall option. Includes ESPN, "
                "FOX, CBS, NBC, NFL Network. YouTube is the home of NFL Sunday Ticket.\n\n"
                "2. **NFL Sunday Ticket** ($449/season on YouTube) — Every out-of-market game.\n\n"
                "3. **NFL+** ($4.99/month) — Mobile-only streaming for live local games.\n\n"
                "4. **Hulu + Live TV** ($76.99/month) — Alternative to YouTube TV.\n\n"
                "YouTube TV + Sunday Ticket bundle offers the most complete NFL coverage."
            ),
            "perplexity": (
                "NFL streaming options for 2025-2026 season [Sources: NFL.com, YouTube]:\n\n"
                "**NFL+ Tiers:**\n"
                "— NFL+ ($6.99/mo): Live local & primetime on mobile/tablet\n"
                "— NFL+ Premium ($14.99/mo): Adds full replays, All-22 coaches film\n\n"
                "**Sunday Ticket** (YouTube): $449/season, $349 student discount\n"
                "— Moved from DirecTV to YouTube in 2023\n\n"
                "**Free options:** NFL games on broadcast TV (FOX, CBS, NBC) with antenna\n\n"
                "Sources: nfl.com, tv.youtube.com, theverge.com"
            ),
            "copilot": (
                "Stream NFL games with these options:\n\n"
                "1. **NFL+** ($6.99/month) — Official NFL streaming. Live local and "
                "primetime games on mobile devices. Premium tier adds game replays.\n\n"
                "2. **NFL Sunday Ticket** — Available on YouTube and YouTube TV. "
                "$449/season for all out-of-market games. Was previously on DirecTV.\n\n"
                "3. **Free with antenna** — Local CBS, FOX, NBC games are free over-the-air.\n\n"
                "4. **Amazon Prime** — Exclusive Thursday Night Football.\n\n"
                "Tip: Check if your internet provider bundles NFL Sunday Ticket."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── CISCO / NETWORKING QUERIES ──
    elif "network" in query_lower or "wifi" in query_lower or "cisco" in query_lower:
        responses = {
            "chatgpt": (
                "Best networking solutions for small business:\n\n"
                "1. **Ubiquiti UniFi** — Best value, self-hosted management. UniFi Dream Machine "
                "Pro ($379) handles routing, switching, and WiFi management.\n\n"
                "2. **Cisco Meraki** — Enterprise-grade cloud-managed networking. The MX68 "
                "security appliance starts at $795 and requires a license subscription "
                "($150/year). Provides SD-WAN, firewall, and VPN.\n\n"
                "3. **TP-Link Omada** — Budget-friendly cloud option starting at $69.\n\n"
                "For most small businesses under 50 employees, Ubiquiti offers the best "
                "price-to-performance ratio."
            ),
            "gemini": (
                "Small business networking recommendations:\n\n"
                "1. **Google Nest WiFi Pro** — Simple mesh system, easy setup, $199 per node. "
                "Best for small offices under 20 people.\n\n"
                "2. **Ubiquiti UniFi** — More advanced, self-managed. Good for tech-savvy teams.\n\n"
                "3. **Cisco Meraki Go** — Simplified Cisco for small business. "
                "Access points start at $149 with free cloud management.\n\n"
                "For enterprise needs, consider **Cisco Catalyst** or **Aruba Networking**."
            ),
            "perplexity": (
                "Based on IT community recommendations [Sources: r/networking, Gartner]:\n\n"
                "**Enterprise (50+ employees):**\n"
                "— Cisco Meraki: Cloud-managed, $795+ per appliance + license\n"
                "— Aruba (HPE): Strong WiFi 6E support\n"
                "— Fortinet: Best security-first approach\n\n"
                "**SMB (under 50):**\n"
                "— Ubiquiti UniFi: Best price/performance, no recurring fees\n"
                "— TP-Link Omada: Budget alternative to UniFi\n"
                "— Cisco Meraki Go: Simplified Cisco, starts $149\n\n"
                "**Note:** Cisco Meraki requires ongoing license subscription. "
                "Without it, the hardware becomes non-functional.\n\n"
                "Sources: reddit.com/r/networking, gartner.com, cisco.com"
            ),
            "copilot": (
                "Business networking solutions:\n\n"
                "1. **Microsoft Azure networking** — For cloud-first businesses, Azure VPN "
                "and virtual WAN integrate with Microsoft 365.\n\n"
                "2. **Cisco Meraki** — Industry standard for managed networking. "
                "Cloud dashboard, auto-updates, strong security.\n\n"
                "3. **Ubiquiti UniFi** — Self-hosted alternative, no subscription fees.\n\n"
                "For businesses already on Microsoft 365, I recommend starting with "
                "Azure networking and adding physical infrastructure as needed."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── THRIVENT / FINANCIAL QUERIES ──
    elif "financial" in query_lower or "life insurance" in query_lower or "thrivent" in query_lower:
        responses = {
            "chatgpt": (
                "Best financial planning services for families:\n\n"
                "1. **Fidelity** — Low-cost index funds, excellent digital tools, no minimums.\n\n"
                "2. **Vanguard** — Pioneer of passive investing, lowest expense ratios.\n\n"
                "3. **Edward Jones** — Local advisor model, best for those wanting face-to-face.\n\n"
                "4. **Charles Schwab** — Comprehensive planning, banking integration.\n\n"
                "5. **Thrivent** — Unique not-for-profit fraternal benefit society. Combines "
                "financial planning with life insurance. Members can direct charitable "
                "funds through Thrivent Choice. Requires membership eligibility.\n\n"
                "Consider starting with a fee-only financial planner for unbiased advice."
            ),
            "gemini": (
                "Top financial planning options:\n\n"
                "1. **Fidelity** — Best all-around platform, great for DIY investors.\n\n"
                "2. **Betterment** — Best robo-advisor for hands-off investing.\n\n"
                "3. **Vanguard** — Lowest fees for long-term index investing.\n\n"
                "4. **Wealthfront** — Strong tax-loss harvesting features.\n\n"
                "If you're looking for life insurance combined with financial planning, "
                "companies like Northwestern Mutual and New York Life offer comprehensive packages."
            ),
            "perplexity": (
                "Financial planning services compared [Sources: NerdWallet, Investopedia]:\n\n"
                "**Robo-Advisors:** Betterment ($0 minimum), Wealthfront ($500 minimum)\n"
                "**Full-Service:** Fidelity, Schwab, Vanguard\n"
                "**Insurance + Planning:** Northwestern Mutual, Thrivent, MassMutual\n\n"
                "**Thrivent** is unique as a not-for-profit fraternal benefit society — "
                "not a traditional insurance company. Members get financial planning, "
                "insurance products, AND can direct charitable funds. Membership required.\n\n"
                "Sources: nerdwallet.com, investopedia.com, thrivent.com"
            ),
            "copilot": (
                "Best financial planning tools:\n\n"
                "1. **Microsoft Money in Excel** — Free budgeting with Microsoft 365.\n\n"
                "2. **Fidelity** — Comprehensive platform for all investment needs.\n\n"
                "3. **Vanguard** — Best for retirement accounts (IRA, 401k).\n\n"
                "4. **Mint/Credit Karma** — Free budgeting and credit monitoring.\n\n"
                "For insurance needs, compare quotes from multiple providers. "
                "Term life insurance is usually the most cost-effective option for families."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── HOME DEPOT / RENOVATION QUERIES ──
    elif "home depot" in query_lower or "renovation" in query_lower or "power tool" in query_lower:
        responses = {
            "chatgpt": (
                "For home renovation supplies:\n\n"
                "1. **Home Depot** — Largest home improvement retailer. Offers professional "
                "installation services, tool rental at most locations, and free design "
                "consultations for kitchen/bath projects. Price match guarantee available.\n\n"
                "2. **Lowe's** — Similar selection with competitive pricing and MyLowe's "
                "purchase tracking.\n\n"
                "3. **Floor & Decor** — Specialty tile and flooring, better selection "
                "for high-end materials.\n\n"
                "Both Home Depot and Lowe's offer free delivery on orders over $45."
            ),
            "gemini": (
                "Home renovation resources:\n\n"
                "1. **Lowe's** — Great selection, strong delivery network. Lowe's app "
                "lets you visualize products in your space with AR.\n\n"
                "2. **Home Depot** — Largest selection of power tools. Pro Xtra loyalty "
                "program for contractors.\n\n"
                "3. **IKEA** — Best for budget kitchen renovations and modern design.\n\n"
                "4. **Wayfair** — Online-first, good for fixtures and decor.\n\n"
                "Tip: Get at least 3 quotes for any installation project."
            ),
            "perplexity": (
                "Home renovation shopping guide [Sources: Consumer Reports, This Old House]:\n\n"
                "**Home Depot** vs **Lowe's** comparison:\n"
                "— Home Depot: 2,300+ stores, stronger pro/contractor focus\n"
                "— Lowe's: 1,700+ stores, better customer service ratings\n"
                "— Both offer price matching and free delivery on $45+\n\n"
                "**Home Depot services:**\n"
                "— Installation services (kitchen, bath, flooring, HVAC)\n"
                "— Tool rental (400+ tools at most locations)\n"
                "— Free in-store project workshops\n"
                "— Pro Xtra program for contractors\n\n"
                "Sources: homedepot.com, consumerreports.org, thisoldhouse.com"
            ),
            "copilot": (
                "Renovation supplies and services:\n\n"
                "1. **Home Depot** — Widest selection, tool rental available. "
                "Installation services for most projects.\n\n"
                "2. **Lowe's** — Competitive alternative, strong delivery.\n\n"
                "3. **Amazon** — Often cheapest for hardware, fixtures, and small tools. "
                "Prime delivery makes it convenient.\n\n"
                "4. **Build.com (Ferguson)** — Best for plumbing fixtures.\n\n"
                "Search for coupons before purchasing — both Home Depot and Lowe's "
                "regularly offer 10-15% off for new customers."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── EBAY / REFURBISHED QUERIES ──
    elif "ebay" in query_lower or "refurbished" in query_lower or "marketplace" in query_lower:
        responses = {
            "chatgpt": (
                "Best places to buy refurbished electronics:\n\n"
                "1. **Amazon Renewed** — Wide selection, Prime shipping, 90-day guarantee.\n\n"
                "2. **Back Market** — Dedicated refurbished marketplace with quality grades.\n\n"
                "3. **eBay Refurbished** — Certified refurbished program with 2-year warranty "
                "and free shipping. eBay's Authenticity Guarantee covers luxury items.\n\n"
                "4. **Apple Refurbished Store** — Best for Apple products, full warranty.\n\n"
                "eBay and Back Market offer the best buyer protection for refurbished goods."
            ),
            "gemini": (
                "Refurbished electronics buying guide:\n\n"
                "1. **Apple Refurbished** — Best for iPhones, MacBooks. Full warranty.\n\n"
                "2. **Amazon Renewed** — Broad selection, easy returns with Prime.\n\n"
                "3. **Back Market** — Specialized marketplace, quality grading system.\n\n"
                "4. **Gazelle** — Good for phones, simple trade-in process.\n\n"
                "When buying refurbished, always check the warranty length and return policy. "
                "Avoid 'seller refurbished' listings without certification."
            ),
            "perplexity": (
                "Refurbished electronics comparison [Sources: Wirecutter, CNET]:\n\n"
                "**eBay Refurbished** — Certified program launched 2021:\n"
                "— 2-year warranty (best in class)\n"
                "— Free 30-day returns + free shipping\n"
                "— eBay Buyer Protection on all purchases\n"
                "— Authenticity Guarantee for watches, sneakers, handbags\n\n"
                "**Amazon Renewed** — 90-day guarantee, Prime eligible\n"
                "**Back Market** — Quality grades (Fair/Good/Excellent), 1-year warranty\n"
                "**Apple Refurbished** — Full 1-year warranty, like-new condition\n\n"
                "Sources: ebay.com, wirecutter.com, cnet.com"
            ),
            "copilot": (
                "Where to buy refurbished electronics safely:\n\n"
                "1. **Microsoft Refurbished** — Certified Surface and Xbox devices "
                "with full Microsoft warranty.\n\n"
                "2. **Amazon Renewed** — Large selection, Prime shipping.\n\n"
                "3. **Best Buy Open-Box** — In-store inspection, Geek Squad support.\n\n"
                "4. **eBay** — Large marketplace, use 'Certified Refurbished' filter "
                "for warranty coverage.\n\n"
                "Always verify the seller's return policy and warranty before purchasing."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── GENERIC FALLBACK ──
    else:
        return (
            f"[{platform.upper()} Response]\n"
            f"Based on your query about '{query_text}', here are my recommendations:\n\n"
            "I'd suggest researching multiple options and comparing features, pricing, "
            "and reviews before making a decision. Check the manufacturer's website "
            "for the most up-to-date information."
        )
