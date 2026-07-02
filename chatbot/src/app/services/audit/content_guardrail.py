"""
Audit Content Guardrail

Pattern-based detection of PII and free text that might slip through
structurally valid audit log fields. Runs as the final gate in
write_audit_log() before any write to CloudWatch or RDS.

If a violation is detected the full row is blocked and a sanitized fallback
row is written instead, preserving auditability without the offending content.
"""
from __future__ import annotations

import re

from aws_lambda_powertools import Logger

logger = Logger(service="chatbot-audit-guardrail")


#  PII Detection Patterns 

PII_PATTERNS = {
    "email"      : re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    "phone_us"   : re.compile(r"\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    "ssn"        : re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
    "ip_address" : re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "aws_key"    : re.compile(r"AKIA[0-9A-Z]{16}"),
}

# Fields that should only contain IDs or short tokens — never sentences.
# Retrieved source IDs are filenames, not free text.
ID_ONLY_FIELDS = {
    "log_id",
    "session_id",
    "correlation_id",
    "retrieved_source_ids",
    "user_id",
}

# Heuristic: if a string field contains more than this many words it is likely free text.
FREE_TEXT_WORD_THRESHOLD = 5


class SensitiveContentViolation(Exception):
    def __init__(self, field: str, reason: str):
        self.field  = field
        self.reason = reason
        super().__init__(f"Sensitive content in field '{field}': {reason}")


def check_for_pii(field: str, value: str) -> None:
    """Scan a string value for known PII patterns."""
    for pii_type, pattern in PII_PATTERNS.items():
        if pattern.search(value):
            raise SensitiveContentViolation(
                field =field,
                reason=f"Possible {pii_type} detected",
            )


def check_for_free_text(field: str, value: str) -> None:
    """
    Heuristic check — if an ID-only field contains multiple words
    it likely has free text leaked into it.
    """
    if field in ID_ONLY_FIELDS:
        word_count = len(value.split())
        if word_count > FREE_TEXT_WORD_THRESHOLD:
            raise SensitiveContentViolation(
                field =field,
                reason=f"Field expects an ID but contains {word_count} words — possible free text",
            )


def assert_no_sensitive_content(log_data: dict) -> None:
    """
    Full sensitive content scan across all string fields in the audit row.

    Scans both top-level string values and items in list fields
    (covers retrieved_source_ids).

    Raises SensitiveContentViolation aggregating all violations found.
    The caller (write_audit_log) catches this and writes a sanitized
    fallback row rather than dropping the audit event entirely.
    """
    violations: list[SensitiveContentViolation] = []

    for field, value in log_data.items():
        if isinstance(value, str):
            try:
                check_for_pii(field, value)
                check_for_free_text(field, value)
            except SensitiveContentViolation as e:
                violations.append(e)

        elif isinstance(value, list):
            for item in value:
                if isinstance(item, str):
                    try:
                        check_for_pii(field, item)
                        check_for_free_text(field, item)
                    except SensitiveContentViolation as e:
                        violations.append(e)

    if violations:
        for v in violations:
            logger.error("sensitive_content_guardrail_triggered", extra={
                "field" : v.field,
                "reason": v.reason,
            })
        raise SensitiveContentViolation(
            field ="multiple" if len(violations) > 1 else violations[0].field,
            reason=f"{len(violations)} violation(s) detected — log entry blocked",
        )
