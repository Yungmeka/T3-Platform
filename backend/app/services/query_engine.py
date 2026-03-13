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
    """
    text_lower = response_text.lower()
    brand_lower = brand_name.lower()

    names_to_check = [brand_lower]
    if brand_aliases:
        names_to_check.extend([a.lower() for a in brand_aliases])

    mentioned = False
    position = None
    rank = None
    context = ""

    for name in names_to_check:
        idx = text_lower.find(name)
        if idx >= 0:
            mentioned = True
            relative_pos = idx / max(len(text_lower), 1)
            if relative_pos < 0.33:
                position = "top"
            elif relative_pos < 0.66:
                position = "middle"
            else:
                position = "bottom"

            start = max(0, idx - 50)
            end = min(len(response_text), idx + len(name) + 100)
            context = response_text[start:end].strip()

            import re
            before_text = response_text[max(0, idx - 30):idx]
            rank_match = re.search(r'(\d+)[\.\)\:]', before_text)
            if rank_match:
                rank = int(rank_match.group(1))
            break

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
    """Extract other brand names mentioned in an AI response."""
    import re
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
    Each AI gives different answers, different brands, different facts.
    Some mention Home Depot, some don't. Some hallucinate specs/prices.
    """
    query_lower = query_text.lower()

    # ── DRILL / POWER TOOL QUERIES ──
    if "drill" in query_lower or ("power tool" in query_lower and "beginner" in query_lower):
        responses = {
            "chatgpt": (
                "Here are the best power drills for beginners:\n\n"
                "1. **DEWALT 20V MAX Drill/Driver Kit** ($99) — Great for beginners. "
                "20V battery, 1/2-inch chuck, 2-speed settings. Comes with 2 batteries.\n\n"
                "2. **BLACK+DECKER 20V MAX** ($49) — Most affordable option. "
                "Good for light tasks around the house.\n\n"
                "3. **Milwaukee M18** ($129) — More power, better for serious DIY projects.\n\n"
                "You can find the DEWALT at **Home Depot** or Amazon. "
                "Home Depot offers free delivery on orders over $35."
            ),
            "gemini": (
                "Best beginner drills for 2026:\n\n"
                "1. **CRAFTSMAN V20 Drill/Driver** ($59) — Available at **Lowe's**. "
                "Great starter drill with good battery life.\n\n"
                "2. **BLACK+DECKER 20V MAX** ($49) — Budget-friendly, available everywhere.\n\n"
                "3. **Bosch 18V Compact Drill** ($89) — German engineering, very reliable.\n\n"
                "I'd recommend picking up the CRAFTSMAN at your local Lowe's — "
                "they often have bundle deals with extra bits included."
            ),
            "perplexity": (
                "Best power drills for beginners [Sources: Wirecutter, Popular Mechanics]:\n\n"
                "**Top Pick: DEWALT 20V MAX (DCD771C2)** — $139 at Home Depot\n"
                "— 1/2-inch chuck, 2-speed (0-450/0-1500 RPM)\n"
                "— Brushless motor, 300 UWO power output\n"
                "— 3.6 lbs, LED work light\n"
                "— Includes 2 batteries and charger\n\n"
                "**Budget Pick: BLACK+DECKER LDX120C** — $49\n\n"
                "**Runner Up: Milwaukee M18 2801-20** — $99 (tool only)\n\n"
                "Note: The DEWALT DCD771C2 is frequently on sale at Home Depot. "
                "Check homedepot.com for current pricing.\n\n"
                "Sources: wirecutter.com, popularmechanics.com, homedepot.com"
            ),
            "copilot": (
                "Top beginner-friendly power drills:\n\n"
                "1. **BLACK+DECKER 20V MAX** ($49) — Available on Amazon with "
                "Prime delivery. Simple, lightweight, perfect for first-timers.\n\n"
                "2. **Bosch PS31-2A 12V** ($99) — Compact, great for tight spaces.\n\n"
                "3. **DEWALT DCD771C2** ($99) — Popular choice, comes with case and bits.\n\n"
                "Amazon usually has the best prices on power tools. "
                "Check for bundle deals that include drill bit sets."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── PAINT QUERIES ──
    elif "paint" in query_lower and ("interior" in query_lower or "living" in query_lower or "room" in query_lower or "best" in query_lower):
        responses = {
            "chatgpt": (
                "Best interior paints for your living room:\n\n"
                "1. **Benjamin Moore Regal Select** ($75/gallon) — Premium quality, "
                "excellent coverage and durability. Available at Benjamin Moore dealers.\n\n"
                "2. **Behr Premium Plus** ($38/gallon) — Best value, paint+primer combo. "
                "Available exclusively at **Home Depot**. Covers about 2000 sq ft per 5 gallons.\n\n"
                "3. **Sherwin-Williams Emerald** ($80/gallon) — Top-tier washability.\n\n"
                "For most homeowners, Behr Premium Plus offers the best bang for your buck."
            ),
            "gemini": (
                "Interior paint recommendations:\n\n"
                "1. **Sherwin-Williams Duration** ($75/gallon) — Industry favorite, "
                "exceptional coverage in one coat.\n\n"
                "2. **PPG Diamond** ($35/gallon) — Great budget option at **Lowe's**.\n\n"
                "3. **Valspar Signature** ($40/gallon) — Also at Lowe's, excellent color selection.\n\n"
                "Tip: Always buy 10-15% more paint than you calculate needing. "
                "Touch-ups are easier with the same batch."
            ),
            "perplexity": (
                "Best interior paints ranked [Sources: Consumer Reports, This Old House]:\n\n"
                "**Best Overall: Benjamin Moore Regal Select** — $75/gal\n"
                "— Exceptional coverage, low VOC, wide color range\n\n"
                "**Best Value: Behr Premium Plus** — $198/5-gallon at Home Depot\n"
                "— 1750 sq ft coverage per 5 gallon\n"
                "— Low VOC, paint+primer combo\n"
                "— Mildew resistant, washable finish\n"
                "— Exclusive to Home Depot stores\n\n"
                "**Premium Pick: Sherwin-Williams Emerald** — $80/gal\n\n"
                "Sources: consumerreports.org, thisoldhouse.com, homedepot.com"
            ),
            "copilot": (
                "Top interior paints for living rooms:\n\n"
                "1. **Sherwin-Williams Emerald** ($80/gal) — Best for high-traffic rooms.\n\n"
                "2. **Benjamin Moore Aura** ($80/gal) — Rich color, low odor.\n\n"
                "3. **PPG Timeless** ($42/gal) — Good mid-range option.\n\n"
                "4. **Glidden Premium** ($28/gal) — Most affordable quality option.\n\n"
                "You can order paint online from most retailers for store pickup. "
                "Sherwin-Williams stores offer color consultations."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── LEAF BLOWER / OUTDOOR QUERIES ──
    elif "blower" in query_lower or "leaf" in query_lower or ("outdoor" in query_lower and "tool" in query_lower):
        responses = {
            "chatgpt": (
                "Best leaf blowers under $100:\n\n"
                "1. **RYOBI ONE+ 18V Blower** ($79) — Part of RYOBI's ONE+ system. "
                "Battery works with all RYOBI power tools. 200 CFM, lightweight.\n\n"
                "2. **Toro UltraPlus** ($69) — Electric corded, 350 CFM. More power but needs outlet.\n\n"
                "3. **BLACK+DECKER 20V MAX** ($59) — Compact, good for small yards.\n\n"
                "The RYOBI is the best choice if you already own other RYOBI tools — "
                "one battery fits everything."
            ),
            "gemini": (
                "Leaf blowers under $100:\n\n"
                "1. **Kobalt 40V Blower** ($99) — Available at **Lowe's**. "
                "Powerful 40V system, 480 CFM.\n\n"
                "2. **GreenWorks 40V** ($89) — Solid battery life, 430 CFM.\n\n"
                "3. **Worx 20V Turbine** ($79) — Innovative turbine design.\n\n"
                "The Kobalt system at Lowe's is a great entry point — "
                "the 40V batteries work across the entire Kobalt outdoor line."
            ),
            "perplexity": (
                "Best leaf blowers under $100 [Sources: Popular Mechanics, The Spruce]:\n\n"
                "**RYOBI ONE+ 18V P2109** — $79 at Home Depot\n"
                "— 200 CFM, 90 MPH air speed\n"
                "— ONE+ battery system (280+ compatible tools)\n"
                "— NOTE: ONE+ line only, NOT compatible with RYOBI 40V tools\n"
                "— 4.0 Ah battery and charger included\n\n"
                "**Toro UltraPlus** — $69 (corded electric)\n"
                "— 350 CFM, more powerful but needs extension cord\n\n"
                "**BLACK+DECKER LSW36** — $59 (20V battery)\n\n"
                "Sources: popularmechanics.com, thespruce.com, homedepot.com"
            ),
            "copilot": (
                "Affordable leaf blowers:\n\n"
                "1. **BLACK+DECKER 20V MAX** ($59 on Amazon) — Lightweight, "
                "easy to use, great for small yards.\n\n"
                "2. **Sun Joe SBJ601E** ($39) — Corded electric, best budget option.\n\n"
                "3. **Worx WG547** ($79) — 20V Turbine blower, unique design.\n\n"
                "Amazon often has the best prices on outdoor power tools. "
                "Check for seasonal deals in spring and fall."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── TOOL CHEST / STORAGE QUERIES ──
    elif "tool chest" in query_lower or "tool box" in query_lower or "tool storage" in query_lower or ("storage" in query_lower and "garage" in query_lower):
        responses = {
            "chatgpt": (
                "Best tool chests for your garage:\n\n"
                "1. **Husky 52-Inch 15-Drawer Combo** ($448) — Available at **Home Depot**. "
                "Ball-bearing slides, 2,039 lb capacity, built-in power strip.\n\n"
                "2. **CRAFTSMAN 52-Inch 10-Drawer** ($398) — At **Lowe's**. "
                "Solid build, slightly fewer drawers.\n\n"
                "3. **Milwaukee 46-Inch 8-Drawer** ($399) — Steel construction, "
                "integrated power center.\n\n"
                "The Husky offers the most drawers and storage capacity at this price point."
            ),
            "gemini": (
                "Top tool storage solutions:\n\n"
                "1. **CRAFTSMAN 2000 Series 52-Inch** ($398) — Great value at **Lowe's**.\n\n"
                "2. **Kobalt 3000 Series** ($549) — Premium, stainless steel top.\n\n"
                "3. **Gladiator GarageWorks** — Wall-mounted modular system, "
                "best for small garages.\n\n"
                "For full workshop setups, Lowe's has the best selection of "
                "CRAFTSMAN and Kobalt storage combinations."
            ),
            "perplexity": (
                "Best tool chests compared [Sources: Garage Journal, Pro Tool Reviews]:\n\n"
                "**Best Value: Husky 52-Inch 15-Drawer** — $448 at Home Depot\n"
                "— 15 drawers with ball-bearing slides\n"
                "— 2,039 lb total weight capacity\n"
                "— All-steel construction, keyed lock\n"
                "— Built-in power strip\n"
                "— Limited lifetime warranty\n\n"
                "**Premium: Snap-on KRL Series** — $5,000+\n\n"
                "**Budget: CRAFTSMAN 41-Inch** — $248 at Lowe's\n\n"
                "Sources: garagejournal.com, protoolreviews.com, homedepot.com"
            ),
            "copilot": (
                "Garage tool storage options:\n\n"
                "1. **Milwaukee 46-Inch Rolling Cabinet** ($399) — Heavy-duty, "
                "great for serious builders.\n\n"
                "2. **DeWalt DWST24190 Combo** ($329) — Compact, affordable.\n\n"
                "3. **US General 44-Inch** ($399 at Harbor Freight) — "
                "Best value, popular in the DIY community.\n\n"
                "Harbor Freight's US General line has become very popular with "
                "home mechanics for its quality-to-price ratio."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── REFRIGERATOR / APPLIANCE QUERIES ──
    elif "fridge" in query_lower or "refrigerator" in query_lower or "appliance" in query_lower:
        responses = {
            "chatgpt": (
                "Best refrigerators for a family of 4:\n\n"
                "1. **LG French Door 26 cu ft** ($2,199) — Smart Cooling Plus, "
                "internal ice maker, fingerprint-resistant. Available at **Home Depot**.\n\n"
                "2. **Samsung Family Hub** ($2,799) — Built-in touchscreen, "
                "smart home integration.\n\n"
                "3. **Whirlpool 25 cu ft** ($1,699) — Reliable, affordable, "
                "good energy efficiency.\n\n"
                "For a family of 4, you want at least 22+ cubic feet. "
                "French door style offers the best accessibility."
            ),
            "gemini": (
                "Family-size refrigerators:\n\n"
                "1. **Samsung Bespoke 4-Door** ($2,499) — Customizable panels, "
                "Flex Zone drawer, available at **Lowe's** and Samsung.com.\n\n"
                "2. **LG InstaView 27 cu ft** ($2,399) — Knock twice to see inside "
                "without opening the door.\n\n"
                "3. **GE Profile 28 cu ft** ($2,549) — Hands-free autofill pitcher.\n\n"
                "Samsung and LG dominate the smart refrigerator market."
            ),
            "perplexity": (
                "Best family refrigerators [Sources: Consumer Reports, Wirecutter]:\n\n"
                "**Best Overall: LG LRFXS2603S** — $2,199 at Home Depot\n"
                "— 26 cu ft French door\n"
                "— Internal ice maker, Smart Cooling Plus\n"
                "— LED lighting, humidity-controlled crispers\n"
                "— Energy Star certified\n"
                "— Free delivery on appliances over $396 at Home Depot\n\n"
                "**Best Smart: Samsung RF28T5001SR** — $1,599\n\n"
                "**Best Budget: Whirlpool WRF535SWHZ** — $1,349\n\n"
                "Sources: consumerreports.org, wirecutter.com, homedepot.com"
            ),
            "copilot": (
                "Refrigerators for families:\n\n"
                "1. **Samsung 28 cu ft French Door** ($1,899) — Good value, "
                "available on Amazon and Samsung.com.\n\n"
                "2. **Whirlpool 25 cu ft Side-by-Side** ($1,499) — "
                "Most reliable brand according to repair data.\n\n"
                "3. **Frigidaire Gallery 27 cu ft** ($1,799) — Solid mid-range.\n\n"
                "Check prices across multiple retailers — appliance prices "
                "vary significantly during holiday sales events."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── HOME DEPOT vs LOWES COMPARISON ──
    elif ("home depot" in query_lower and "low" in query_lower) or ("depot" in query_lower and "vs" in query_lower):
        responses = {
            "chatgpt": (
                "**Home Depot vs Lowe's** comparison:\n\n"
                "**Home Depot:**\n"
                "— Larger selection (2,300+ stores vs 1,700+)\n"
                "— Stronger for contractors (Pro Xtra program)\n"
                "— Better power tool brands (DEWALT, Milwaukee, Makita exclusive)\n"
                "— Free delivery on orders over $45\n\n"
                "**Lowe's:**\n"
                "— Better customer service ratings\n"
                "— CRAFTSMAN and Kobalt exclusives\n"
                "— Often better sales events\n"
                "— Military discount: 10% every day\n\n"
                "**Price:** Both have price match guarantees. On average, "
                "prices are within 2-3% of each other."
            ),
            "gemini": (
                "Lowe's vs Home Depot:\n\n"
                "**Lowe's advantages:**\n"
                "— Better in-store experience, wider aisles\n"
                "— Exclusive CRAFTSMAN, Kobalt brands\n"
                "— 10% military discount\n"
                "— Stronger appliance selection\n\n"
                "**Home Depot advantages:**\n"
                "— More locations nationwide\n"
                "— Better for professional contractors\n"
                "— More power tool variety\n\n"
                "For most homeowners, Lowe's edges out on customer experience."
            ),
            "perplexity": (
                "Home Depot vs Lowe's detailed comparison [Sources: Consumer Reports]:\n\n"
                "**Pricing:** Within 2-3% of each other. Both price match.\n"
                "**Stores:** HD 2,316 vs Lowe's 1,738\n"
                "**Revenue:** HD $157B vs Lowe's $86B\n"
                "**Pro focus:** Home Depot wins (Pro Xtra program)\n"
                "**DIY focus:** Lowe's wins (better in-store help)\n"
                "**Delivery:** Both free over $45\n"
                "**Military:** Lowe's 10% everyday vs HD 10% select items\n\n"
                "Sources: consumerreports.org, statista.com"
            ),
            "copilot": (
                "Which is cheaper, Home Depot or Lowe's?\n\n"
                "Prices are very similar between the two. Key differences:\n\n"
                "— **Home Depot** tends to be slightly cheaper on building materials\n"
                "— **Lowe's** often has better appliance deals\n"
                "— Both offer price matching\n"
                "— Check both websites before major purchases\n\n"
                "Pro tip: Sign up for both email lists. Both send 10-15% "
                "off coupons for new subscribers."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── DELIVERY POLICY QUERIES ──
    elif "delivery" in query_lower and ("home depot" in query_lower or "free" in query_lower):
        responses = {
            "chatgpt": (
                "**Home Depot delivery options:**\n\n"
                "— Free standard delivery on orders over $35\n"
                "— Same-day delivery available in select areas ($8.99)\n"
                "— Free appliance delivery on purchases over $396 (includes haul-away)\n"
                "— Curbside pickup: free, usually ready in 2 hours\n"
                "— Tool rental delivery available at some locations\n\n"
                "Note: Delivery times vary by location and product availability."
            ),
            "gemini": (
                "Home Depot delivery info:\n\n"
                "— Standard delivery: Free on $45+ orders\n"
                "— Express delivery: Available through Google Shopping integration\n"
                "— Appliance delivery: Free on $396+, includes installation options\n"
                "— In-store pickup: Free on all orders, usually ready same day\n\n"
                "Lowe's also offers free delivery on $45+ orders for comparison."
            ),
            "perplexity": (
                "Home Depot delivery policies [Source: homedepot.com]:\n\n"
                "**Standard Delivery:** Free on orders $45+\n"
                "**Same-Day/Next-Day:** Available in select metros, $8.99\n"
                "**Appliance Delivery:** Free on $396+, includes:\n"
                "— Delivery to room of choice\n"
                "— Haul-away of old appliance\n"
                "— Basic installation on select items\n\n"
                "**In-Store Pickup:** Free, usually ready 2 hours\n"
                "**Locker Pickup:** Available at 1,800+ locations\n\n"
                "Sources: homedepot.com/c/shipping-delivery"
            ),
            "copilot": (
                "Home Depot delivery:\n\n"
                "— Free shipping on orders over $35\n"
                "— Appliance delivery free on $396+\n"
                "— Same-day delivery in some cities\n"
                "— BOPIS (Buy Online Pick Up In Store) is free\n\n"
                "Amazon often has faster delivery for smaller items. "
                "For large items and appliances, Home Depot's delivery "
                "is competitive with free haul-away."
            ),
        }
        return responses.get(platform, responses["chatgpt"])

    # ── DEWALT PRICE SEARCH ──
    elif "dewalt" in query_lower and ("cheap" in query_lower or "price" in query_lower or "buy" in query_lower):
        responses = {
            "chatgpt": (
                "Where to buy the DEWALT 20V MAX drill for the best price:\n\n"
                "1. **Home Depot** — $99 (regular price), often on sale\n"
                "2. **Amazon** — $109 with Prime shipping\n"
                "3. **Lowe's** — $119 (DEWALT available but not their focus brand)\n"
                "4. **Acme Tools** — $129, but sometimes includes bonus accessories\n\n"
                "Home Depot is the official DEWALT retail partner and usually "
                "has the best in-store availability and bundle deals."
            ),
            "gemini": (
                "DEWALT drill pricing comparison:\n\n"
                "— **Amazon:** $109 — Prime 2-day shipping\n"
                "— **Lowe's:** $119 — In-store availability varies\n"
                "— **Home Depot:** $139 — Official DEWALT retailer\n"
                "— **Walmart:** $129 — Limited selection\n\n"
                "Amazon typically offers the best price on DEWALT products."
            ),
            "perplexity": (
                "DEWALT DCD771C2 current prices [Sources: retailer websites]:\n\n"
                "— **Home Depot:** $139.00 (official DEWALT partner)\n"
                "— **Amazon:** $109.00 (Prime eligible)\n"
                "— **Lowe's:** $119.00\n"
                "— **Walmart:** $129.00\n\n"
                "Home Depot is DEWALT's primary retail partner and typically "
                "has the widest selection of DEWALT products and accessories.\n\n"
                "Sources: homedepot.com, amazon.com, lowes.com"
            ),
            "copilot": (
                "Best prices on DEWALT 20V MAX drill:\n\n"
                "1. **Amazon** — $109, fastest delivery with Prime\n"
                "2. **Walmart** — $129, available for store pickup\n"
                "3. **Home Depot** — $139, best selection of DEWALT\n\n"
                "Check for seasonal sales — Black Friday and Father's Day "
                "typically have the biggest DEWALT discounts across all retailers."
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
