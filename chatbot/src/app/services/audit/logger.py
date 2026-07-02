import os
from functools import lru_cache
from uuid import UUID, uuid4
from datetime import datetime, timezone

from aws_lambda_powertools import Logger
from .schemas import AuditLogEntry
from .content_guardrail import assert_no_sensitive_content, SensitiveContentViolation
from app.infrastructure.database import DatabaseClient

# Powertools logger — structured JSON output to CloudWatch automatically
logger = Logger(
    service="chatbot-audit",
    level=os.environ.get("LOG_LEVEL", "INFO")
)


@lru_cache(maxsize=1)
def _get_db_client() -> DatabaseClient:
    """Module-level singleton so write_audit_log never creates a new DB connection per call."""
    return DatabaseClient()


def write_audit_log(entry: AuditLogEntry) -> None:
    """
    Final gate + dual write:

    1. Sensitive content guardrail — scans the serialised row for PII patterns
       and free text. On violation: logs the incident to CloudWatch and writes
       a sanitized fallback row. The PII-containing row is never written.
    2. Structured JSON to CloudWatch via Powertools (always succeeds).
    3. INSERT into RDS chatbot_audit_logs (queryable, role-scoped).

    RDS failure is caught and logged — audit must never break the chatbot response.
    """
    db_dict = entry.to_db_dict()

    #  1. Sensitive content guardrail 
    try:
        assert_no_sensitive_content(db_dict)
    except SensitiveContentViolation as e:
        logger.error("audit_log_blocked_sensitive_content", extra={
            "log_id"   : db_dict.get("log_id"),
            "outcome"  : db_dict.get("outcome"),
            "violation": str(e),
        })
        _write_sanitized_fallback(db_dict)
        return

    #  2. CloudWatch structured log 
    logger.info("audit_log", extra={"audit": db_dict})

    #  3. RDS INSERT 
    _write_to_rds(db_dict)


def _write_sanitized_fallback(original: dict) -> None:
    """
    When sensitive content is detected in an audit row, write a minimal
    fallback row that preserves auditability without any of the offending fields.

    Safe fields kept  : log_id, timestamp, session_id, role, chat_mode,
                        latency_ms, tool_calls_count, input_tokens, output_tokens
    Redacted/nulled   : user_id → REDACTED, correlation_id/model_id/denial_reason → None,
                        retrieved_source_ids → [], outcome → error

    The fallback is routed through AuditLogEntry to enforce schema validation
    before any DB write.
    """
    try:
        raw_session = original.get("session_id")
        session_id  = UUID(str(raw_session)) if raw_session else uuid4()

        raw_log_id = original.get("log_id")
        log_id     = UUID(str(raw_log_id)) if raw_log_id else uuid4()

        raw_ts    = original.get("timestamp")
        timestamp = (
            datetime.fromisoformat(raw_ts) if isinstance(raw_ts, str)
            else raw_ts if isinstance(raw_ts, datetime)
            else datetime.now(timezone.utc)
        )

        entry = AuditLogEntry(
            log_id                = log_id,
            timestamp             = timestamp,
            user_id               = "REDACTED",
            role                  = original.get("role", "end_user"),
            session_id            = session_id,
            chat_mode             = original.get("chat_mode", "quick_mode"),
            model_id              = None,
            outcome               = "error",
            denial_reason         = None,
            error_code            = "SENSITIVE_CONTENT_BLOCKED",
            retrieved_source_ids  = [],
            retrieved_chunk_count = 0,
            tool_calls_count      = original.get("tool_calls_count", 0),
            input_tokens          = original.get("input_tokens"),
            output_tokens         = original.get("output_tokens"),
            latency_ms            = original.get("latency_ms"),
            correlation_id        = None,
        )
        fallback = entry.to_db_dict()
    except Exception as e:
        logger.error("audit_sanitized_fallback_construction_failed", extra={"error": str(e)})
        return

    logger.warning("audit_log_sanitized_fallback_written", extra={"log_id": fallback["log_id"]})
    _write_to_rds(fallback)


def _write_to_rds(data: dict) -> None:
    sql = """
        INSERT INTO chatbot_audit_logs (
            log_id, timestamp, user_id, role, session_id,
            chat_mode, model_id,
            outcome, denial_reason, error_code,
            retrieved_source_ids, retrieved_chunk_count,
            tool_calls_count,
            input_tokens, output_tokens,
            latency_ms, correlation_id
        ) VALUES (
            %(log_id)s, %(timestamp)s, %(user_id)s, %(role)s, %(session_id)s,
            %(chat_mode)s, %(model_id)s,
            %(outcome)s, %(denial_reason)s, %(error_code)s,
            %(retrieved_source_ids)s, %(retrieved_chunk_count)s,
            %(tool_calls_count)s,
            %(input_tokens)s, %(output_tokens)s,
            %(latency_ms)s, %(correlation_id)s
        )
    """
    try:
        db = _get_db_client()
        with db.get_cursor(dict_cursor=False) as cursor:
            cursor.execute(sql, data)
    except Exception as e:
        # Log to CloudWatch but do NOT re-raise.
        # A logging failure must never break the chatbot interaction.
        logger.error("audit_log_rds_write_failed", extra={
            "error"           : str(e),
            "log_id"          : data.get("log_id"),
            "outcome"         : data.get("outcome"),
            "chat_mode"       : data.get("chat_mode"),
            "tool_calls_count": data.get("tool_calls_count"),
        })
