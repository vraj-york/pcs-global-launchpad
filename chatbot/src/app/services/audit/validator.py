from __future__ import annotations
from pydantic import ValidationError
from .schemas import AuditLogEntry
from aws_lambda_powertools import Logger

logger = Logger(service="chatbot-audit")

# Hard ceiling on any individual string field
MAX_FIELD_LENGTH = 256

# Exact set of allowed fields — nothing else passes through
ALLOWED_FIELDS = {
    "log_id", "timestamp", "user_id", "role", "session_id",
    "chat_mode", "model_id",
    "outcome", "denial_reason", "error_code",
    "retrieved_source_ids", "retrieved_chunk_count",
    "tool_calls_count",
    "input_tokens", "output_tokens",
    "latency_ms", "correlation_id",
}


class LogSchemaViolation(Exception):
    pass


def validate_no_free_text(data: dict) -> None:
    """
    Structural check before Pydantic validation.
    Catches rogue fields and oversized strings that
    suggest free text leaked into the log payload.
    """

    # 1. No unexpected fields
    unexpected = set(data.keys()) - ALLOWED_FIELDS
    if unexpected:
        raise LogSchemaViolation(
            f"Unexpected fields detected — possible free text leak: {unexpected}"
        )

    # 2. No string field exceeds max length
    for key, value in data.items():
        if isinstance(value, str) and len(value) > MAX_FIELD_LENGTH:
            raise LogSchemaViolation(
                f"Field '{key}' exceeds {MAX_FIELD_LENGTH} chars "
                f"({len(value)} chars) — possible free text leak"
            )

    # 3. No list item exceeds max length (covers retrieved_source_ids)
    if "retrieved_source_ids" in data:
        for item in data["retrieved_source_ids"]:
            if isinstance(item, str) and len(item) > MAX_FIELD_LENGTH:
                raise LogSchemaViolation(
                    f"retrieved_source_ids item exceeds {MAX_FIELD_LENGTH} chars"
                )


def build_and_validate_log(raw: dict) -> AuditLogEntry:
    """
    Full validation pipeline:
    1. Structural free-text check
    2. Pydantic schema + business rule validation
    Returns a validated AuditLogEntry ready to write.
    """
    try:
        validate_no_free_text(raw)
    except LogSchemaViolation as e:
        logger.error("log_schema_violation", extra={"reason": str(e)})
        raise

    try:
        return AuditLogEntry(**raw)
    except ValidationError as e:
        logger.error("log_validation_error", extra={"errors": e.errors()})
        raise
