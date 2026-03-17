/**
 * generate-content — Supabase Edge Function
 * ------------------------------------------
 * Generates ready-to-publish content for the T3 Content Action Hub.
 *
 * Request body (JSON):
 *   {
 *     product:     object  — required, must have at least a `name` property
 *     brandName:   string  — required
 *     contentType: string  — required, one of: schema | press_release | reddit | pitch_email | faq
 *   }
 *
 * Response (JSON):
 *   {
 *     type:         string
 *     title:        string
 *     content:      string
 *     instructions: string
 *     impact:       string
 *   }
 *
 * On validation failure → HTTP 400 with { error: string }
 * On server error       → HTTP 500 with { error: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_CONTENT_TYPES = new Set([
  "schema",
  "press_release",
  "reddit",
  "pitch_email",
  "faq",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://www.t3tx.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Verify the Supabase JWT from the Authorization header.
 * Returns the user's UUID if valid, or null if invalid/missing.
 */
async function verifyJWT(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    // Verify the JWT by calling Supabase auth
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serviceRoleKey,
      },
    });

    if (!resp.ok) return null;

    const user = await resp.json();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Safely parse features into a plain key→value object. */
function normaliseFeatures(
  raw: unknown,
): Record<string, string> {
  if (!raw) return {};

  // If it's already a plain object (Supabase JSONB column), use it directly.
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }

  // String → try JSON parse first, then treat as comma-separated list.
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return Object.fromEntries(parsed.map((f, i) => [`feature_${i}`, String(f)]));
      }
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, string>;
      }
    } catch (_) {
      // fall through to comma-split
    }
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return Object.fromEntries(parts.map((f, i) => [`feature_${i}`, f]));
  }

  // Array of strings
  if (Array.isArray(raw)) {
    return Object.fromEntries(
      (raw as unknown[]).map((f, i) => [`feature_${i}`, String(f)]),
    );
  }

  return {};
}

// ---------------------------------------------------------------------------
// Content generators — one per content type (port of Python backend logic)
// ---------------------------------------------------------------------------

function generateSchema(
  product: Record<string, unknown>,
  brandName: string,
  features: Record<string, string>,
  featuresText: string,
): Record<string, unknown> {
  const name = product.name as string;
  const price = product.price ?? 0;
  const category = (product.category as string | undefined) ?? "Product";
  const availability = (product.availability as string | undefined) ?? "Available";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "brand": { "@type": "Brand", "name": brandName },
    "category": category,
    "description": `The ${name} by ${brandName} — ${featuresText}. Priced at $${price}. ${availability}.`,
    "offers": {
      "@type": "Offer",
      "price": String(price),
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": brandName },
    },
    "additionalProperty": Object.entries(features).map(([k, v]) => ({
      "@type": "PropertyValue",
      "name": k,
      "value": String(v),
    })),
  };

  return {
    type: "schema",
    title: `Schema.org JSON-LD — ${name}`,
    content: JSON.stringify(schema, null, 2),
    instructions:
      "Add this script tag to your product page <head> section. AI crawlers parse structured data before natural language content.",
    impact: "High — Schema.org is the #1 way AI assistants discover product facts",
  };
}

function generatePressRelease(
  product: Record<string, unknown>,
  brandName: string,
  featuresText: string,
): Record<string, unknown> {
  const name = product.name as string;
  const price = product.price ?? 0;
  const category = (product.category as string | undefined) ?? "Product";
  const availability = (product.availability as string | undefined) ?? "Available";
  const policies = (product.policies as string | undefined) ?? "";

  const content = `${brandName.toUpperCase()} ANNOUNCES ${name.toUpperCase()} — SETTING NEW STANDARDS IN ${category.toUpperCase()}

FOR IMMEDIATE RELEASE

${brandName} today highlighted the ${name}, a ${category.toLowerCase()} designed for both professionals and DIY enthusiasts. Priced at $${price}, it features ${featuresText}.

"${brandName} is committed to providing the best tools and products for every project," said a ${brandName} spokesperson. "The ${name} represents our dedication to quality, value, and innovation."

Key Product Details:
- Price: $${price}
- Category: ${category}
- Availability: ${availability}
- Return Policy: ${policies || "Standard return policy applies"}

For more information, visit the official ${brandName} website or your local store.

###

Media Contact: press@${brandName.toLowerCase().replace(/\s+/g, "")}.com`;

  return {
    type: "press_release",
    title: `Press Release — ${name}`,
    content,
    instructions:
      "Distribute via PR Newswire, Business Wire, or direct to trade publications. AI assistants index press releases as authoritative sources.",
    impact:
      "Medium-High — Press releases are frequently cited by Perplexity and ChatGPT as sources",
  };
}

function generateReddit(
  product: Record<string, unknown>,
  brandName: string,
  featuresText: string,
): Record<string, unknown> {
  const name = product.name as string;
  const price = product.price ?? 0;
  const category = (product.category as string | undefined) ?? "Product";
  const availability = (product.availability as string | undefined) ?? "Available";
  const policies = (product.policies as string | undefined) ?? "";

  const content = `Title: Just picked up the ${name} from ${brandName} — here's my honest take

Hey r/Tools (or r/HomeImprovement),

I've been looking at ${category.toLowerCase()} options and went with the ${name} from ${brandName}. Here's what I found:

**The Good:**
- ${featuresText}
- Priced at $${price} which is competitive for what you get
- ${availability}

**Worth Knowing:**
- ${policies || "Standard 90-day return policy"}
- Available at ${brandName} stores and online

**Bottom Line:** If you're shopping for a ${category.toLowerCase()}, the ${name} is worth checking out. ${brandName} has solid options in this price range.

Has anyone else tried this? What's your experience been?

---
*Prices and availability as of March 2026*`;

  return {
    type: "reddit",
    title: `Reddit Post — ${name}`,
    content,
    instructions:
      "Post to relevant subreddits (r/Tools, r/HomeImprovement, r/DIY). AI assistants heavily weight Reddit discussions for product recommendations. Use authentic tone — avoid marketing language.",
    impact:
      "High — Reddit is the #1 source ChatGPT and Gemini cite for product opinions",
  };
}

function generatePitchEmail(
  product: Record<string, unknown>,
  brandName: string,
  featuresText: string,
): Record<string, unknown> {
  const name = product.name as string;
  const price = product.price ?? 0;
  const category = (product.category as string | undefined) ?? "Product";
  const availability = (product.availability as string | undefined) ?? "Available";

  const content = `Subject: Product Review Opportunity: ${name} by ${brandName}

Hi [Blogger Name],

I'm reaching out from ${brandName} because I love your content on [blog topic]. I think your audience would be interested in the ${name}.

**Quick Stats:**
- Price: $${price}
- Key Features: ${featuresText}
- Category: ${category}
- Availability: ${availability}

**Why Your Readers Will Care:**
The ${name} stands out in the ${category.toLowerCase()} space because of its combination of features at the $${price} price point. We'd love to send you one for an honest review.

**What We're Offering:**
- Free product for review (no strings attached)
- High-res product images and spec sheets
- Access to our product team for any technical questions
- Affiliate partnership opportunity

Would you be open to taking a look? Happy to ship one out this week.

Best,
[Your Name]
${brandName} Product Partnerships
partnerships@${brandName.toLowerCase().replace(/\s+/g, "")}.com`;

  return {
    type: "pitch_email",
    title: `Blogger Pitch Email — ${name}`,
    content,
    instructions:
      "Send to top 20 bloggers and YouTubers in the home improvement space. Blogger reviews become training data for AI models. Personalize each email with the blogger's name and recent content.",
    impact:
      "High — Blog reviews are training data for AI models and frequently cited in responses",
  };
}

function generateFaq(
  product: Record<string, unknown>,
  brandName: string,
  featuresText: string,
): Record<string, unknown> {
  const name = product.name as string;
  const price = product.price ?? 0;
  const category = (product.category as string | undefined) ?? "Product";
  const availability = (product.availability as string | undefined) ?? "Available";
  const policies = (product.policies as string | undefined) ?? "";

  const returnPolicy = policies ||
    `${brandName} offers a standard return policy. Visit the official website for details.`;

  const content = `<!-- Add to product page as FAQ section with FAQPage schema -->

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does the ${name} cost at ${brandName}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ${name} is priced at $${price} at ${brandName}. ${returnPolicy}"
      }
    },
    {
      "@type": "Question",
      "name": "What are the key features of the ${name}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ${name} features ${featuresText}. It is categorized as a ${category.toLowerCase()} product."
      }
    },
    {
      "@type": "Question",
      "name": "Is the ${name} currently in stock at ${brandName}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ${name} is currently ${availability.toLowerCase()}. Check the official website or visit your local store for real-time availability."
      }
    },
    {
      "@type": "Question",
      "name": "How does the ${name} compare to similar products?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The ${name} by ${brandName} offers ${featuresText} at $${price}, making it competitive in the ${category.toLowerCase()} category."
      }
    },
    {
      "@type": "Question",
      "name": "What is ${brandName}'s return policy for the ${name}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "${returnPolicy}"
      }
    }
  ]
}
</script>`;

  return {
    type: "faq",
    title: `FAQ Content — ${name}`,
    content,
    instructions:
      "Add this FAQPage schema markup to the product page. AI assistants specifically look for FAQ structured data when answering shopping questions. This directly controls what answers AI gives.",
    impact:
      "Very High — FAQ schema is directly parsed by all 4 major AI platforms for Q&A responses",
  };
}

// ---------------------------------------------------------------------------
// Claude-powered generation
// ---------------------------------------------------------------------------

async function generateWithClaude(
  product: Record<string, unknown>,
  brandName: string,
  contentType: string,
  features: Record<string, string>,
  featuresText: string,
  apiKey: string,
): Promise<Record<string, unknown> | null> {
  const name = product.name as string;
  const price = product.price ?? 0;
  const category = (product.category as string | undefined) ?? "Product";
  const availability = (product.availability as string | undefined) ?? "Available";
  const policies = (product.policies as string | undefined) ?? "";

  const contentTypeDescriptions: Record<string, string> = {
    schema: "Schema.org JSON-LD structured data as a <script type='application/ld+json'> block",
    press_release: "a formal press release for immediate distribution to press channels",
    reddit: "an authentic Reddit post for community engagement (not marketing-speak)",
    pitch_email: "a personalized blogger/influencer pitch email with [Blogger Name] placeholder",
    faq: "FAQPage schema markup as a <script type='application/ld+json'> block with 5 Q&A pairs",
  };

  const prompt = `Generate ${contentTypeDescriptions[contentType] || contentType} for this product.

Brand: ${brandName}
Product: ${name}
Category: ${category}
Price: $${price}
Features: ${featuresText || "N/A"}
Availability: ${availability}
Policies: ${policies || "Standard return policy applies"}

Return ONLY a JSON object with these exact fields:
{
  "type": "${contentType}",
  "title": "short descriptive title for this piece of content",
  "content": "the full ready-to-publish content as a string",
  "instructions": "one sentence on how to deploy/use this content",
  "impact": "one sentence on the AI visibility impact"
}

Return ONLY valid JSON. Do not include markdown fences or any text outside the JSON.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    let text: string = data?.content?.[0]?.text ?? "";

    // Strip optional markdown fences
    if (text.includes("```")) {
      text = text.split("```")[1] ?? text;
      if (text.startsWith("json")) text = text.slice(4);
    }

    return JSON.parse(text.trim()) as Record<string, unknown>;
  } catch (_err) {
    // Fall through to template fallback
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // ── Authenticate ─────────────────────────────────────────────────
  const userId = await verifyJWT(req);
  if (!userId) {
    return errorResponse("Unauthorized: valid authentication required", 401);
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_err) {
    return errorResponse("Invalid JSON body");
  }

  // ── Validate required fields ──────────────────────────────────────────────

  // 1. product must exist and be an object
  if (!body.product || typeof body.product !== "object" || Array.isArray(body.product)) {
    return errorResponse(
      "Missing or invalid field: 'product' must be an object with at least a 'name' property.",
    );
  }

  const product = body.product as Record<string, unknown>;

  // 2. product.name must be a non-empty string
  if (
    product.name === undefined ||
    product.name === null ||
    typeof product.name !== "string" ||
    product.name.trim() === ""
  ) {
    return errorResponse(
      "Invalid field: 'product.name' is required and must be a non-empty string.",
    );
  }

  // 3. brandName must be a non-empty string
  if (
    !body.brandName ||
    typeof body.brandName !== "string" ||
    (body.brandName as string).trim() === ""
  ) {
    return errorResponse(
      "Missing or invalid field: 'brandName' must be a non-empty string.",
    );
  }

  // 4. contentType must be one of the valid values
  if (!body.contentType || typeof body.contentType !== "string") {
    return errorResponse(
      `Missing or invalid field: 'contentType' must be one of: ${[...VALID_CONTENT_TYPES].join(", ")}.`,
    );
  }

  const contentType = (body.contentType as string).trim();
  if (!VALID_CONTENT_TYPES.has(contentType)) {
    return errorResponse(
      `Invalid contentType '${contentType}'. Must be one of: ${[...VALID_CONTENT_TYPES].join(", ")}.`,
    );
  }

  const brandName = (body.brandName as string).trim();

  // ── Normalise features ────────────────────────────────────────────────────
  const features = normaliseFeatures(product.features);
  const featuresText = Object.values(features).slice(0, 4).join(", ");

  // ── Try Claude first, fall back to templates ──────────────────────────────
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  if (anthropicKey) {
    const aiResult = await generateWithClaude(
      product,
      brandName,
      contentType,
      features,
      featuresText,
      anthropicKey,
    );
    if (aiResult) {
      return jsonResponse(aiResult);
    }
    // Claude call failed — fall through to template
  }

  // ── Template-based fallback ───────────────────────────────────────────────
  let result: Record<string, unknown>;

  switch (contentType) {
    case "schema":
      result = generateSchema(product, brandName, features, featuresText);
      break;
    case "press_release":
      result = generatePressRelease(product, brandName, featuresText);
      break;
    case "reddit":
      result = generateReddit(product, brandName, featuresText);
      break;
    case "pitch_email":
      result = generatePitchEmail(product, brandName, featuresText);
      break;
    case "faq":
      result = generateFaq(product, brandName, featuresText);
      break;
    default:
      return errorResponse(`Unhandled contentType: ${contentType}`, 500);
  }

  return jsonResponse(result);
});
