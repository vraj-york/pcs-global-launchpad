from __future__ import annotations
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class OutcomeEnum(str, Enum):
    ANSWERED = "answered"
    FALLBACK = "fallback"
    DENIED   = "denied"
    ERROR    = "error"


class RoleEnum(str, Enum):
    SUPER_ADMIN = "super_admin"
    MANAGER     = "manager"
    END_USER    = "end_user"


class DenialReasonEnum(str, Enum):
    RBAC_POLICY    = "rbac_policy"
    CONTENT_FILTER = "content_filter"


class ErrorCodeEnum(str, Enum):
    TIMEOUT                   = "TIMEOUT"
    UPSTREAM_FAILURE          = "UPSTREAM_FAILURE"
    INVALID_REQUEST           = "INVALID_REQUEST"
    SENSITIVE_CONTENT_BLOCKED = "SENSITIVE_CONTENT_BLOCKED"
    UNKNOWN                   = "UNKNOWN"


class ChatModeEnum(str, Enum):
    # Must match the PostgreSQL ENUM defined in 002_create_chatbot_audit_logs.sql
    # Note: the application layer uses "quick" / "deep_dive" — callers must map
    # those values to these enum members before constructing an AuditLogEntry.
    QUICK_MODE = "quick_mode"
    DEEP_MODE  = "deep_mode"


class AuditLogEntry(BaseModel):
    #  Identity 
    log_id    : UUID     = Field(default_factory=uuid4)
    timestamp : datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id   : str      = Field(..., max_length=256)
    role      : RoleEnum
    session_id: UUID

    #  Request context 
    chat_mode : ChatModeEnum
    model_id  : Optional[str] = Field(default=None, max_length=256)

    #  Outcome 
    outcome      : OutcomeEnum
    denial_reason: Optional[DenialReasonEnum] = None
    error_code   : Optional[ErrorCodeEnum]    = None

    #  Retrieval 
    # Populated when search_knowledge_base tool was called; empty/0 otherwise.
    retrieved_source_ids : list[str] = Field(default_factory=list)
    retrieved_chunk_count: int       = Field(default=0, ge=0)

    #  Efficiency 
    # Total tool invocations across all agentic loop iterations.
    tool_calls_count: int = Field(default=0, ge=0)

    #  Cost 
    # Sum of tokens across every invoke_model call in the interaction.
    # NULL when the interaction failed before any LLM call completed.
    input_tokens : Optional[int] = Field(default=None, ge=0)
    output_tokens: Optional[int] = Field(default=None, ge=0)

    #  Observability 
    latency_ms    : Optional[int] = Field(default=None, ge=0)
    correlation_id: Optional[str] = Field(default=None, max_length=256)

    # `model_id` trips Pydantic v2’s protected `model_` namespace without this.
    model_config = ConfigDict(
        extra="forbid",
        protected_namespaces=(),
    )

    @field_validator("user_id")
    @classmethod
    def user_id_must_be_hashed(cls, v: str) -> str:
        if "@" in v:
            raise ValueError("user_id must not contain email addresses")
        if len(v.split()) > 1:
            raise ValueError("user_id must not contain spaces — likely a plain name")
        return v

    @field_validator("retrieved_source_ids")
    @classmethod
    def no_free_text_in_source_ids(cls, v: list[str]) -> list[str]:
        for source_id in v:
            if len(source_id) > 256:
                raise ValueError(
                    f"retrieved_source_id '{source_id[:20]}...' exceeds 256 chars"
                )
            if " " in source_id:
                raise ValueError(
                    "retrieved_source_ids must be IDs not free text — spaces detected"
                )
        return v

    @model_validator(mode="after")
    def validate_outcome_consistency(self) -> AuditLogEntry:
        if self.outcome == OutcomeEnum.DENIED and self.denial_reason is None:
            raise ValueError("denial_reason is required when outcome is 'denied'")

        if self.outcome == OutcomeEnum.ERROR and self.error_code is None:
            raise ValueError("error_code is required when outcome is 'error'")

        if self.outcome != OutcomeEnum.DENIED and self.denial_reason is not None:
            raise ValueError("denial_reason must be null when outcome is not 'denied'")

        return self

    def to_db_dict(self) -> dict:
        """Serialize to a flat dict safe for PostgreSQL INSERT."""
        return {
            "log_id"              : str(self.log_id),
            "timestamp"           : self.timestamp.isoformat(),
            "user_id"             : self.user_id,
            "role"                : self.role.value,
            "session_id"          : str(self.session_id),
            "chat_mode"           : self.chat_mode.value,
            "model_id"            : self.model_id,
            "outcome"             : self.outcome.value,
            "denial_reason"       : self.denial_reason.value if self.denial_reason else None,
            "error_code"          : self.error_code.value if self.error_code else None,
            "retrieved_source_ids": self.retrieved_source_ids,
            "retrieved_chunk_count": self.retrieved_chunk_count,
            "tool_calls_count"    : self.tool_calls_count,
            "input_tokens"        : self.input_tokens,
            "output_tokens"       : self.output_tokens,
            "latency_ms"          : self.latency_ms,
            "correlation_id"      : self.correlation_id,
        }
