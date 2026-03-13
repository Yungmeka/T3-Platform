-- Migration: 001_api_keys
-- Creates the api_keys table used by the T3 Sentinel key-management system.
--
-- Security notes:
--   - key_hash stores a SHA-256 digest; the raw key is never persisted.
--   - Row-level security ensures users can only access their own keys.
--   - revoked_at enables soft deletes for audit trail preservation.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_keys (
    id            BIGSERIAL    PRIMARY KEY,
    brand_id      BIGINT       NOT NULL REFERENCES brands(id),
    user_id       UUID         NOT NULL,
    key_hash      TEXT         NOT NULL UNIQUE,
    prefix        TEXT         NOT NULL,
    name          TEXT         NOT NULL DEFAULT 'Default',
    environment   TEXT         NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'test')),
    rate_limit    INT          NOT NULL DEFAULT 100,
    usage_count   BIGINT       NOT NULL DEFAULT 0,
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revoked_at    TIMESTAMPTZ
);

-- Fast lookup on every authenticated request
CREATE INDEX IF NOT EXISTS idx_api_keys_hash  ON api_keys (key_hash);

-- Efficient filtering for list-keys queries
CREATE INDEX IF NOT EXISTS idx_api_keys_brand ON api_keys (brand_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user  ON api_keys (user_id);

-- Row-level security: users may only read/write their own keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keys"
    ON api_keys
    FOR ALL
    USING (auth.uid() = user_id);
