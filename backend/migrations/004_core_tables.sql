-- Migration: 004_core_tables
-- Creates the 7 core application tables referenced throughout the T3 Sentinel
-- frontend and backend, plus the missing RLS policy for the webhooks table.
--
-- IMPORTANT - Execution order:
--   brands must be created first because api_keys (001) and webhooks (002)
--   already carry REFERENCES brands(id) foreign keys. If those tables were
--   created before brands existed this migration must be the first thing run
--   after those two, or the database must be bootstrapped in full order:
--   004 -> 001 -> 002 -> 003.
--
-- Tables created (in dependency order):
--   1. brands               -- root ownership anchor, tied to auth.users
--   2. products             -- belongs to a brand
--   3. queries              -- belongs to a brand (target_brand_id)
--   4. ai_responses         -- belongs to a query
--   5. claims               -- belongs to an ai_response and a brand
--   6. alerts               -- belongs to a brand, optionally references a claim
--   7. analytics_snapshots  -- belongs to a brand, one row per (brand, date)
--
-- RLS strategy:
--   brands         -> auth.uid() = user_id
--   everything else -> brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
--                      applied via a reusable helper function (owned_brand_ids).
--
-- All policies are named and idempotent via DO $$ blocks so the migration
-- can be re-run safely (e.g., in CI) without errors on duplicate policy names.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- 0. Helper: webhooks RLS policy (missing from 002_webhooks.sql)
-- ===========================================================================
-- 002 enabled RLS on webhooks but never created a policy, meaning no
-- authenticated user could read or write their own webhook rows through
-- the Supabase client. This block adds the missing policy.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'webhooks'
          AND policyname = 'Users manage own webhooks'
    ) THEN
        CREATE POLICY "Users manage own webhooks"
            ON webhooks
            FOR ALL
            USING (brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid()));
    END IF;
END $$;


-- ===========================================================================
-- 1. brands
-- ===========================================================================
-- Root ownership table. Every other application entity chains back to brands
-- for its RLS check. Tied directly to auth.users so that deleting a Supabase
-- auth account cascades and removes all brand data.

CREATE TABLE IF NOT EXISTS brands (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    name        TEXT         NOT NULL,
    website_url TEXT,
    industry    TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookup for "fetch all brands owned by current user"
CREATE INDEX IF NOT EXISTS idx_brands_user_id ON brands (user_id);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Each operation gets its own policy so that granular revocation is possible
-- later without touching unrelated access paths.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'brands'
          AND policyname = 'Users can select own brands'
    ) THEN
        CREATE POLICY "Users can select own brands"
            ON brands FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'brands'
          AND policyname = 'Users can insert own brands'
    ) THEN
        CREATE POLICY "Users can insert own brands"
            ON brands FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'brands'
          AND policyname = 'Users can update own brands'
    ) THEN
        CREATE POLICY "Users can update own brands"
            ON brands FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'brands'
          AND policyname = 'Users can delete own brands'
    ) THEN
        CREATE POLICY "Users can delete own brands"
            ON brands FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;


-- ===========================================================================
-- 2. products
-- ===========================================================================
-- Products associated with a brand, used by the content generator, HDE, and
-- sentinel modules. features and specifications are JSONB so the shape can
-- evolve without schema changes.

CREATE TABLE IF NOT EXISTS products (
    id             BIGSERIAL    PRIMARY KEY,
    brand_id       BIGINT       NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
    product_name   TEXT         NOT NULL,
    description    TEXT,
    price          TEXT,
    features       JSONB,
    category       TEXT,
    specifications JSONB,
    url            TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'products'
          AND policyname = 'Users manage own brand products'
    ) THEN
        CREATE POLICY "Users manage own brand products"
            ON products
            FOR ALL
            USING (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            )
            WITH CHECK (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            );
    END IF;
END $$;


-- ===========================================================================
-- 3. queries
-- ===========================================================================
-- Sentinel query log. Each row represents one AI-platform query issued
-- against a target brand. category loosely maps to the query taxonomy
-- displayed in the frontend (e.g., "brand awareness", "competitor comparison").

CREATE TABLE IF NOT EXISTS queries (
    id              BIGSERIAL    PRIMARY KEY,
    query_text      TEXT         NOT NULL,
    target_brand_id BIGINT       NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
    category        TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queries_target_brand_id ON queries (target_brand_id);

ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'queries'
          AND policyname = 'Users manage own brand queries'
    ) THEN
        CREATE POLICY "Users manage own brand queries"
            ON queries
            FOR ALL
            USING (
                target_brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            )
            WITH CHECK (
                target_brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            );
    END IF;
END $$;


-- ===========================================================================
-- 4. ai_responses
-- ===========================================================================
-- Raw AI-platform responses captured per query. platform identifies the LLM
-- or search product (e.g., 'chatgpt', 'gemini', 'perplexity'). confidence_score
-- is a NUMERIC rather than FLOAT to preserve exact decimal representation from
-- model APIs that return percentage-based scores.

CREATE TABLE IF NOT EXISTS ai_responses (
    id               BIGSERIAL    PRIMARY KEY,
    query_id         BIGINT       NOT NULL REFERENCES queries (id) ON DELETE CASCADE,
    platform         TEXT         NOT NULL,
    response_text    TEXT,
    brand_mentioned  BOOLEAN      NOT NULL DEFAULT FALSE,
    sentiment        TEXT,
    confidence_score NUMERIC,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_responses_query_id ON ai_responses (query_id);

ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;

-- Access is gated through the query -> brand ownership chain.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'ai_responses'
          AND policyname = 'Users manage own brand ai_responses'
    ) THEN
        CREATE POLICY "Users manage own brand ai_responses"
            ON ai_responses
            FOR ALL
            USING (
                query_id IN (
                    SELECT q.id
                    FROM   queries q
                    WHERE  q.target_brand_id IN (
                        SELECT id FROM brands WHERE user_id = auth.uid()
                    )
                )
            )
            WITH CHECK (
                query_id IN (
                    SELECT q.id
                    FROM   queries q
                    WHERE  q.target_brand_id IN (
                        SELECT id FROM brands WHERE user_id = auth.uid()
                    )
                )
            );
    END IF;
END $$;


-- ===========================================================================
-- 5. claims
-- ===========================================================================
-- Factual claims extracted from AI responses and verified against brand
-- ground-truth data. status lifecycle: unverified -> verified | hallucinated.
-- response_id is nullable to allow manually entered claims not tied to a
-- specific AI response (e.g., analyst-submitted corrections).

CREATE TABLE IF NOT EXISTS claims (
    id                  BIGSERIAL    PRIMARY KEY,
    response_id         BIGINT       REFERENCES ai_responses (id) ON DELETE CASCADE,
    brand_id            BIGINT       NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
    claim_text          TEXT         NOT NULL,
    claim_type          TEXT,
    status              TEXT         NOT NULL DEFAULT 'unverified',
    verification_source TEXT,
    ground_truth_value  TEXT,
    confidence          NUMERIC,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_brand_id   ON claims (brand_id);
CREATE INDEX IF NOT EXISTS idx_claims_response_id ON claims (response_id);
-- Filtered index: most queries in the UI filter on specific status values.
CREATE INDEX IF NOT EXISTS idx_claims_status     ON claims (status);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'claims'
          AND policyname = 'Users manage own brand claims'
    ) THEN
        CREATE POLICY "Users manage own brand claims"
            ON claims
            FOR ALL
            USING (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            )
            WITH CHECK (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            );
    END IF;
END $$;


-- ===========================================================================
-- 6. alerts
-- ===========================================================================
-- Surface-level notifications generated by the sentinel when a hallucination
-- or anomaly is detected. resolved is a soft-close flag; rows are retained
-- for historical analysis and audit.
--
-- severity values: 'low' | 'medium' | 'high' | 'critical'
-- alert_type examples: 'hallucination', 'brand_mention', 'sentiment_drop'

CREATE TABLE IF NOT EXISTS alerts (
    id             BIGSERIAL    PRIMARY KEY,
    brand_id       BIGINT       NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
    alert_type     TEXT         NOT NULL,
    severity       TEXT         NOT NULL DEFAULT 'medium',
    title          TEXT         NOT NULL,
    description    TEXT,
    claim_id       BIGINT       REFERENCES claims (id),
    platform       TEXT,
    recommendation TEXT,
    resolved       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_brand_id ON alerts (brand_id);
-- Separate index on resolved to support the common "show open alerts" query.
CREATE INDEX IF NOT EXISTS idx_alerts_resolved  ON alerts (resolved);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'alerts'
          AND policyname = 'Users manage own brand alerts'
    ) THEN
        CREATE POLICY "Users manage own brand alerts"
            ON alerts
            FOR ALL
            USING (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            )
            WITH CHECK (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            );
    END IF;
END $$;


-- ===========================================================================
-- 7. analytics_snapshots
-- ===========================================================================
-- Daily rollup of brand health metrics computed by the sentinel engine.
-- One row per (brand_id, snapshot_date) enforced by the UNIQUE constraint.
-- platform_scores, top_claims, and recommendations are JSONB to allow the
-- shape to evolve independently of the schema.
--
-- The composite index on (brand_id, snapshot_date DESC) matches the primary
-- query pattern: "last N snapshots for brand X, newest first".

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id                  BIGSERIAL    PRIMARY KEY,
    brand_id            BIGINT       NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
    snapshot_date       DATE         NOT NULL,
    visibility_score    NUMERIC,
    trust_score         NUMERIC,
    total_claims        INT          NOT NULL DEFAULT 0,
    verified_claims     INT          NOT NULL DEFAULT 0,
    hallucinated_claims INT          NOT NULL DEFAULT 0,
    platform_scores     JSONB,
    top_claims          JSONB,
    recommendations     JSONB,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (brand_id, snapshot_date)
);

-- Composite index ordering matches the ORDER BY snapshot_date DESC used by
-- the dashboard and monitoring views.
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_brand_date
    ON analytics_snapshots (brand_id, snapshot_date DESC);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'analytics_snapshots'
          AND policyname = 'Users manage own brand analytics_snapshots'
    ) THEN
        CREATE POLICY "Users manage own brand analytics_snapshots"
            ON analytics_snapshots
            FOR ALL
            USING (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            )
            WITH CHECK (
                brand_id IN (SELECT id FROM brands WHERE user_id = auth.uid())
            );
    END IF;
END $$;
