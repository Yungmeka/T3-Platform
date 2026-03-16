/**
 * stripe-checkout — Supabase Edge Function
 * -----------------------------------------
 * Creates a Stripe Checkout Session for plan upgrades. The Stripe REST API
 * is called directly via fetch (no stripe-node) since Deno Edge Functions
 * cannot import npm packages at runtime.
 *
 * Request body (JSON, POST):
 *   {
 *     priceId:    string  — required, Stripe price ID (e.g. 'price_xxx')
 *     userId:     string  — required, Supabase user UUID
 *     userEmail:  string  — required, pre-fills the Stripe checkout form
 *     successUrl: string  — required, redirect after successful payment
 *     cancelUrl:  string  — required, redirect when user cancels
 *   }
 *
 * Response (JSON) — success HTTP 200:
 *   { url: string, sessionId: string }
 *
 * Response (JSON) — validation failure HTTP 400:
 *   { error: string }
 *
 * Response (JSON) — server error HTTP 500:
 *   { error: string }
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY  — Stripe secret key (sk_live_... or sk_test_...)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRIPE_API_BASE = "https://api.stripe.com/v1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
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
            encodeFormData(item as Record<string, unknown>, `${fullKey}[${idx}]`),
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
    // Append query string for GET requests (e.g. customer lookup).
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
// Customer helpers
// ---------------------------------------------------------------------------

/**
 * Look up an existing Stripe customer by email.
 * Returns the first matching customer ID, or null if none found.
 */
async function findCustomerByEmail(
  email: string,
  secretKey: string,
): Promise<string | null> {
  const data = await stripeRequest("/customers/search", "GET", secretKey, {
    query: `email:'${email}'`,
    limit: 1,
  });

  const customers = (data as { data?: Array<{ id: string }> })?.data ?? [];
  return customers.length > 0 ? customers[0].id : null;
}

/**
 * Create a new Stripe customer.
 * Returns the new customer ID.
 */
async function createCustomer(
  email: string,
  userId: string,
  secretKey: string,
): Promise<string> {
  const data = await stripeRequest("/customers", "POST", secretKey, {
    email,
    metadata: { supabase_user_id: userId },
  });

  return (data as { id: string }).id;
}

/**
 * Get or create a Stripe customer for the given email.
 * Always tags the customer with the Supabase user ID in metadata.
 */
async function getOrCreateCustomer(
  email: string,
  userId: string,
  secretKey: string,
): Promise<string> {
  const existing = await findCustomerByEmail(email, secretKey);
  if (existing) return existing;
  return createCustomer(email, userId, secretKey);
}

// ---------------------------------------------------------------------------
// Trial detection
// ---------------------------------------------------------------------------

/**
 * Determine whether this userId corresponds to a user still on a trial.
 * We inspect the SUPABASE_URL / SUPABASE_ANON_KEY environment variables
 * which Supabase injects automatically into every Edge Function.
 * Returns true if the subscriptions row has status = 'trialing'.
 */
async function isUserOnTrial(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // If we cannot reach the DB, default to not adding a trial period so the
  // checkout proceeds without unintended free days.
  if (!supabaseUrl || !serviceRoleKey) return false;

  try {
    const url =
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.trialing&limit=1`;
    const resp = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) return false;

    const rows: unknown[] = await resp.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (_err) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

interface CheckoutInput {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

function validateInput(
  body: Record<string, unknown>,
): { valid: true; data: CheckoutInput } | { valid: false; error: string } {
  const required = ["priceId", "userId", "userEmail", "successUrl", "cancelUrl"] as const;

  for (const field of required) {
    const value = body[field];
    if (!value || typeof value !== "string" || value.trim() === "") {
      return {
        valid: false,
        error: `Missing or invalid field: '${field}' must be a non-empty string.`,
      };
    }
  }

  // Basic email format check.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test((body.userEmail as string).trim())) {
    return { valid: false, error: "Invalid email address in 'userEmail'." };
  }

  // Ensure URLs are valid.
  for (const urlField of ["successUrl", "cancelUrl"] as const) {
    try {
      new URL((body[urlField] as string).trim());
    } catch (_err) {
      return { valid: false, error: `Invalid URL in '${urlField}'.` };
    }
  }

  return {
    valid: true,
    data: {
      priceId: (body.priceId as string).trim(),
      userId: (body.userId as string).trim(),
      userEmail: (body.userEmail as string).trim(),
      successUrl: (body.successUrl as string).trim(),
      cancelUrl: (body.cancelUrl as string).trim(),
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

  // ── Environment ───────────────────────────────────────────────────────────
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("[stripe-checkout] STRIPE_SECRET_KEY is not set");
    return errorResponse("Billing service is not configured", 500);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_err) {
    return errorResponse("Invalid JSON body");
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  const validation = validateInput(body);
  if (!validation.valid) {
    return errorResponse(validation.error);
  }

  const { priceId, userId, userEmail, successUrl, cancelUrl } = validation.data;

  console.log("[stripe-checkout] Creating session", {
    userId,
    priceId,
    userEmail,
  });

  try {
    // ── Get or create Stripe customer ────────────────────────────────────────
    const customerId = await getOrCreateCustomer(userEmail, userId, stripeKey);
    console.log("[stripe-checkout] Customer resolved", { customerId });

    // ── Determine trial eligibility ──────────────────────────────────────────
    const onTrial = await isUserOnTrial(userId);

    // ── Build Checkout Session payload ───────────────────────────────────────
    const sessionParams: Record<string, unknown> = {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { supabase_user_id: userId },
      // Collect billing address for tax compliance.
      billing_address_collection: "auto",
      // Allow promotion codes to be redeemed at checkout.
      allow_promotion_codes: true,
    };

    // Only add trial period when the user currently has a trialing subscription
    // so existing paid users are never given an unintended free period.
    if (onTrial) {
      sessionParams.subscription_data = { trial_period_days: 14 };
      console.log("[stripe-checkout] Trial period applied", { userId });
    }

    // ── Create Checkout Session ───────────────────────────────────────────────
    const session = await stripeRequest(
      "/checkout/sessions",
      "POST",
      stripeKey,
      sessionParams,
    );

    const sessionId = (session as { id: string }).id;
    const sessionUrl = (session as { url: string }).url;

    console.log("[stripe-checkout] Session created", { sessionId });

    return jsonResponse({ url: sessionUrl, sessionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-checkout] Error creating session:", message);
    return errorResponse(`Failed to create checkout session: ${message}`, 500);
  }
});
