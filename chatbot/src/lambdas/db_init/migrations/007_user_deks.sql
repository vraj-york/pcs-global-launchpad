-- Migration 007: Per-user data encryption keys (memory crypto-shred support)
-- See chatbot/docs/memory-privacy-and-consent.md

CREATE TABLE IF NOT EXISTS user_deks (
    user_id_hash   TEXT PRIMARY KEY,
    encrypted_dek  BYTEA NOT NULL,
    dek_version    INT NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    shredded_at    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS user_deks_active
    ON user_deks (user_id_hash)
    WHERE shredded_at IS NULL;
