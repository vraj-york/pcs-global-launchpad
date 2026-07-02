-- Migration 005: Conversation Export Audit Log
--
-- Records every export attempt (success or failure) for compliance, auditability,
-- and rate-limiting.  Intentionally separate from chatbot_audit_logs which tracks
-- LLM chat interactions — exports are a different action class with different
-- fields and different retention/query patterns.
--
-- Compliance drivers:
--   • HIPAA §164.312(b) — audit controls: maintain records of PHI access/disclosure.
--     Minimum retention: 6 years from creation or last effective date.
--   • CCPA §1798.100 — data portability access must be tracked.
--   • Forensic investigations: IP + User-Agent allow tracing unauthorized access
--     patterns (e.g., credential stuffing, session hijacking).
--
-- Security design decisions:
--   • user_id_hash (not plaintext sub) — consistent with the rest of the chatbot DB;
--     opaque to anyone with DB-only access without the SHA-256 pre-image.
--   • thread_title snapshotted at export time — the title may be renamed or the
--     thread deleted later; we need to know what was actually exported.
--   • ip_address and user_agent capped at 256 chars — prevents log-injection attacks
--     via oversized headers; truncation happens in the application layer.
--   • success column + error_code allow detecting enumeration / probing patterns
--     (repeated 404s on different thread_ids from the same user_id_hash / IP).
--   • Table is append-only by convention; the application layer never issues
--     UPDATE or DELETE on this table.

CREATE TABLE IF NOT EXISTS conversation_export_logs (
    -- Identity
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    exported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Who exported
    user_id_hash    TEXT        NOT NULL,

    -- What was exported (snapshot at export time)
    thread_id       TEXT        NOT NULL,
    thread_title    TEXT        NOT NULL DEFAULT '',
    message_count   INT         NOT NULL DEFAULT 0,
    persona         TEXT        NOT NULL DEFAULT 'default',

    -- How the request arrived (forensics + anomaly detection)
    ip_address      TEXT        NULL,
    user_agent      TEXT        NULL,

    -- Outcome
    success         BOOLEAN     NOT NULL DEFAULT true,
    -- Non-null only when success = false
    error_code      TEXT        NULL,

    CONSTRAINT export_log_error_consistency
        CHECK (
            (success = false AND error_code IS NOT NULL) OR
            (success = true  AND error_code IS NULL)
        )
);

-- Primary compliance query: all exports for a user, time-sorted
CREATE INDEX IF NOT EXISTS idx_export_logs_user_time
    ON conversation_export_logs (user_id_hash, exported_at DESC);

-- Rate-limit query: recent exports by user in a time window
CREATE INDEX IF NOT EXISTS idx_export_logs_user_recent
    ON conversation_export_logs (user_id_hash, exported_at DESC)
    WHERE success = true;

-- Forensic / incident response: all exports of a specific thread
CREATE INDEX IF NOT EXISTS idx_export_logs_thread_id
    ON conversation_export_logs (thread_id, exported_at DESC);

-- IP-based anomaly detection
CREATE INDEX IF NOT EXISTS idx_export_logs_ip
    ON conversation_export_logs (ip_address, exported_at DESC)
    WHERE ip_address IS NOT NULL;

GRANT SELECT, INSERT ON conversation_export_logs TO CURRENT_USER;
