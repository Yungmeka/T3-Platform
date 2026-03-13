-- Migration: 002_webhooks
-- Creates the webhooks table used by the T3 Sentinel webhook notification system.
--
-- Design notes:
--   - events is a TEXT[] column so a single row can subscribe to multiple
--     event types without a junction table.
--   - active is a boolean soft-delete flag; rows are never physically removed
--     so delivery history remains auditable.
--   - secret is stored as plain text — it is not a password but a signing key
--     used for HMAC-SHA256 payload authentication over HTTPS.
--   - Row-level security is enabled; application-level brand_id checks in the
--     FastAPI layer enforce access control for service-key callers.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS webhooks (
    id                BIGSERIAL    PRIMARY KEY,
    brand_id          BIGINT       NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    url               TEXT         NOT NULL,
    secret            TEXT,
    events            TEXT[]       NOT NULL DEFAULT '{"hallucination.detected"}',
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookup on every dispatch call: filter by brand and active flag
CREATE INDEX IF NOT EXISTS idx_webhooks_brand        ON webhooks (brand_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_brand_active ON webhooks (brand_id, active);

-- Row-level security enabled; policies are managed at the application layer
-- via the service role key, which bypasses RLS for backend operations.
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
