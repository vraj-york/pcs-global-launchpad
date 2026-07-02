-- Migration 006: User distilled memories (L3 memory tier)
-- See chatbot/docs/user-memory-implementation-plan.md

CREATE TABLE IF NOT EXISTS memories (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_hash               TEXT NOT NULL,
    kind                       TEXT NOT NULL,
    bsp_dimension              TEXT NULL,
    scope_type                 TEXT NOT NULL DEFAULT 'personal',
    scope_ref                  TEXT NULL,
    sensitivity                TEXT NOT NULL DEFAULT 'normal',
    content_ciphertext         BYTEA NOT NULL,
    embedding                  vector(1024) NOT NULL,
    entities                   JSONB NOT NULL DEFAULT '[]'::jsonb,
    entities_normalized        JSONB NOT NULL DEFAULT '[]'::jsonb,
    importance                 REAL NOT NULL DEFAULT 0.5,
    status                     TEXT NOT NULL DEFAULT 'candidate',
    source_message_id          UUID NULL REFERENCES messages(id) ON DELETE SET NULL,
    source_conversation_id     UUID NULL REFERENCES conversations(id) ON DELETE SET NULL,
    superseded_by              UUID NULL REFERENCES memories(id),
    extraction_idempotency_key TEXT NULL UNIQUE,
    user_edited                BOOLEAN NOT NULL DEFAULT false,
    soft_deleted_at            TIMESTAMPTZ NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed_at           TIMESTAMPTZ NULL,
    last_retrieved_at          TIMESTAMPTZ NULL,

    CONSTRAINT memories_valid_kind CHECK (kind IN (
        'preference', 'goal', 'behavioural_insight', 'coaching_history',
        'fact', 'relationship', 'observation', 'team_insight', 'org_insight'
    )),
    CONSTRAINT memories_valid_scope CHECK (scope_type IN (
        'personal', 'coachee', 'team', 'organization'
    )),
    CONSTRAINT memories_valid_sensitivity CHECK (sensitivity IN (
        'normal', 'restricted', 'team'
    )),
    CONSTRAINT memories_valid_status CHECK (status IN (
        'candidate', 'confirmed', 'rejected'
    ))
);

CREATE INDEX IF NOT EXISTS memories_embedding_hnsw
    ON memories USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS memories_user_active
    ON memories (user_id_hash, kind)
    WHERE soft_deleted_at IS NULL
      AND superseded_by IS NULL
      AND status = 'confirmed';

CREATE INDEX IF NOT EXISTS memories_user_candidates
    ON memories (user_id_hash, created_at DESC)
    WHERE soft_deleted_at IS NULL
      AND status = 'candidate';

CREATE INDEX IF NOT EXISTS memories_entities_gin
    ON memories USING gin (entities_normalized);

CREATE INDEX IF NOT EXISTS memories_scope
    ON memories (user_id_hash, scope_type, scope_ref)
    WHERE soft_deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS memory_consent (
    user_id_hash   TEXT PRIMARY KEY,
    granted        BOOLEAN NOT NULL DEFAULT false,
    scope          TEXT NOT NULL DEFAULT 'memory_extraction',
    source         TEXT NOT NULL DEFAULT 'ui',
    granted_at     TIMESTAMPTZ NULL,
    revoked_at     TIMESTAMPTZ NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_audit_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_hash   TEXT NOT NULL,
    actor_role     TEXT NOT NULL,
    action         TEXT NOT NULL,
    memory_id      UUID NULL,
    metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_audit_user_time
    ON memory_audit_log (user_id_hash, created_at DESC);
