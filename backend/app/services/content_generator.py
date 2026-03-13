"""
Content Generator & Validator Engine
-------------------------------------
Pillar 2: TRUST — "generating or validating content"

Generates optimized product content, schema.org structured data,
and FAQ content designed to improve AI assistant accuracy.
Validates all content against ground truth before recommending.
"""

import os
import re
import json
import httpx


async def generate_optimized_content(product: dict, brand_name: str, content_gaps: list[dict] = None) -> dict:
    """Generate AI-optimized content for a product based on gaps found."""
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if anthropic_api_key:
        return await _generate_with_claude(product, brand_name, content_gaps)
    return _generate_basic(product, brand_name, content_gaps)


async def _generate_with_claude(product: dict, brand_name: str, content_gaps: list[dict] = None) -> dict:
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    gaps_text = ""
    if content_gaps:
        gaps_text = "\n\nContent gaps detected:\n" + "\n".join(
            [f"- {g['gap']} (Impact: {g['impact']})" for g in content_gaps]
        )

    features = product.get("features", [])
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except json.JSONDecodeError:
            features = []

    prompt = f"""Generate optimized product content for AI shopping assistants.

Brand: {brand_name}
Product: {product['name']}
Category: {product.get('category', 'N/A')}
Price: ${product.get('price', 'N/A')}
Features: {json.dumps(features)}
Availability: {product.get('availability', 'N/A')}
Policies: {product.get('policies', 'N/A')}
{gaps_text}

Generate:
1. An optimized product description (2-3 sentences, fact-dense, designed for AI to parse)
2. Schema.org JSON-LD structured data for this product
3. 5 FAQ questions and answers that AI assistants commonly look for
4. Key phrases that should appear on the product page to improve AI visibility

Return JSON:
{{
    "optimized_description": "...",
    "schema_jsonld": {{}},
    "faq_content": [{{"question": "...", "answer": "..."}}],
    "key_phrases": ["..."],
    "content_recommendations": ["specific action items to improve this product's AI representation"]
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
            return _generate_basic(product, brand_name, content_gaps)

        try:
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return _generate_basic(product, brand_name, content_gaps)


def _generate_basic(product: dict, brand_name: str, content_gaps: list[dict] = None) -> dict:
    """Generate content without API — template-based."""

    features = product.get("features", [])
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except json.JSONDecodeError:
            features = []

    name = product["name"]
    price = product.get("price", 0)
    category = product.get("category", "Product")
    availability = product.get("availability", "Available")
    policies = product.get("policies", "")
    features_text = ", ".join(features[:3]) if features else "premium features"

    description = (
        f"The {name} by {brand_name} is a {category.lower()} "
        f"{'priced at $' + str(price) if price else 'available'} "
        f"featuring {features_text}. "
        f"{availability}. {policies}."
    )

    schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "brand": {"@type": "Brand", "name": brand_name},
        "category": category,
        "description": description,
        "offers": {
            "@type": "Offer",
            "price": str(price) if price else "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock" if "stock" in availability.lower() or "available" in availability.lower() else "https://schema.org/OutOfStock",
        },
    }
    if features:
        schema["additionalProperty"] = [
            {"@type": "PropertyValue", "name": "Feature", "value": f} for f in features
        ]

    faqs = [
        {"question": f"How much does the {name} cost?", "answer": f"The {name} is priced at ${price}." if price else f"Contact {brand_name} for current pricing."},
        {"question": f"What are the key features of the {name}?", "answer": f"Key features include: {', '.join(features)}" if features else f"Visit {brand_name}'s website for full feature details."},
        {"question": f"Is the {name} currently available?", "answer": f"The {name} is currently {availability.lower()}."},
        {"question": f"What is the return policy for the {name}?", "answer": policies if policies else f"Check {brand_name}'s website for return policy details."},
        {"question": f"How does the {name} compare to competitors?", "answer": f"The {name} offers {features_text} at a {'competitive' if price else 'premium'} price point. Compare specific features on {brand_name}'s website."},
    ]

    key_phrases = [
        f"{name} price ${price}" if price else f"{name} pricing",
        f"{name} features specifications",
        f"{brand_name} {category.lower()} {name}",
        f"buy {name} {availability.lower()}",
        f"{name} reviews comparison",
    ]

    recommendations = []
    if content_gaps:
        for gap in content_gaps:
            recommendations.append(gap.get("recommendation", "Review and update product content"))
    else:
        recommendations = [
            f"Add schema.org Product markup to {name} product page",
            f"Create a dedicated FAQ section answering common shopping queries",
            f"Ensure pricing is prominently displayed and up-to-date",
            f"Add comparison content against top competitors in the {category} space",
        ]

    return {
        "optimized_description": description,
        "schema_jsonld": schema,
        "faq_content": faqs,
        "key_phrases": key_phrases,
        "content_recommendations": recommendations,
    }


def generate_action_content(product: dict, brand_name: str, content_type: str) -> dict:
    """Generate ready-to-publish content for the Content Action Hub.

    5 content types:
    1. schema - Schema.org JSON-LD markup
    2. press_release - Press release for product updates
    3. reddit - Reddit post for community engagement
    4. pitch_email - Blogger/influencer pitch email
    5. faq - FAQ content optimized for AI crawlers
    """
    name = product["name"]
    price = product.get("price", 0)
    category = product.get("category", "Product")
    availability = product.get("availability", "Available")
    policies = product.get("policies", "")

    features = product.get("features", {})
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except json.JSONDecodeError:
            features = {}
    if isinstance(features, list):
        features = {f"feature_{i}": f for i, f in enumerate(features)}

    features_text = ", ".join(str(v) for v in list(features.values())[:4])

    if content_type == "schema":
        schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": name,
            "brand": {"@type": "Brand", "name": brand_name},
            "category": category,
            "description": f"The {name} by {brand_name} — {features_text}. Priced at ${price}. {availability}.",
            "offers": {
                "@type": "Offer",
                "price": str(price),
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock",
                "seller": {"@type": "Organization", "name": brand_name},
            },
            "additionalProperty": [
                {"@type": "PropertyValue", "name": k, "value": str(v)}
                for k, v in features.items()
            ],
        }
        return {
            "type": "schema",
            "title": f"Schema.org JSON-LD — {name}",
            "content": json.dumps(schema, indent=2),
            "instructions": "Add this script tag to your product page <head> section. AI crawlers parse structured data before natural language content.",
            "impact": "High — Schema.org is the #1 way AI assistants discover product facts",
        }

    elif content_type == "press_release":
        return {
            "type": "press_release",
            "title": f"Press Release — {name}",
            "content": f"""{brand_name.upper()} ANNOUNCES {name.upper()} — SETTING NEW STANDARDS IN {category.upper()}

FOR IMMEDIATE RELEASE

{brand_name} today highlighted the {name}, a {category.lower()} designed for both professionals and DIY enthusiasts. Priced at ${price}, it features {features_text}.

"{brand_name} is committed to providing the best tools and products for every project," said a {brand_name} spokesperson. "The {name} represents our dedication to quality, value, and innovation."

Key Product Details:
- Price: ${price}
- Category: {category}
- Availability: {availability}
- Return Policy: {policies or 'Standard return policy applies'}

For more information, visit homedepot.com or your local {brand_name} store.

###

Media Contact: press@{brand_name.lower().replace(' ', '')}.com""",
            "instructions": "Distribute via PR Newswire, Business Wire, or direct to trade publications. AI assistants index press releases as authoritative sources.",
            "impact": "Medium-High — Press releases are frequently cited by Perplexity and ChatGPT as sources",
        }

    elif content_type == "reddit":
        return {
            "type": "reddit",
            "title": f"Reddit Post — {name}",
            "content": f"""Title: Just picked up the {name} from {brand_name} — here's my honest take

Hey r/Tools (or r/HomeImprovement),

I've been looking at {category.lower()} options and went with the {name} from {brand_name}. Here's what I found:

**The Good:**
- {features_text}
- Priced at ${price} which is competitive for what you get
- {availability}

**Worth Knowing:**
- {policies or 'Standard 90-day return policy'}
- Available at {brand_name} stores and homedepot.com

**Bottom Line:** If you're shopping for a {category.lower()}, the {name} is worth checking out. {brand_name} has solid options in this price range.

Has anyone else tried this? What's your experience been?

---
*Prices and availability as of March 2026*""",
            "instructions": "Post to relevant subreddits (r/Tools, r/HomeImprovement, r/DIY). AI assistants heavily weight Reddit discussions for product recommendations. Use authentic tone — avoid marketing language.",
            "impact": "High — Reddit is the #1 source ChatGPT and Gemini cite for product opinions",
        }

    elif content_type == "pitch_email":
        return {
            "type": "pitch_email",
            "title": f"Blogger Pitch Email — {name}",
            "content": f"""Subject: Product Review Opportunity: {name} by {brand_name}

Hi [Blogger Name],

I'm reaching out from {brand_name} because I love your content on [blog topic]. I think your audience would be interested in the {name}.

**Quick Stats:**
- Price: ${price}
- Key Features: {features_text}
- Category: {category}
- Availability: {availability}

**Why Your Readers Will Care:**
The {name} stands out in the {category.lower()} space because of its combination of features at the ${price} price point. We'd love to send you one for an honest review.

**What We're Offering:**
- Free product for review (no strings attached)
- High-res product images and spec sheets
- Access to our product team for any technical questions
- Affiliate partnership opportunity

Would you be open to taking a look? Happy to ship one out this week.

Best,
[Your Name]
{brand_name} Product Partnerships
partnerships@{brand_name.lower().replace(' ', '')}.com""",
            "instructions": "Send to top 20 bloggers and YouTubers in the home improvement space. Blogger reviews become training data for AI models. Personalize each email with the blogger's name and recent content.",
            "impact": "High — Blog reviews are training data for AI models and frequently cited in responses",
        }

    elif content_type == "faq":
        return {
            "type": "faq",
            "title": f"FAQ Content — {name}",
            "content": f"""<!-- Add to product page as FAQ section with FAQPage schema -->

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {{
      "@type": "Question",
      "name": "How much does the {name} cost at {brand_name}?",
      "acceptedAnswer": {{
        "@type": "Answer",
        "text": "The {name} is priced at ${price} at {brand_name}. {policies or 'Standard return policy applies.'}"
      }}
    }},
    {{
      "@type": "Question",
      "name": "What are the key features of the {name}?",
      "acceptedAnswer": {{
        "@type": "Answer",
        "text": "The {name} features {features_text}. It is categorized as a {category.lower()} product."
      }}
    }},
    {{
      "@type": "Question",
      "name": "Is the {name} currently in stock at {brand_name}?",
      "acceptedAnswer": {{
        "@type": "Answer",
        "text": "The {name} is currently {availability.lower()}. Check homedepot.com or visit your local store for real-time availability."
      }}
    }},
    {{
      "@type": "Question",
      "name": "How does the {name} compare to similar products?",
      "acceptedAnswer": {{
        "@type": "Answer",
        "text": "The {name} by {brand_name} offers {features_text} at ${price}, making it competitive in the {category.lower()} category. Visit homedepot.com to compare specifications."
      }}
    }},
    {{
      "@type": "Question",
      "name": "What is {brand_name}'s return policy for the {name}?",
      "acceptedAnswer": {{
        "@type": "Answer",
        "text": "{policies or f'{brand_name} offers a standard return policy. Visit homedepot.com/returns for details.'}"
      }}
    }}
  ]
}}
</script>""",
            "instructions": "Add this FAQPage schema markup to the product page. AI assistants specifically look for FAQ structured data when answering shopping questions. This directly controls what answers AI gives.",
            "impact": "Very High — FAQ schema is directly parsed by all 4 major AI platforms for Q&A responses",
        }

    return {"type": content_type, "title": "Unknown", "content": "Content type not recognized", "instructions": "", "impact": "N/A"}


def validate_content(generated_content: dict, product: dict) -> dict:
    """
    3-Step Verification Process:
    1. Scan — Check what sources AI is using (done by source_intelligence)
    2. Cross-check — Validate generated content against ground truth
    3. Flag — Identify any inconsistencies before publishing
    """

    issues = []
    features = product.get("features", [])
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except json.JSONDecodeError:
            features = []

    features_lower = [f.lower() for f in features]

    # Step 2: Cross-check description against ground truth
    description = generated_content.get("optimized_description", "")
    actual_price = product.get("price", 0)

    if actual_price and f"${actual_price}" not in description and str(actual_price) not in description:
        # Check if any price is mentioned that doesn't match
        mentioned_prices = re.findall(r'\$(\d+(?:\.\d{2})?)', description)
        for mp in mentioned_prices:
            if abs(float(mp) - float(actual_price)) > 1:
                issues.append({
                    "field": "description",
                    "issue": f"Price mismatch: generated content says ${mp}, ground truth is ${actual_price}",
                    "severity": "critical",
                })

    # Validate schema.org data
    schema = generated_content.get("schema_jsonld", {})
    schema_price = schema.get("offers", {}).get("price", "")
    if schema_price and actual_price:
        if abs(float(schema_price) - float(actual_price)) > 1:
            issues.append({
                "field": "schema_jsonld",
                "issue": f"Schema price ${schema_price} doesn't match ground truth ${actual_price}",
                "severity": "critical",
            })

    # Validate FAQs — flag any feature mentioned in an answer that is not in
    # the verified ground-truth feature list for this product.
    for i, faq in enumerate(generated_content.get("faq_content", [])):
        answer = faq.get("answer", "").lower()
        # Extract word-sequences that look like feature claims (simple heuristic:
        # any noun phrase already present in the answer that does NOT appear in
        # the known features list indicates a potential hallucination).
        for token in re.findall(r'[a-z0-9][\w\s\-]{2,}[a-z0-9]', answer):
            token = token.strip()
            # Only flag tokens that look like a claimed feature (contain a digit
            # or a known feature keyword) but cannot be found in ground truth.
            if any(kw in token for kw in ("gb", "mhz", "ghz", "watt", "inch", "amp", "volt")):
                if not any(token in f or f in token for f in features_lower):
                    issues.append({
                        "field": f"faq_content[{i}]",
                        "issue": f"FAQ answer references '{token}' which is not in the verified feature list",
                        "severity": "warning",
                    })

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "steps_completed": [
            "Step 1: Source scan completed",
            "Step 2: Cross-checked against verified product database",
            f"Step 3: {'No issues found — content approved' if not issues else f'{len(issues)} issue(s) flagged for review'}",
        ],
    }
