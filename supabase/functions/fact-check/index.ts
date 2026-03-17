/**
 * fact-check — Supabase Edge Function
 * -------------------------------------
 * Consumer-facing fact-checker: accepts an AI shopping recommendation and
 * returns a trust score with each claim classified as verified / unverified /
 * likely_incorrect / misleading.
 *
 * Request body (JSON):
 *   {
 *     text:      string  — required, the AI recommendation text to fact-check
 *     brandName: string  — optional, used to tailor the analysis
 *     brand:     object  — optional, full brand object (ignored if text present)
 *     claims:    array   — optional, pre-extracted claims (passed through to Claude)
 *   }
 *
 * Response (JSON):
 *   {
 *     trust_score:    number   (0–100)
 *     summary:        string
 *     claims:         Array<{ claim, status, explanation, suggestion }>
 *     overall_advice: string
 *     red_flags:      string[]
 *   }
 *
 * On validation failure → HTTP 400 with { error: string }
 * On server error       → HTTP 500 with { error: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

function getTrustSummary(score: number): string {
  if (score >= 80) {
    return "This recommendation appears mostly reliable, but always verify pricing and availability.";
  } else if (score >= 60) {
    return "This recommendation has some unverified claims. Cross-check key details before purchasing.";
  } else if (score >= 40) {
    return "This recommendation contains several unverifiable claims. Exercise caution and verify independently.";
  }
  return "This recommendation contains potentially inaccurate or misleading information. Verify everything independently.";
}

// ---------------------------------------------------------------------------
// Heuristic fallback fact-checker (no API required)
// ---------------------------------------------------------------------------

interface Claim {
  claim: string;
  status: "verified" | "unverified" | "likely_incorrect" | "misleading";
  explanation: string;
  suggestion: string;
}

function factcheckBasic(text: string): Record<string, unknown> {
  const claims: Claim[] = [];
  const redFlags: string[] = [];

  // Price claims
  const prices = [...text.matchAll(/\$(\d+(?:\.\d{2})?)/g)].map((m) => m[1]);
  for (const price of prices) {
    claims.push({
      claim: `Price: $${price}`,
      status: "unverified",
      explanation:
        "Prices change frequently. This price should be verified on the retailer's website.",
      suggestion: "Check the official product page for current pricing.",
    });
  }

  // Superlative claims
  const superlativeMatches = [
    ...text.toLowerCase().matchAll(
      /\b(best|fastest|cheapest|most popular|top-rated|#1|number one)\b/g,
    ),
  ].map((m) => m[1]);
  const uniqueSuperlatives = [...new Set(superlativeMatches)];
  for (const s of uniqueSuperlatives) {
    claims.push({
      claim: `Product described as '${s}'`,
      status: "unverified",
      explanation: "Superlative claims from AI should be verified with independent reviews.",
      suggestion: "Check multiple review sources like Wirecutter, CNET, or Consumer Reports.",
    });
    redFlags.push(`Uses superlative '${s}' which may not be objectively verifiable`);
  }

  // Specific technical feature claims
  const featurePatterns: [RegExp, string][] = [
    [/(\d+)\s*GB\s*RAM/gi, "RAM specification"],
    [/(\d+)\s*(?:GB|TB)\s*(?:SSD|storage)/gi, "Storage specification"],
    [/(\d+)\s*(?:hour|hr)\s*battery/gi, "Battery life claim"],
    [/(\d+)\s*(?:inch|")\s*(?:display|screen)/gi, "Display size"],
  ];
  for (const [pattern, label] of featurePatterns) {
    const matches = [...text.matchAll(pattern)].map((m) => m[1]);
    for (const match of matches) {
      claims.push({
        claim: `${label}: ${match}`,
        status: "unverified",
        explanation: `This ${label.toLowerCase()} should be verified on the manufacturer's spec sheet.`,
        suggestion: "Visit the manufacturer's product page to confirm exact specifications.",
      });
    }
  }

  // Availability claims
  const availKeywords = [
    "in stock",
    "available now",
    "ships free",
    "free shipping",
    "free delivery",
  ];
  for (const keyword of availKeywords) {
    if (text.toLowerCase().includes(keyword)) {
      claims.push({
        claim: `Availability: '${keyword}'`,
        status: "unverified",
        explanation: "Availability and shipping terms change in real-time.",
        suggestion: "Check the retailer directly for current stock and shipping options.",
      });
    }
  }

  // Comparative claims
  if (/\b(better than|outperforms|beats|superior to)\b/i.test(text)) {
    claims.push({
      claim: "Contains comparative performance claims",
      status: "misleading",
      explanation:
        "AI comparisons may not account for recent product updates or all relevant factors.",
      suggestion: "Read head-to-head comparison reviews from trusted tech publications.",
    });
    redFlags.push("Contains comparative claims that may be oversimplified");
  }

  // Ensure at least one claim is always present
  if (claims.length === 0) {
    claims.push({
      claim: "General recommendation",
      status: "unverified",
      explanation:
        "This recommendation should be cross-referenced with official product pages and reviews.",
      suggestion: "Always verify AI recommendations before making a purchase.",
    });
  }

  // Compute trust score
  const verified = claims.filter((c) => c.status === "verified").length;
  const incorrect = claims.filter((c) => c.status === "likely_incorrect").length;
  const misleading = claims.filter((c) => c.status === "misleading").length;
  const unverified = claims.filter((c) => c.status === "unverified").length;
  const total = claims.length;

  const trustScore = total === 0
    ? 50
    : Math.round((verified * 100 + unverified * 50 + misleading * 25 + incorrect * 0) / total);

  return {
    trust_score: trustScore,
    summary: getTrustSummary(trustScore),
    claims,
    overall_advice:
      "Always verify AI shopping recommendations by checking official product pages for current pricing, specifications, and availability. Cross-reference with independent review sites for unbiased opinions.",
    red_flags: redFlags.length > 0 ? redFlags : ["No major red flags detected"],
  };
}

// ---------------------------------------------------------------------------
// Claude-powered fact-checker
// ---------------------------------------------------------------------------

async function factcheckWithClaude(
  text: string,
  brandName: string,
  apiKey: string,
): Promise<Record<string, unknown> | null> {
  const brandContext = brandName ? `\nBrand context: ${brandName}` : "";

  const prompt = `You are a product fact-checker. Analyze this AI shopping recommendation that a consumer received.${brandContext}

For each factual claim in the recommendation, classify it as:
- "verified" — this is commonly known to be accurate
- "unverified" — this cannot be confirmed without checking the source
- "likely_incorrect" — this appears to contain an error, hallucination, or outdated info
- "misleading" — technically true but presented in a way that could mislead

AI Recommendation:
${text}

Return JSON:
{
    "trust_score": 0-100,
    "summary": "one sentence summary of overall trustworthiness",
    "claims": [
        {
            "claim": "the specific claim",
            "status": "verified/unverified/likely_incorrect/misleading",
            "explanation": "why this classification",
            "suggestion": "what the consumer should do"
        }
    ],
    "overall_advice": "what should the consumer do before making a purchase decision",
    "red_flags": ["list of concerning elements"]
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
    let responseText: string = data?.content?.[0]?.text ?? "";

    // Strip optional markdown fences
    if (responseText.includes("```")) {
      responseText = responseText.split("```")[1] ?? responseText;
      if (responseText.startsWith("json")) responseText = responseText.slice(4);
    }

    return JSON.parse(responseText.trim()) as Record<string, unknown>;
  } catch (_err) {
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

  // `text` is the primary required field.
  if (
    !body.text ||
    typeof body.text !== "string" ||
    (body.text as string).trim() === ""
  ) {
    return errorResponse(
      "Missing or invalid field: 'text' must be a non-empty string containing the recommendation to fact-check.",
    );
  }

  const text = (body.text as string).trim();

  // brandName is optional; accept from either brandName (string) or brand.name (object)
  let brandName = "";
  if (typeof body.brandName === "string") {
    brandName = body.brandName.trim();
  } else if (
    body.brand &&
    typeof body.brand === "object" &&
    !Array.isArray(body.brand)
  ) {
    const brandObj = body.brand as Record<string, unknown>;
    if (typeof brandObj.name === "string") {
      brandName = brandObj.name.trim();
    }
  }

  // ── Try Claude first, fall back to heuristics ─────────────────────────────
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  if (anthropicKey) {
    const aiResult = await factcheckWithClaude(text, brandName, anthropicKey);
    if (aiResult) {
      return jsonResponse(aiResult);
    }
    // Claude call failed — fall through to heuristic
  }

  // ── Heuristic fallback ────────────────────────────────────────────────────
  return jsonResponse(factcheckBasic(text));
});
