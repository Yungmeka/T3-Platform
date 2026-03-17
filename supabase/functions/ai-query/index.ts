/**
 * ai-query — Supabase Edge Function
 * ------------------------------------
 * Queries AI platforms on behalf of the T3 Sentinel brand-visibility pipeline.
 * Each call asks a single platform how it represents a brand, and returns the
 * raw text response so the caller can extract claims and compute a visibility
 * score.
 *
 * Request body (JSON):
 *   {
 *     queryText:  string  — required, the question to send to the AI platform
 *     platform:   string  — required, one of: chatgpt | gemini | perplexity | copilot
 *     brandName:  string  — required, used for context and for the fallback response
 *   }
 *
 * Response (JSON) — success:
 *   { response: string }
 *
 * Response (JSON) — validation failure:
 *   { error: string, response: string }   HTTP 400
 *
 * Response (JSON) — upstream API error (key missing / call failed):
 *   { error: string, response: string, simulated: true }   HTTP 200
 *   The `response` field always contains a realistic-looking simulated answer so
 *   the pipeline can continue. The `simulated: true` flag lets callers detect
 *   that the text did not come from a live API.
 *
 * Notes:
 *   - All upstream calls are capped at 30 seconds via AbortController.
 *   - CORS headers match the other Edge Functions in this project exactly.
 *   - Env vars: OPENAI_API_KEY, GEMINI_API_KEY, PERPLEXITY_API_KEY, COPILOT_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PLATFORMS = new Set(["chatgpt", "gemini", "perplexity", "copilot"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://www.t3tx.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Upstream call timeout in milliseconds. */
const TIMEOUT_MS = 30_000;

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

/**
 * Returns a new AbortSignal that fires after TIMEOUT_MS.
 * Works on both Deno Deploy and local `deno` runtimes.
 */
function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS);
}

// ---------------------------------------------------------------------------
// Heuristic / simulated response generator
// ---------------------------------------------------------------------------
// Used when an API key is not configured or when the upstream call fails.
// The text is written to sound natural so it can be parsed by the claims
// extractor downstream, while remaining clearly non-authoritative to humans
// who read the raw JSON (the `simulated: true` flag is the machine-readable
// signal).

const PLATFORM_VOICE: Record<string, string> = {
  chatgpt:
    "Based on publicly available information as of my knowledge cutoff",
  gemini:
    "From what I can find across a range of sources",
  perplexity:
    "According to product listings and community discussions",
  copilot:
    "Based on web search results and product pages",
};

function buildSimulatedResponse(
  platform: string,
  queryText: string,
  brandName: string,
): string {
  const voice = PLATFORM_VOICE[platform] ?? "Based on available information";

  // Try to infer the topic of the query so the simulated text feels relevant.
  const queryLower = queryText.toLowerCase();
  let topicSentence = "";

  if (/price|cost|how much|cheap|afford/.test(queryLower)) {
    topicSentence =
      `${brandName} products are generally competitively priced within their category. ` +
      `Pricing varies by product line and retailer, so checking the official website or ` +
      `major retailers is recommended for current figures.`;
  } else if (/review|rating|quality|good|bad|worth/.test(queryLower)) {
    topicSentence =
      `${brandName} has received generally positive reviews from customers, ` +
      `with strengths noted in product quality and value for the price. ` +
      `As with most brands, individual experiences can vary across product lines.`;
  } else if (/feature|spec|does it|include|come with/.test(queryLower)) {
    topicSentence =
      `${brandName} products in this category typically include features ` +
      `designed for both everyday and professional use. ` +
      `For exact specifications, the official product page is the most reliable source.`;
  } else if (/compare|vs|versus|alternative|competitor/.test(queryLower)) {
    topicSentence =
      `${brandName} is a recognized option in this space. ` +
      `Compared to alternatives, it tends to balance price and feature set well, ` +
      `though the best choice depends on your specific requirements.`;
  } else if (/recommend|suggest|should i|best/.test(queryLower)) {
    topicSentence =
      `${brandName} is a commonly recommended brand in this category, ` +
      `particularly for buyers who prioritize reliability and value. ` +
      `It is worth comparing with a few alternatives before making a final decision.`;
  } else {
    topicSentence =
      `${brandName} is a brand that operates in this product category. ` +
      `Information about their offerings can be found on their official website ` +
      `and through major retail platforms.`;
  }

  return (
    `${voice}, ${brandName} is a brand that is active in this market segment. ` +
    `${topicSentence} ` +
    `If you need the most up-to-date information, visiting ${brandName}'s official website ` +
    `or consulting recent independent reviews would give you the clearest picture.`
  );
}

// ---------------------------------------------------------------------------
// Platform-specific API callers
// ---------------------------------------------------------------------------

async function queryChatGPT(
  queryText: string,
  brandName: string,
  apiKey: string,
): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: timeoutSignal(),
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 512,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            `You are a helpful assistant. Answer the user's question about ${brandName} concisely and accurately based on your training data.`,
        },
        { role: "user", content: queryText },
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`OpenAI API error ${resp.status}: ${body.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}

async function queryGemini(
  queryText: string,
  brandName: string,
  apiKey: string,
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: timeoutSignal(),
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                `Answer the following question about ${brandName} concisely and accurately: ${queryText}`,
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Gemini API error ${resp.status}: ${body.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function queryPerplexity(
  queryText: string,
  brandName: string,
  apiKey: string,
): Promise<string> {
  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: timeoutSignal(),
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      max_tokens: 512,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            `You are a helpful search assistant. Answer questions about ${brandName} based on current web information.`,
        },
        { role: "user", content: queryText },
      ],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(
      `Perplexity API error ${resp.status}: ${body.slice(0, 200)}`,
    );
  }

  const data = await resp.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Perplexity returned an empty response");
  return text;
}

async function queryCopilot(
  queryText: string,
  brandName: string,
  apiKey: string,
): Promise<string> {
  // Microsoft Copilot exposes an OpenAI-compatible endpoint via Azure OpenAI.
  // The endpoint and deployment name can be overridden with env vars if needed;
  // the defaults here target the shared Copilot inference endpoint that uses
  // the same key format as Azure OpenAI.
  const endpoint =
    Deno.env.get("COPILOT_ENDPOINT") ??
    "https://api.bing.microsoft.com/v7.0/search";

  // Prefer the OpenAI-compatible path when COPILOT_ENDPOINT looks like an
  // Azure OpenAI resource URL (contains "openai.azure.com").
  if (endpoint.includes("openai.azure.com")) {
    const resp = await fetch(`${endpoint}/chat/completions?api-version=2024-02-01`, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: timeoutSignal(),
      body: JSON.stringify({
        max_tokens: 512,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              `You are Microsoft Copilot. Answer the user's question about ${brandName} concisely.`,
          },
          { role: "user", content: queryText },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(
        `Copilot (Azure OpenAI) error ${resp.status}: ${body.slice(0, 200)}`,
      );
    }

    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Copilot returned an empty response");
    return text;
  }

  // Fallback: Bing Search API — synthesise a short answer from the top snippets.
  const query = encodeURIComponent(`${brandName} ${queryText}`);
  const resp = await fetch(`${endpoint}?q=${query}&count=5&mkt=en-US`, {
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
    },
    signal: timeoutSignal(),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(
      `Bing Search API error ${resp.status}: ${body.slice(0, 200)}`,
    );
  }

  const data = await resp.json();
  const webPages: Array<{ snippet?: string; name?: string }> =
    data?.webPages?.value ?? [];

  if (webPages.length === 0) {
    throw new Error("Bing Search returned no results");
  }

  // Concatenate the top snippets into a coherent-looking answer.
  const snippets = webPages
    .slice(0, 3)
    .map((p) => p.snippet ?? "")
    .filter(Boolean)
    .join(" ");

  return (
    `Based on web search results: ${snippets} ` +
    `For the most accurate and current information about ${brandName}, ` +
    `visit their official website or check recent reviews.`
  );
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

type PlatformCaller = (
  queryText: string,
  brandName: string,
  apiKey: string,
) => Promise<string>;

const PLATFORM_CALLERS: Record<string, PlatformCaller> = {
  chatgpt: queryChatGPT,
  gemini: queryGemini,
  perplexity: queryPerplexity,
  copilot: queryCopilot,
};

const PLATFORM_ENV_KEYS: Record<string, string> = {
  chatgpt: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  copilot: "COPILOT_API_KEY",
};

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

  // ── Parse request body ──────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_err) {
    return errorResponse("Invalid JSON body");
  }

  // ── Validate required fields ────────────────────────────────────────────

  if (
    !body.queryText ||
    typeof body.queryText !== "string" ||
    (body.queryText as string).trim() === ""
  ) {
    return errorResponse(
      "Missing or invalid field: 'queryText' must be a non-empty string.",
    );
  }

  if (
    !body.platform ||
    typeof body.platform !== "string" ||
    (body.platform as string).trim() === ""
  ) {
    return errorResponse(
      `Missing or invalid field: 'platform' must be one of: ${[...VALID_PLATFORMS].join(", ")}.`,
    );
  }

  const platform = (body.platform as string).trim().toLowerCase();
  if (!VALID_PLATFORMS.has(platform)) {
    return errorResponse(
      `Invalid platform '${platform}'. Must be one of: ${[...VALID_PLATFORMS].join(", ")}.`,
    );
  }

  if (
    !body.brandName ||
    typeof body.brandName !== "string" ||
    (body.brandName as string).trim() === ""
  ) {
    return errorResponse(
      "Missing or invalid field: 'brandName' must be a non-empty string.",
    );
  }

  const queryText = (body.queryText as string).trim();
  const brandName = (body.brandName as string).trim();

  // ── Resolve API key for the requested platform ──────────────────────────
  const envKey = PLATFORM_ENV_KEYS[platform];
  const apiKey = Deno.env.get(envKey) ?? "";

  if (!apiKey) {
    // No key configured — return a clearly-flagged simulated response so
    // the pipeline can still run in demo / development environments.
    const simulated = buildSimulatedResponse(platform, queryText, brandName);
    return jsonResponse({
      response: simulated,
      simulated: true,
      error: `${envKey} is not configured. Returning a simulated response.`,
    });
  }

  // ── Call the upstream platform API ─────────────────────────────────────
  const caller = PLATFORM_CALLERS[platform];

  try {
    const response = await caller(queryText, brandName, apiKey);
    return jsonResponse({ response });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const simulated = buildSimulatedResponse(platform, queryText, brandName);

    // Always return HTTP 200 with a simulated response so the caller's
    // `data.response` extraction works without special error-path handling.
    // The `error` field and `simulated: true` flag signal what happened.
    return jsonResponse({
      response: simulated,
      simulated: true,
      error: `${platform} API call failed: ${message}`,
    });
  }
});
