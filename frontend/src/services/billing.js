/**
 * T3 Billing Service
 * ------------------
 * Handles subscription management, plan queries, and usage tracking.
 * Stripe integration is stubbed — replace the placeholder functions
 * once a backend checkout endpoint is available.
 *
 * Database tables consumed:
 *   subscription_plans  — static plan catalogue
 *   subscriptions       — one row per user, joins to subscription_plans
 *   usage_records       — one row per user per billing period
 *
 * Supabase RPC consumed:
 *   increment_usage(p_user_id, p_usage_type)
 *     → { allowed: boolean, remaining: number }
 */

import { supabase } from '../supabase';

// ─── Subscription + Plan ──────────────────────────────────────────────────────

/**
 * Fetch the user's active subscription along with the linked plan details
 * and the current period's usage record.
 *
 * @param {string} userId
 * @returns {{ subscription: object, plan: object, usage: object } | null}
 */
export async function getSubscription(userId) {
  if (!userId) return null;

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    console.error('[billing] getSubscription error:', subError.message);
    return null;
  }

  if (!subscription) return null;

  // Detach the nested plan so callers can reference it independently.
  const plan = subscription.plan ?? null;
  const subWithoutPlan = { ...subscription };
  delete subWithoutPlan.plan;

  // Fetch the usage record for the current billing period.
  const usage = await getUsageStats(userId);

  return { subscription: subWithoutPlan, plan, usage };
}

// ─── Plans ────────────────────────────────────────────────────────────────────

/**
 * Return all rows from subscription_plans ordered by price ascending.
 *
 * @returns {object[]}
 */
export async function getPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly', { ascending: true });

  if (error) {
    console.error('[billing] getPlans error:', error.message);
    return [];
  }

  return data ?? [];
}

// ─── Usage ────────────────────────────────────────────────────────────────────

/**
 * Check whether the user is allowed to perform an action and return the
 * remaining quota by calling the increment_usage Supabase RPC.
 *
 * The RPC is expected to atomically increment the counter and return
 * { allowed: boolean, remaining: number }.  If the RPC is not yet deployed
 * the function returns { allowed: true, remaining: null } so the UI degrades
 * gracefully rather than blocking the user.
 *
 * @param {string} userId
 * @param {'scan' | 'api_call' | 'content_gen'} usageType
 * @returns {{ allowed: boolean, remaining: number | null }}
 */
export async function checkUsage(userId, usageType) {
  if (!userId || !usageType) return { allowed: false, remaining: 0 };

  const { data, error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_usage_type: usageType,
  });

  if (error) {
    console.error('[billing] checkUsage RPC error:', error.message);
    // Fail open — surface an error in the UI separately rather than
    // silently blocking an action.
    return { allowed: true, remaining: null };
  }

  return {
    allowed: data?.allowed ?? true,
    remaining: data?.remaining ?? null,
  };
}

/**
 * Return the usage_records row that covers the user's current billing period.
 * Matches on period_start <= now <= period_end so the caller always gets the
 * live counters without needing to know the exact period dates.
 *
 * @param {string} userId
 * @returns {object | null}
 */
export async function getUsageStats(userId) {
  if (!userId) return null;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('usage_records')
    .select('*')
    .eq('user_id', userId)
    .lte('period_start', now)
    .gte('period_end', now)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[billing] getUsageStats error:', error.message);
    return null;
  }

  return data ?? null;
}

// ─── Trial ────────────────────────────────────────────────────────────────────

/**
 * Provision a 14-day free trial on the Starter plan (plan_id = 1).
 * Creates both the subscription row and a matching usage_records row.
 *
 * @param {string} userId
 * @returns {{ subscription: object, usage: object } | null}
 */
export async function createTrialSubscription(userId, planId = 1) {
  if (!userId) return null;

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);

  const periodStart = now.toISOString();
  const periodEnd = trialEnd.toISOString();

  // Insert the subscription row.
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId, // defaults to Starter plan (1)
      status: 'trialing',
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
    })
    .select()
    .single();

  if (subError) {
    console.error('[billing] createTrialSubscription sub insert error:', subError.message);
    return null;
  }

  // Seed the usage record for the trial period.
  const { data: usage, error: usageError } = await supabase
    .from('usage_records')
    .insert({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      scans_used: 0,
      api_calls_used: 0,
      content_gen_used: 0,
    })
    .select()
    .single();

  if (usageError) {
    console.error('[billing] createTrialSubscription usage insert error:', usageError.message);
    // Return the subscription even if the usage row failed — it can be
    // recreated on the next getUsageStats call via a DB trigger or upsert.
    return { subscription, usage: null };
  }

  return { subscription, usage };
}

// ─── Stripe Integration ──────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Initiate a Stripe Checkout session for the given price.
 * Calls the stripe-checkout Edge Function.
 *
 * @param {string} priceId    — Stripe price ID (e.g. 'price_xxx')
 * @param {string} userId     — Supabase user ID
 * @param {string} userEmail  — Pre-fills the Stripe checkout form
 * @returns {{ url: string, sessionId: string } | null}
 */
export async function createCheckoutSession(priceId, userId, userEmail) {
  if (!priceId || !userId) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        priceId,
        userId,
        userEmail: userEmail || '',
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[billing] createCheckoutSession error:', err.error || res.statusText);
      return null;
    }

    const data = await res.json();
    return data; // { url, sessionId }
  } catch (err) {
    console.error('[billing] createCheckoutSession fetch error:', err.message);
    return null;
  }
}

/**
 * Open the Stripe Customer Portal so the user can manage their subscription
 * (change plan, update payment method, cancel, etc.).
 *
 * Calls the stripe-portal Edge Function which creates a Billing Portal
 * Session server-side and returns the hosted URL for the browser to redirect
 * to. Requires a Customer Portal configuration to exist in the Stripe
 * Dashboard (Settings > Billing > Customer portal).
 *
 * @param {string} userId  — Supabase user ID
 * @returns {{ url: string } | null}
 */
export async function createPortalSession(userId) {
  if (!userId) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        userId,
        returnUrl: `${window.location.origin}/billing`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[billing] createPortalSession error:', err.error || res.statusText);
      return null;
    }

    return await res.json(); // { url }
  } catch (err) {
    console.error('[billing] createPortalSession fetch error:', err.message);
    return null;
  }
}
