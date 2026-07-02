-- Migration 002: Create chatbot_audit_logs table
-- Immutable audit log for every chatbot interaction.

-- Enum for chat mode (native PostgreSQL type, enforced at storage level)
CREATE TYPE chat_mode AS ENUM ('quick_mode', 'deep_mode');

CREATE TABLE IF NOT EXISTS chatbot_audit_logs (
    -- Identity: who made the request, when, and in which session
    log_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id     TEXT        NOT NULL,
    role        TEXT        NOT NULL,
    session_id  UUID        NOT NULL,

    -- Request context: how the request was made and which model handled it
    chat_mode   chat_mode   NOT NULL,
    model_id    TEXT        DEFAULT NULL,

    -- Outcome: what happened
    outcome         TEXT    NOT NULL,
    denial_reason   TEXT    DEFAULT NULL,
    error_code      TEXT    DEFAULT NULL,

    -- Retrieval: knowledge used during the interaction
    -- Populated when search_knowledge_base tool was called; empty/0 otherwise.
    retrieved_source_ids    TEXT[]  NOT NULL DEFAULT '{}',
    retrieved_chunk_count   INT     NOT NULL DEFAULT 0,

    -- Efficiency: interaction complexity
    -- Total tool invocations across all agentic loop iterations.
    tool_calls_count    SMALLINT    NOT NULL DEFAULT 0,

    -- Cost: token consumption for attribution per user/role/mode
    -- Sum across every invoke_model call in the interaction.
    -- NULL when the interaction failed before any LLM call completed.
    input_tokens    INT     DEFAULT NULL,
    output_tokens   INT     DEFAULT NULL,

    -- Observability: performance and cross-system tracing
    -- correlation_id maps to requestId in Bedrock Model Invocation Logs.
    latency_ms      INT     DEFAULT NULL,
    correlation_id  TEXT    DEFAULT NULL
);

-- Enum-like constraints on TEXT fields
ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT valid_outcome
    CHECK (outcome IN ('answered', 'fallback', 'denied', 'error'));

ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT valid_role
    CHECK (role IN ('super_admin', 'manager', 'end_user'));

ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT valid_denial_reason
    CHECK (
        denial_reason IS NULL OR
        denial_reason IN ('rbac_policy', 'content_filter')
    );

-- Cross-field consistency constraints
ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT denial_reason_consistency
    CHECK (
        (outcome = 'denied' AND denial_reason IS NOT NULL) OR
        (outcome != 'denied')
    );

ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT error_code_consistency
    CHECK (
        (outcome = 'error' AND error_code IS NOT NULL) OR
        (outcome != 'error')
    );

-- Non-negative numeric constraints
ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT retrieved_chunk_count_non_negative
    CHECK (retrieved_chunk_count >= 0);

ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT tool_calls_count_non_negative
    CHECK (tool_calls_count >= 0);

ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT input_tokens_non_negative
    CHECK (input_tokens IS NULL OR input_tokens >= 0);

ALTER TABLE chatbot_audit_logs
    ADD CONSTRAINT output_tokens_non_negative
    CHECK (output_tokens IS NULL OR output_tokens >= 0);

-- Indexes for common query patterns
CREATE INDEX idx_audit_logs_timestamp
    ON chatbot_audit_logs (timestamp DESC);

CREATE INDEX idx_audit_logs_user_id
    ON chatbot_audit_logs (user_id);

CREATE INDEX idx_audit_logs_outcome
    ON chatbot_audit_logs (outcome);

CREATE INDEX idx_audit_logs_model_id
    ON chatbot_audit_logs (model_id);

-- Composite: most common query (per-user, time-sorted)
CREATE INDEX idx_audit_logs_user_timestamp
    ON chatbot_audit_logs (user_id, timestamp DESC);

-- Grant permissions to the current executing user.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
