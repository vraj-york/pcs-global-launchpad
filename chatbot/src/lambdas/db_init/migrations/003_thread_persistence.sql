-- Migration 003: Thread Persistence (A1 — Thread & Trim)
-- Creates conversations, messages, and thread_summaries tables.
--
-- Schema decisions:
--   • persona / chat_mode stored as TEXT + CHECK (not ENUM) so adding new
--     values in future sprints requires no ALTER TYPE migration.
--   • messages.content and thread_summaries.summary stored as BYTEA —
--     AES-256-GCM ciphertext produced by app/infrastructure/crypto.py.
--     In dev mode (CHATBOT_ENCRYPTION_DISABLED=true) the column holds plain
--     UTF-8 bytes prefixed by a 4-zero-byte sentinel; code round-trips safely.
--   • Soft-delete via soft_deleted_at: rows are hidden from queries but kept
--     on disk for GDPR audit window. A1 uses row-level delete for erasure;
--     A3 upgrades to crypto-shred.
--   • No FK to a users table: identity is the SHA-256 hash of the Cognito sub
--     (user_id_hash). Keeps the chatbot DB independent of the backend users DB.

--  conversations 

CREATE TABLE IF NOT EXISTS conversations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_hash    TEXT        NOT NULL,
    title           TEXT        NOT NULL DEFAULT 'New conversation',
    pinned          BOOLEAN     NOT NULL DEFAULT false,
    persona         TEXT        NOT NULL DEFAULT 'default',
    chat_mode       TEXT        NOT NULL DEFAULT 'quick',
    -- Present only when persona = 'coach' to scope session-note context
    coach_client_id TEXT        NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NULL,
    -- NULL means active; non-NULL is the deletion timestamp
    soft_deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT conversations_valid_persona
        CHECK (persona IN ('employee', 'coach', 'superadmin', 'default')),

    CONSTRAINT conversations_valid_chat_mode
        CHECK (chat_mode IN ('quick', 'deep_dive')),

    CONSTRAINT conversations_coach_client_requires_coach
        CHECK (coach_client_id IS NULL OR persona = 'coach')
);

-- Primary sidebar query: user's active threads, pinned first then by recency
CREATE INDEX IF NOT EXISTS idx_conversations_sidebar
    ON conversations (user_id_hash, pinned DESC, COALESCE(last_message_at, created_at) DESC)
    WHERE soft_deleted_at IS NULL;

-- Lookup by PK + owner check (used by all single-thread operations)
CREATE INDEX IF NOT EXISTS idx_conversations_id_user
    ON conversations (id, user_id_hash)
    WHERE soft_deleted_at IS NULL;

-- Trigger: keep updated_at current on any row update
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversations_updated_at();

--  messages 

CREATE TABLE IF NOT EXISTS messages (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL,
    -- AES-256-GCM ciphertext (see crypto.py for wire format)
    content         BYTEA       NOT NULL,
    -- Token counts; NULL when content was blocked before the LLM was called
    tokens_in       INT         NULL,
    tokens_out      INT         NULL,
    -- JSON array of tool invocations on this turn (NULL for user messages)
    tool_calls      JSONB       NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT messages_valid_role
        CHECK (role IN ('user', 'assistant', 'tool'))
);

-- Conversation window reads: last N messages chronologically
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at ASC);

--  thread_summaries 

CREATE TABLE IF NOT EXISTS thread_summaries (
    -- One summary per conversation (upserted, not appended)
    conversation_id UUID        PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
    -- AES-256-GCM ciphertext of the rolling summary text
    summary         BYTEA       NOT NULL,
    -- The newest message_id included in this summary (used to detect staleness)
    up_to_message   UUID        NOT NULL REFERENCES messages(id),
    tokens          INT         NOT NULL,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

--  Grants 

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
