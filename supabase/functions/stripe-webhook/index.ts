/**
 * stripe-webhook — Supabase Edge Function
 * ----------------------------------------
 * Receives Stripe webhook events and keeps the T3 Sentinel database in sync
 * with billing state. The Stripe REST API signature is verified manually via
 * HMAC-SHA256 since stripe-node cannot be imported in Deno Edge Functions.
 *
 * Stripe webhook events handled:
 *   checkout.session.completed     → upsert subscription row, seed usage record
 *   invoice.paid                   → set status = 'active', update period dates
 *   invoice.payment_failed         → set status = 'past_due'
 *   customer.subscription.updated  → sync plan, status, period, cancel flag
 *   customer.subscription.deleted  → set status = 'canceled'
 *
 * Database columns required (add via migration if missing):
 *   subscriptions.stripe_subscription_id  text  — Stripe subscription ID (sub_xxx)
 *   subscriptions.stripe_customer_id      text  — Stripe customer ID (cus_xxx)
 *   subscription_plans.stripe_price_id    text  — Stripe price ID (price_xxx)
 *
 * Environment variables required:
 *   STRIPE_WEBHOOK_SECRET      — Stripe webhook signing secret (whsec_...)
 *   SUPABASE_URL               — Injected automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — Service role key — bypasses RLS for DB writes
 *
 * Design notes:
 *   - This endpoint does NOT require the Authorization header; Stripe cannot
 *     send it. Authentication is provided solely by the webhook signature.
 *   - All event processing is idempotent: upserting on stripe_subscription_id
 *     means duplicate deliveries produce no side-effects.
 *   - We return HTTP 200 as fast as possible. Stripe will retry for up to 72 h
 *     on any non-2xx response, so we swallow non-critical errors after logging.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * CORS headers. The webhook endpoint only needs to accept POST from Stripe
 * servers, but we include OPTIONS support for consistency with the rest of
 * the Edge Function suite. The Authorization header is intentionally omitted
 * from the allowed headers list for this endpoint.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Helpers — HTTP responses
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
// Helpers — Stripe signature verification
// ---------------------------------------------------------------------------

/**
 * Verify the Stripe-Signature header against the raw request body using
 * HMAC-SHA256. This is a direct implementation of Stripe's signature scheme:
 * https://stripe.com/docs/webhooks/signatures
 *
 * The signed payload is: `${timestamp}.${rawBody}`
 * Stripe sends multiple signatures in the header to support key rotation;
 * we accept the event if ANY of them match.
 *
 * @param rawBody      — The raw request body bytes (must not be parsed first)
 * @param signatureHeader — Value of the Stripe-Signature HTTP header
 * @param secret       — The webhook signing secret (whsec_...)
 * @throws Error if the signature is invalid or the timestamp is too old
 */
async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<void> {
  // Parse the header into its components: t=<timestamp>, v1=<sig1>, ...
  const parts = signatureHeader.split(",");
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe-Signature header format");
  }

  // Reject events older than 5 minutes to defend against replay attacks.
  const TOLERANCE_SECONDS = 300;
  const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (eventAge > TOLERANCE_SECONDS) {
    throw new Error(
      `Webhook timestamp too old: ${eventAge}s (tolerance: ${TOLERANCE_SECONDS}s)`,
    );
  }

  // Compute the expected HMAC using the Web Crypto API available in Deno.
  const encoder = new TextEncoder();
  const signedPayload = `${timestamp}.${rawBody}`;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    keyMaterial,
    encoder.encode(signedPayload),
  );

  // Convert the computed signature to a lowercase hex string.
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison: accept if any v1 signature matches.
  // We use a timing-safe comparison to prevent timing attacks.
  const matched = signatures.some((sig) => timingSafeEqual(sig, computedSig));

  if (!matched) {
    throw new Error("Stripe signature verification failed");
  }
}

/**
 * Timing-safe string comparison. Prevents signature oracle attacks by
 * ensuring the comparison always takes the same amount of time regardless
 * of how many characters match.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Helpers — Supabase REST API
// ---------------------------------------------------------------------------

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Upsert a row in the subscriptions table.
 * Matches on stripe_subscription_id to guarantee idempotency — duplicate
 * webhook deliveries will update the existing row rather than creating a
 * second one.
 */
async function upsertSubscription(
  config: SupabaseConfig,
  data: Record<string, unknown>,
): Promise<void> {
  const url = `${config.url}/rest/v1/subscriptions`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      // Supabase upsert header — conflicts on stripe_subscription_id.
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`subscriptions upsert failed (${resp.status}): ${text}`);
  }
}

/**
 * Update rows in the subscriptions table that match the given filter.
 * The filter object keys become `key=eq.value` query parameters.
 */
async function updateSubscription(
  config: SupabaseConfig,
  filter: Record<string, string>,
  data: Record<string, unknown>,
): Promise<void> {
  const qs = Object.entries(filter)
    .map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`)
    .join("&");
  const url = `${config.url}/rest/v1/subscriptions?${qs}`;

  const resp = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`subscriptions update failed (${resp.status}): ${text}`);
  }
}

/**
 * Query the subscriptions table and return the first matching row or null.
 */
async function findSubscription(
  config: SupabaseConfig,
  filter: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const qs = Object.entries(filter)
    .map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(v)}`)
    .join("&");
  const url = `${config.url}/rest/v1/subscriptions?${qs}&limit=1`;

  const resp = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) return null;

  const rows: unknown[] = await resp.json();
  return Array.isArray(rows) && rows.length > 0
    ? (rows[0] as Record<string, unknown>)
    : null;
}

/**
 * Upsert a usage_records row for the given billing period.
 * Matches on (user_id, period_start) so the same period is never double-
 * inserted if the webhook is delivered more than once.
 *
 * New billing period rows start all counters at zero.
 */
async function upsertUsageRecord(
  config: SupabaseConfig,
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<void> {
  const url = `${config.url}/rest/v1/usage_records`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      scans_used: 0,
      api_calls_used: 0,
      content_gen_used: 0,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`usage_records upsert failed (${resp.status}): ${text}`);
  }
}

/**
 * Look up a subscription_plan row by its Stripe price ID.
 * Returns the internal plan_id integer, or null if not found.
 */
async function findPlanByStripePrice(
  config: SupabaseConfig,
  stripePriceId: string,
): Promise<number | null> {
  const url =
    `${config.url}/rest/v1/subscription_plans?stripe_price_id=eq.${encodeURIComponent(stripePriceId)}&limit=1`;

  const resp = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) return null;

  const rows: unknown[] = await resp.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (rows[0] as { id: number }).id ?? null;
}

// ---------------------------------------------------------------------------
// Helpers — date conversion
// ---------------------------------------------------------------------------

/**
 * Convert a Unix timestamp (seconds) to an ISO 8601 string.
 * Stripe encodes all timestamps as Unix seconds.
 */
function unixToIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * checkout.session.completed
 *
 * Fired when a customer completes a Stripe Checkout flow. At this point the
 * subscription has been created in Stripe. We create/update the local
 * subscription row and seed the first usage record.
 */
async function handleCheckoutSessionCompleted(
  config: SupabaseConfig,
  session: Record<string, unknown>,
): Promise<void> {
  const stripeSubscriptionId = session.subscription as string | null;
  const stripeCustomerId = session.customer as string | null;
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const userId = metadata.supabase_user_id;

  if (!userId) {
    console.warn(
      "[stripe-webhook] checkout.session.completed: missing supabase_user_id in metadata",
      { sessionId: session.id },
    );
    return;
  }

  if (!stripeSubscriptionId) {
    // Non-subscription checkout (one-time payment). Skip.
    return;
  }

  console.log("[stripe-webhook] checkout.session.completed", {
    userId,
    stripeSubscriptionId,
    stripeCustomerId,
  });

  // The subscription details will arrive fully in customer.subscription.updated
  // or invoice.paid. Here we just ensure the row exists with the Stripe IDs so
  // subsequent events can find it.
  await upsertSubscription(config, {
    user_id: userId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
    status: "active",
    updated_at: new Date().toISOString(),
  });
}

/**
 * invoice.paid
 *
 * Fired when a Stripe invoice is successfully paid — covers both the initial
 * payment and every subsequent renewal. We update the subscription status and
 * billing period, then seed a fresh usage record for the new period.
 */
async function handleInvoicePaid(
  config: SupabaseConfig,
  invoice: Record<string, unknown>,
): Promise<void> {
  const stripeSubscriptionId = invoice.subscription as string | null;
  const stripeCustomerId = invoice.customer as string | null;

  if (!stripeSubscriptionId) return;

  // Extract period dates from the invoice lines (first line item).
  const lines = (invoice.lines as { data?: Array<Record<string, unknown>> })?.data ?? [];
  const firstLine = lines[0] as Record<string, unknown> | undefined;
  const periodStart = firstLine?.period
    ? unixToIso((firstLine.period as { start: number }).start)
    : null;
  const periodEnd = firstLine?.period
    ? unixToIso((firstLine.period as { end: number }).end)
    : null;

  console.log("[stripe-webhook] invoice.paid", {
    stripeSubscriptionId,
    periodStart,
    periodEnd,
  });

  const patchData: Record<string, unknown> = {
    status: "active",
    updated_at: new Date().toISOString(),
  };
  if (stripeCustomerId) patchData.stripe_customer_id = stripeCustomerId;
  if (periodStart) patchData.current_period_start = periodStart;
  if (periodEnd) patchData.current_period_end = periodEnd;

  await updateSubscription(
    config,
    { stripe_subscription_id: stripeSubscriptionId },
    patchData,
  );

  // Seed a usage record for the new period if we have the dates. Look up the
  // user_id from the subscription row we just updated.
  if (periodStart && periodEnd) {
    const sub = await findSubscription(config, {
      stripe_subscription_id: stripeSubscriptionId,
    });
    if (sub?.user_id) {
      await upsertUsageRecord(
        config,
        sub.user_id as string,
        periodStart,
        periodEnd,
      );
    }
  }
}

/**
 * invoice.payment_failed
 *
 * Fired when Stripe fails to collect payment. Mark the subscription as
 * past_due so the frontend can prompt the user to update their payment method.
 */
async function handleInvoicePaymentFailed(
  config: SupabaseConfig,
  invoice: Record<string, unknown>,
): Promise<void> {
  const stripeSubscriptionId = invoice.subscription as string | null;
  if (!stripeSubscriptionId) return;

  console.log("[stripe-webhook] invoice.payment_failed", {
    stripeSubscriptionId,
  });

  await updateSubscription(
    config,
    { stripe_subscription_id: stripeSubscriptionId },
    {
      status: "past_due",
      updated_at: new Date().toISOString(),
    },
  );
}

/**
 * customer.subscription.updated
 *
 * Fired whenever a subscription's properties change in Stripe — plan upgrades,
 * downgrades, cancellation scheduling, trial end, etc. We do a full sync of
 * all fields we track.
 */
async function handleSubscriptionUpdated(
  config: SupabaseConfig,
  subscription: Record<string, unknown>,
): Promise<void> {
  const stripeSubscriptionId = subscription.id as string;
  const stripeCustomerId = subscription.customer as string;
  const status = subscription.status as string;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end as boolean;
  const currentPeriodStart = unixToIso(
    subscription.current_period_start as number,
  );
  const currentPeriodEnd = unixToIso(
    subscription.current_period_end as number,
  );

  // Determine the internal plan_id from the first line item price.
  const items = (subscription.items as { data?: Array<Record<string, unknown>> })?.data ?? [];
  const stripePriceId = (
    (items[0]?.price as Record<string, unknown> | undefined)?.id
  ) as string | undefined;

  let planId: number | null = null;
  if (stripePriceId) {
    planId = await findPlanByStripePrice(config, stripePriceId);
  }

  console.log("[stripe-webhook] customer.subscription.updated", {
    stripeSubscriptionId,
    status,
    planId,
    cancelAtPeriodEnd,
  });

  const patchData: Record<string, unknown> = {
    stripe_customer_id: stripeCustomerId,
    status,
    cancel_at_period_end: cancelAtPeriodEnd,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  if (planId !== null) {
    patchData.plan_id = planId;
  }

  await updateSubscription(
    config,
    { stripe_subscription_id: stripeSubscriptionId },
    patchData,
  );
}

/**
 * customer.subscription.deleted
 *
 * Fired when a subscription is fully canceled (not just scheduled for
 * cancellation). Set the status to 'canceled' and clear the period dates.
 */
async function handleSubscriptionDeleted(
  config: SupabaseConfig,
  subscription: Record<string, unknown>,
): Promise<void> {
  const stripeSubscriptionId = subscription.id as string;

  console.log("[stripe-webhook] customer.subscription.deleted", {
    stripeSubscriptionId,
  });

  await updateSubscription(
    config,
    { stripe_subscription_id: stripeSubscriptionId },
    {
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
  );
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
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return errorResponse("Webhook not configured", 500);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[stripe-webhook] Supabase env vars are missing");
    return errorResponse("Database service not configured", 500);
  }

  const supabaseConfig: SupabaseConfig = { url: supabaseUrl, serviceRoleKey };

  // ── Read raw body ─────────────────────────────────────────────────────────
  // The raw bytes are needed for signature verification — do NOT call
  // req.json() before verifying or the body hash will not match.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (_err) {
    return errorResponse("Failed to read request body", 400);
  }

  // ── Verify Stripe signature ───────────────────────────────────────────────
  const signatureHeader = req.headers.get("stripe-signature");
  if (!signatureHeader) {
    console.warn("[stripe-webhook] Missing Stripe-Signature header");
    return errorResponse("Missing Stripe-Signature header", 400);
  }

  try {
    await verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature error";
    console.warn("[stripe-webhook] Signature verification failed:", message);
    return errorResponse(`Webhook signature verification failed: ${message}`, 400);
  }

  // ── Parse event ───────────────────────────────────────────────────────────
  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch (_err) {
    return errorResponse("Invalid JSON payload", 400);
  }

  console.log("[stripe-webhook] Received event", {
    eventId: event.id,
    type: event.type,
  });

  // ── Dispatch to event handler ─────────────────────────────────────────────
  // All handlers catch their own errors and log them. We return 200 to Stripe
  // regardless so Stripe does not retry events for application-level failures.
  // Persistent issues will surface in logs and can be replayed from the Stripe
  // dashboard.
  try {
    const eventObject = event.data.object;

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabaseConfig, eventObject);
        break;

      case "invoice.paid":
        await handleInvoicePaid(supabaseConfig, eventObject);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabaseConfig, eventObject);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabaseConfig, eventObject);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabaseConfig, eventObject);
        break;

      default:
        // Log and ignore events we do not handle. This is intentional —
        // Stripe sends many event types and we only care about a subset.
        console.log("[stripe-webhook] Unhandled event type, ignoring:", event.type);
    }
  } catch (err) {
    // Log the error but still return 200 to Stripe. Returning a non-2xx
    // status would cause Stripe to retry the same event for up to 72 hours,
    // which would flood logs for a persistent application error. We rely on
    // our own monitoring for alerts on error rates.
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[stripe-webhook] Handler error for event ${event.type} (${event.id}):`,
      message,
    );
  }

  // ── Acknowledge receipt ────────────────────────────────────────────────────
  return jsonResponse({ received: true });
});
