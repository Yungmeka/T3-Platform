-- Migration: 003_billing
-- Creates the billing subsystem for the T3 SaaS platform.
--
-- Tables:
--   subscription_plans  Reference data defining available tiers (seeded below).
--   subscriptions       One row per user; tracks Stripe state and plan assignment.
--   usage_records       Per-billing-period counters for metered resource types.
--
-- Security notes:
--   - RLS is enabled on subscriptions and usage_records.
--   - Users may SELECT their own rows; all writes are reserved for the service role,
--     which bypasses RLS and is used exclusively by server-side billing logic.
--   - subscription_plans is public read-only (no user data, safe to expose).
--
-- Metering notes:
--   - Limits of -1 in subscription_plans signal "unlimited" for that resource.
--   - The increment_usage() function enforces limits atomically using FOR UPDATE
--     to prevent races under concurrent API traffic.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- 1. subscription_plans
-- ===========================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id               SERIAL       PRIMARY KEY,
    name             TEXT         NOT NULL,
    display_name     TEXT         NOT NULL,
    price_monthly    INT          NOT NULL,                    -- in cents
    stripe_price_id  TEXT,                                     -- populated after Stripe setup
    max_brands       INT          NOT NULL DEFAULT 1,          -- -1 = unlimited
    max_scans        INT          NOT NULL DEFAULT 50,         -- -1 = unlimited
    max_api_calls    INT          NOT NULL DEFAULT 500,
    max_content_gen  INT          NOT NULL DEFAULT 20,         -- -1 = unlimited
    features         JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- All three tier names must be unique; enforces referential sanity for code
-- paths that look up plans by slug.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_name
    ON subscription_plans (name);

-- Public read: any authenticated user can list available plans (e.g., pricing page).
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscription plans"
    ON subscription_plans
    FOR SELECT
    USING (TRUE);


-- ===========================================================================
-- 2. subscriptions
-- ===========================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id                      SERIAL       PRIMARY KEY,
    user_id                 UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    plan_id                 INT          REFERENCES subscription_plans (id),
    stripe_customer_id      TEXT,
    stripe_subscription_id  TEXT,
    status                  TEXT         NOT NULL DEFAULT 'trialing'
                                         CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
    current_period_start    TIMESTAMPTZ,
    current_period_end      TIMESTAMPTZ,
    cancel_at_period_end    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
    ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
    ON subscriptions (stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users may read their own subscription row (e.g., dashboard plan display).
CREATE POLICY "Users can read own subscription"
    ON subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- All mutations (INSERT, UPDATE, DELETE) are performed by the service role only.
-- No explicit write policy is needed; the service role bypasses RLS entirely.


-- ===========================================================================
-- 3. usage_records
-- ===========================================================================

CREATE TABLE IF NOT EXISTS usage_records (
    id               SERIAL   PRIMARY KEY,
    user_id          UUID     NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    period_start     DATE     NOT NULL,
    period_end       DATE     NOT NULL,
    scans_used       INT      NOT NULL DEFAULT 0,
    api_calls_used   INT      NOT NULL DEFAULT 0,
    content_gen_used INT      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_user_id
    ON usage_records (user_id);

-- Composite index supports the common query: fetch current period for a user.
CREATE INDEX IF NOT EXISTS idx_usage_records_user_period
    ON usage_records (user_id, period_start DESC);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Users may read their own usage data (e.g., in-app usage meter).
CREATE POLICY "Users can read own usage records"
    ON usage_records
    FOR SELECT
    USING (auth.uid() = user_id);


-- ===========================================================================
-- 4. Seed: subscription_plans
-- ===========================================================================
-- ON CONFLICT DO NOTHING makes this idempotent; safe to re-run the migration.

INSERT INTO subscription_plans
    (name, display_name, price_monthly, max_brands, max_scans, max_api_calls, max_content_gen, features)
VALUES
    (
        'starter',
        'Starter',
        4900,
        1,
        50,
        500,
        20,
        '["1 Brand", "50 AI Scans/month", "500 API Calls", "20 Content Generations", "Email Support"]'
    ),
    (
        'growth',
        'Growth',
        14900,
        5,
        200,
        2000,
        100,
        '["5 Brands", "200 AI Scans/month", "2,000 API Calls", "100 Content Generations", "Sentinel API Access", "Priority Support"]'
    ),
    (
        'enterprise',
        'Enterprise',
        49900,
        -1,
        -1,
        10000,
        -1,
        '["Unlimited Brands", "Unlimited Scans", "10,000 API Calls", "Unlimited Content", "Sentinel API + Webhooks", "Dedicated Support", "Custom Integrations"]'
    )
ON CONFLICT (name) DO NOTHING;


-- ===========================================================================
-- 5. Function: increment_usage
-- ===========================================================================
--
-- Purpose: Atomic metered-usage gate called by the API before any billable
--          operation. Returns a JSONB result indicating whether the action is
--          permitted and how many units remain in the current period.
--
-- Arguments:
--   p_user_id    UUID   The authenticated user performing the action.
--   p_usage_type TEXT   One of: 'scans', 'api_calls', 'content_gen'
--
-- Returns JSONB, one of:
--   { "allowed": true,  "remaining": <int> }
--   { "allowed": false, "remaining": 0, "limit": <int> }
--   { "allowed": false, "remaining": 0, "error": "<message>" }
--
-- Concurrency: The usage_records row is locked with SELECT ... FOR UPDATE
-- so that two simultaneous requests for the same user cannot both read a
-- value of N-1 and both increment past the limit.
--
-- Unlimited (-1): When the plan limit for the requested type is -1, the
-- counter is still incremented (for analytics) but the gate always returns
-- allowed: true with remaining: -1.

CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_usage_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the function owner (service role) to bypass RLS
AS $$
DECLARE
    v_plan           subscription_plans%ROWTYPE;
    v_subscription   subscriptions%ROWTYPE;
    v_usage          usage_records%ROWTYPE;
    v_period_start   DATE;
    v_period_end     DATE;
    v_plan_limit     INT;
    v_current_usage  INT;
    v_remaining      INT;
BEGIN
    -- ------------------------------------------------------------------
    -- Validate p_usage_type early to avoid wasted work on bad input.
    -- ------------------------------------------------------------------
    IF p_usage_type NOT IN ('scans', 'api_calls', 'content_gen') THEN
        RETURN jsonb_build_object(
            'allowed',   FALSE,
            'remaining', 0,
            'error',     'Invalid usage type: ' || p_usage_type
        );
    END IF;

    -- ------------------------------------------------------------------
    -- 1. Resolve the user's active subscription and plan.
    -- ------------------------------------------------------------------
    SELECT s.*
      INTO v_subscription
      FROM subscriptions s
     WHERE s.user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed',   FALSE,
            'remaining', 0,
            'error',     'No subscription found for user'
        );
    END IF;

    IF v_subscription.status NOT IN ('trialing', 'active') THEN
        RETURN jsonb_build_object(
            'allowed',   FALSE,
            'remaining', 0,
            'error',     'Subscription is not active (status: ' || v_subscription.status || ')'
        );
    END IF;

    SELECT p.*
      INTO v_plan
      FROM subscription_plans p
     WHERE p.id = v_subscription.plan_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed',   FALSE,
            'remaining', 0,
            'error',     'Subscription has no associated plan'
        );
    END IF;

    -- ------------------------------------------------------------------
    -- 2. Determine the current billing period.
    --    Prefer the period stored on the subscription (synced from Stripe).
    --    Fall back to the current calendar month if not yet populated.
    -- ------------------------------------------------------------------
    v_period_start := COALESCE(
        v_subscription.current_period_start::DATE,
        DATE_TRUNC('month', CURRENT_DATE)::DATE
    );
    v_period_end := COALESCE(
        v_subscription.current_period_end::DATE,
        (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
    );

    -- ------------------------------------------------------------------
    -- 3. Fetch or create the usage_records row for this period.
    --    INSERT ... ON CONFLICT ensures we never create duplicates even
    --    under concurrent first-request-of-period races.
    -- ------------------------------------------------------------------
    INSERT INTO usage_records (user_id, period_start, period_end)
    VALUES (p_user_id, v_period_start, v_period_end)
    ON CONFLICT (user_id, period_start) DO NOTHING;

    -- Lock the row for the duration of this transaction.
    SELECT u.*
      INTO v_usage
      FROM usage_records u
     WHERE u.user_id     = p_user_id
       AND u.period_start = v_period_start
    FOR UPDATE;

    -- ------------------------------------------------------------------
    -- 4. Read the plan limit and current counter for the requested type.
    -- ------------------------------------------------------------------
    CASE p_usage_type
        WHEN 'scans' THEN
            v_plan_limit    := v_plan.max_scans;
            v_current_usage := v_usage.scans_used;
        WHEN 'api_calls' THEN
            v_plan_limit    := v_plan.max_api_calls;
            v_current_usage := v_usage.api_calls_used;
        WHEN 'content_gen' THEN
            v_plan_limit    := v_plan.max_content_gen;
            v_current_usage := v_usage.content_gen_used;
    END CASE;

    -- ------------------------------------------------------------------
    -- 5. Unlimited tier: always allow, increment for analytics, return -1.
    -- ------------------------------------------------------------------
    IF v_plan_limit = -1 THEN
        CASE p_usage_type
            WHEN 'scans' THEN
                UPDATE usage_records
                   SET scans_used  = scans_used + 1,
                       updated_at  = NOW()
                 WHERE user_id      = p_user_id
                   AND period_start = v_period_start;
            WHEN 'api_calls' THEN
                UPDATE usage_records
                   SET api_calls_used = api_calls_used + 1,
                       updated_at     = NOW()
                 WHERE user_id         = p_user_id
                   AND period_start    = v_period_start;
            WHEN 'content_gen' THEN
                UPDATE usage_records
                   SET content_gen_used = content_gen_used + 1,
                       updated_at       = NOW()
                 WHERE user_id           = p_user_id
                   AND period_start      = v_period_start;
        END CASE;

        RETURN jsonb_build_object(
            'allowed',   TRUE,
            'remaining', -1
        );
    END IF;

    -- ------------------------------------------------------------------
    -- 6. At or over limit: deny without incrementing.
    -- ------------------------------------------------------------------
    IF v_current_usage >= v_plan_limit THEN
        RETURN jsonb_build_object(
            'allowed',   FALSE,
            'remaining', 0,
            'limit',     v_plan_limit
        );
    END IF;

    -- ------------------------------------------------------------------
    -- 7. Under limit: increment and return remaining count.
    -- ------------------------------------------------------------------
    CASE p_usage_type
        WHEN 'scans' THEN
            UPDATE usage_records
               SET scans_used  = scans_used + 1,
                   updated_at  = NOW()
             WHERE user_id      = p_user_id
               AND period_start = v_period_start;
        WHEN 'api_calls' THEN
            UPDATE usage_records
               SET api_calls_used = api_calls_used + 1,
                   updated_at     = NOW()
             WHERE user_id         = p_user_id
               AND period_start    = v_period_start;
        WHEN 'content_gen' THEN
            UPDATE usage_records
               SET content_gen_used = content_gen_used + 1,
                   updated_at       = NOW()
             WHERE user_id           = p_user_id
               AND period_start      = v_period_start;
    END CASE;

    -- After incrementing, remaining = limit - (old_usage + 1)
    v_remaining := v_plan_limit - (v_current_usage + 1);

    RETURN jsonb_build_object(
        'allowed',   TRUE,
        'remaining', v_remaining
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'allowed',   FALSE,
            'remaining', 0,
            'error',     SQLERRM
        );
END;
$$;

-- Revoke direct execution from public; only service role and explicit grants
-- should call this function to prevent client-side limit bypass.
REVOKE EXECUTE ON FUNCTION increment_usage(UUID, TEXT) FROM PUBLIC;
