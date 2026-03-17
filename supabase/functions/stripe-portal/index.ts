/**
 * stripe-portal — Supabase Edge Function
 * ----------------------------------------
 * Creates a Stripe Customer Portal Session for subscription management.
 * Users can change their plan, update payment details, or cancel from
 * within the hosted Stripe portal UI.
 *
 * Request body (JSON, POST):
 *   {
 *     userId:    string  — required, Supabase user UUID
 *     returnUrl: string  — required, URL to redirect after portal session
 *   }
 *
 * Response (JSON) — success HTTP 200:
 *   { url: string }
 *
 * Response (JSON) — validation failure HTTP 400:
 *   { error: string }
 *
 * Response (JSON) — server error HTTP 500:
 *   { error: string }
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY
 *
 * Supabase-injected environment variables (automatic):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional environment variable:
 *   ALLOWED_ORIGIN  — restricts CORS to a specific origin
 *                     (defaults to https://www.t3tx.com)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRIPE_API_BASE = "https://api.stripe.com/v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":
    Deno.env.get("ALLOWED_ORIGIN") || "https://www.t3tx.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Response helpers
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

// ---------------------------------------------------------------------------
// Stripe helpers (mirrored from stripe-checkout)
// ---------------------------------------------------------------------------

/**
 * Encode a plain JS object as application/x-www-form-urlencoded.
 * Stripe's REST API requires this content type for POST requests.
 * Nested objects are encoded with bracket notation (e.g. key[sub]=value).
 */
function encodeFormData(
  obj: Record<string, unknown>,
  prefix = "",
): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    const fullKey = prefix ? `${prefix}[${key}]` : key;

    if (typeof value === "object" && !Array.isArray(value)) {
      parts.push(encodeFormData(value as Record<string, unknown>, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (typeof item === "object") {
          parts.push(
            encodeFormData(
              item as Record<string, unknown>,
              `${fullKey}[${idx}]`,
            ),
          );
        } else {
          parts.push(
            `${encodeURIComponent(`${fullKey}[${idx}]`)}=${encodeURIComponent(String(item))}`,
          );
        }
      });
    } else {
      parts.push(
        `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`,
      );
    }
  }

  return parts.join("&");
}

/**
 * Execute a request against the Stripe REST API.
 * Returns the parsed JSON response body or throws on non-2xx.
 */
async function stripeRequest(
  path: string,
  method: "GET" | "POST",
  secretKey: string,
  params?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${STRIPE_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Stripe-Version": "2023-10-16",
  };

  const options: RequestInit = { method, headers };

  if (method === "POST" && params) {
    options.body = encodeFormData(params);
  } else if (method === "GET" && params) {
    const qs = encodeFormData(params);
    return stripeRequest(`${path}?${qs}`, "GET", secretKey);
  }

  const resp = await fetch(url, options);
  const data = await resp.json();

  if (!resp.ok) {
    const stripeError = (data as { error?: { message?: string } })?.error;
    throw new Error(
      stripeError?.message ?? `Stripe API error: HTTP ${resp.status}`,
    );
  }

  return data as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// JWT verification
// ---------------------------------------------------------------------------

/**
 * Decode and verify the Bearer JWT from the Authorization header.
 * Returns the Supabase user ID embedded in the token's `sub` claim,
 * or throws if the header is missing or the token is malformed.
 *
 * Note: full cryptographic signature verification is handled upstream
 * by the Supabase API gateway before the request reaches this function.
 * Here we extract the `sub` claim so we can assert the caller's identity
 * against the requested userId without an additional round-trip.
 */
function extractUserIdFromJwt(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT structure");
  }

  // Base64url-decode the payload (second segment).
  const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
  const payload = JSON.parse(payloadJson) as { sub?: string };

  if (!payload.sub) {
    throw new Error("JWT is missing 'sub' claim");
  }

  return payload.sub;
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the stripe_customer_id for the given userId from the subscriptions
 * table using the Supabase REST API with the service-role key, so Row Level
 * Security is bypassed and we are not blocked by the user's own policy.
 *
 * Returns the customer ID string, or null if no row / column exists.
 */
async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const url =
    `${supabaseUrl}/rest/v1/subscriptions` +
    `?user_id=eq.${encodeURIComponent(userId)}` +
    `&select=stripe_customer_id` +
    `&limit=1`;

  const resp = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Supabase REST error (${resp.status}): ${text}`,
    );
  }

  const rows = (await resp.json()) as Array<{
    stripe_customer_id?: string | null;
  }>;

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0].stripe_customer_id ?? null;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

interface PortalInput {
  userId: string;
  returnUrl: string;
}

function validateInput(
  body: Record<string, unknown>,
): { valid: true; data: PortalInput } | { valid: false; error: string } {
  const required = ["userId", "returnUrl"] as const;

  for (const field of required) {
    const value = body[field];
    if (!value || typeof value !== "string" || value.trim() === "") {
      return {
        valid: false,
        error: `Missing or invalid field: '${field}' must be a non-empty string.`,
      };
    }
  }

  // Validate returnUrl is a well-formed URL.
  try {
    new URL((body.returnUrl as string).trim());
  } catch (_err) {
    return { valid: false, error: "Invalid URL in 'returnUrl'." };
  }

  return {
    valid: true,
    data: {
      userId: (body.userId as string).trim(),
      returnUrl: (body.returnUrl as string).trim(),
    },
  };
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

  // ── Environment ─────────────────────────────────────────────────────────────
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("[stripe-portal] STRIPE_SECRET_KEY is not set");
    return errorResponse("Billing service is not configured", 500);
  }

  // ── JWT verification ─────────────────────────────────────────────────────────
  let callerUserId: string;
  try {
    callerUserId = extractUserIdFromJwt(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    console.warn("[stripe-portal] JWT extraction failed:", message);
    return errorResponse("Unauthorized: " + message, 401);
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_err) {
    return errorResponse("Invalid JSON body");
  }

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validation = validateInput(body);
  if (!validation.valid) {
    return errorResponse(validation.error);
  }

  const { userId, returnUrl } = validation.data;

  // ── Authorization — caller must match the requested userId ───────────────────
  if (callerUserId !== userId) {
    console.warn("[stripe-portal] userId mismatch", {
      callerUserId,
      requestedUserId: userId,
    });
    return errorResponse("Forbidden: userId does not match authenticated user", 403);
  }

  console.log("[stripe-portal] Creating portal session", { userId });

  try {
    // ── Resolve Stripe customer ──────────────────────────────────────────────
    const customerId = await getStripeCustomerId(userId);

    if (!customerId) {
      console.warn("[stripe-portal] No stripe_customer_id found", { userId });
      return errorResponse(
        "No billing account found for this user. Complete a checkout first.",
        404,
      );
    }

    console.log("[stripe-portal] Customer resolved", { customerId });

    // ── Create Billing Portal Session ────────────────────────────────────────
    const session = await stripeRequest(
      "/billing_portal/sessions",
      "POST",
      stripeKey,
      {
        customer: customerId,
        return_url: returnUrl,
      },
    );

    const portalUrl = (session as { url: string }).url;

    console.log("[stripe-portal] Portal session created", { userId });

    return jsonResponse({ url: portalUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-portal] Error creating portal session:", message);
    return errorResponse(
      `Failed to create portal session: ${message}`,
      500,
    );
  }
});
