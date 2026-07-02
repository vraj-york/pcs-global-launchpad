"""This module contains the data models for the conversation(s).

This script bears responsibilities to represent reality and validating domain rules
    i.e. what we choose to be here."""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Any, Dict, List, Optional
from uuid import UUID


#  Chat request / response 

class ChatMention(BaseModel):
    type: str = "person"
    id: str
    label: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v != "person":
            raise ValueError("mention type must be 'person'")
        return v

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("mention id is required")
        if len(trimmed) > 128:
            raise ValueError("mention id is too long")
        return trimmed

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        trimmed = v.strip()
        return trimmed[:80] if trimmed else None

class ChatRequest(BaseModel):
    message: str

    # Valid values: "quick" | "deep_dive"
    #
    # AUDIT NOTE — chat_mode naming mismatch:
    # The audit schema (AuditLogEntry.chat_mode) uses a PostgreSQL ENUM with values
    # "quick_mode" and "deep_mode", which differ from the strings used here.
    # When constructing an AuditLogEntry from a ChatRequest, map as follows:
    #   "quick"     → ChatModeEnum.QUICK_MODE  ("quick_mode")
    #   "deep_dive" → ChatModeEnum.DEEP_MODE   ("deep_mode")
    chat_mode: str = "quick"

    user_type: Optional[str] = None
    max_tokens: Optional[int] = 4096
    temperature: Optional[float] = 0.45
    system_prompt: Optional[str] = None

    # Stable UUID for grouping turns of the same conversation in audit logs.
    # The frontend should generate this once when a conversation starts and send
    # it with every subsequent message. If absent, the service generates a fresh
    # UUID per request — each turn will appear as a separate conversation in the
    # audit log until the frontend sends a real session_id.
    session_id: Optional[UUID] = None

    #  Coach persona context 
    # Two paths for getting client context into the coach chatbot:
    #
    # PATH A — client_snapshot (Phase 1, current):
    #   Frontend fetches the snapshot and sends the full dict here.
    #   build_context_plane() formats coach snapshot into the dynamic tier.
    #   Use when the backend API is not yet available.
    #
    # PATH B — client_id (Phase 2, tool-based):
    #   Frontend sends only the client ID. The LLM calls get_client_snapshot
    #   tool autonomously on its first turn, receiving the snapshot as a
    #   tool_result message rather than baking it into the system prompt.
    #   This is the target architecture once the backend API exists.
    #
    # Precedence: if client_snapshot is provided, it is used directly (Path A).
    # client_id is used only when client_snapshot is absent (Path B).
    client_snapshot: Optional[Dict[str, Any]] = None
    client_id      : Optional[str]            = None

    # Persisted thread ID (Thread & Trim).
    # When provided the service loads conversation history from the DB and
    # persists the new message pair after the response is generated.
    # When absent the request is stateless (no persistence, no DB reads).
    #
    # Upgrade path: remains optional forever — stateless callers continue to
    # work without modification as thread persistence is opt-in per request.
    thread_id: Optional[UUID] = None

    #  Multi-turn conversation history 
    # Prior turns of the current conversation, sent by the frontend so the LLM
    # has context across messages. Required for multi-turn flows like session
    # notes generation (coach describes session across several messages, then
    # asks for notes on a later turn).
    #
    # When thread_id is present the service loads history from the DB instead;
    # this field is used as a fallback only when the DB has no messages yet or
    # when thread_id is absent (backward-compatible stateless mode).
    #
    # Format: [{"role": "user"|"assistant", "content": "..."},  ...]
    # Rules: roles must alternate user/assistant, list must start with "user".
    # If absent, the LLM treats each request as stateless (no prior context).
    conversation_history: Optional[List[Dict[str, Any]]] = None

    # Structured @mentions selected in the composer. The frontend sends stable
    # ids; the chatbot service re-resolves them against backend authorization
    # before any peer behavioral context reaches the model.
    mentions: Optional[List[ChatMention]] = None

    @field_validator("conversation_history")
    @classmethod
    def validate_history_roles(
        cls, v: Optional[List[Dict[str, Any]]]
    ) -> Optional[List[Dict[str, Any]]]:
        if not v:
            return v
        valid_roles = {"user", "assistant"}
        sanitised = [
            m for m in v
            if isinstance(m, dict)
            and m.get("role") in valid_roles
            and isinstance(m.get("content"), str)
            and m["content"].strip()
        ]
        return sanitised or None

    @field_validator("mentions")
    @classmethod
    def validate_mentions(
        cls, v: Optional[List[ChatMention]]
    ) -> Optional[List[ChatMention]]:
        if not v:
            return None
        deduped: list[ChatMention] = []
        seen: set[str] = set()
        for mention in v:
            if mention.id in seen:
                continue
            seen.add(mention.id)
            deduped.append(mention)
            if len(deduped) > 3:
                raise ValueError("at most 3 people can be mentioned")
        return deduped


class MemoryCitationRef(BaseModel):
    id: str
    kind: str
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    model: str
    usage: dict
    memory_citations: Optional[List[MemoryCitationRef]] = None


#  Memory request / response 

class MemoryCreateRequest(BaseModel):
    kind: str
    text: str
    bsp_dimension: Optional[str] = None
    scope_type: Optional[str] = None
    entities: Optional[List[str]] = None


class MemoryUpdateRequest(BaseModel):
    text: str


class MemoryRecordResponse(BaseModel):
    id: str
    kind: str
    bsp_dimension: Optional[str] = None
    scope_type: Optional[str] = None
    scope_ref: Optional[str] = None
    sensitivity: Optional[str] = None
    text: str
    entities: List[str] = Field(default_factory=list)
    importance: Optional[float] = None
    status: str
    user_edited: bool = False
    source_message_id: Optional[str] = None
    source_conversation_id: Optional[str] = None
    created_at: Optional[str] = None


class MemoryListResponse(BaseModel):
    memories: List[MemoryRecordResponse]
    pending_candidate_count: int = 0


class MemoryConsentResponse(BaseModel):
    granted: bool
    scope: str = "memory_extraction"
    source: str = "ui"
    granted_at: Optional[str] = None
    revoked_at: Optional[str] = None


class MemoryConsentUpdateRequest(BaseModel):
    granted: bool
    source: str = "ui"


#  Thread request / response 

class ThreadCreateRequest(BaseModel):
    """Body for POST /threads."""

    persona   : str           = "employee"
    chat_mode : str           = "quick"
    coach_client_id: Optional[str] = None
    title     : Optional[str] = None


class ThreadPatchRequest(BaseModel):
    """Body for PATCH /threads/{thread_id} — all fields optional."""

    title : Optional[str]  = None
    pinned: Optional[bool] = None


class ThreadResponse(BaseModel):
    """Single conversation thread row returned by the API."""

    id              : str
    title           : str
    pinned          : bool
    persona         : str
    chat_mode       : str
    coach_client_id : Optional[str]
    created_at      : datetime
    updated_at      : datetime
    last_message_at : Optional[datetime]


class ThreadListResponse(BaseModel):
    """Paginated list of threads."""

    threads: List[ThreadResponse]
    total  : int


#  Message response 

class MessageResponse(BaseModel):
    """
    Single decrypted message row returned by GET /threads/{id}/messages.

    ``content`` is the plaintext string (encryption is transparent to the API).
    """

    id               : str
    conversation_id  : str
    role             : str
    content          : str
    tokens_in        : Optional[int]
    tokens_out       : Optional[int]
    follow_up_chips  : Optional[List[Dict[str, Any]]] = None
    created_at       : datetime


class ThreadMessagesResponse(BaseModel):
    """Paginated list of messages for a thread."""

    messages        : List[MessageResponse]
    has_more        : bool


class GenerateTitleRequest(BaseModel):
    """Body for POST /threads/{thread_id}/generate-title."""

    user_message   : str
    assistant_reply: str


class GenerateTitleResponse(BaseModel):
    """Response from POST /threads/{thread_id}/generate-title."""

    thread_id: str
    title    : str


#  Proactive employee empty-state payload 

class ProactiveOption(BaseModel):
    """Single actionable option rendered as a card/chip/button in proactive UI."""

    id         : str
    label      : str
    submit     : str
    icon       : str
    description: Optional[str] = None
    tone       : Optional[str] = None


class ProactiveAssistantMessage(BaseModel):
    """Assistant block shown in the proactive empty-state sequence."""

    id               : str
    lines            : List[str]
    options          : List[ProactiveOption] = Field(default_factory=list)
    show_waiting_hint: bool                  = False
    waiting_hint     : Optional[str]         = None


class ProactiveEmployeeStage(BaseModel):
    """One visual phase in the proactive idle flow (phase 0/1/2)."""

    phase             : int
    title             : Optional[str] = None
    subtitle          : Optional[str] = None
    cards             : List[ProactiveOption] = Field(default_factory=list)
    bispy_choices     : List[ProactiveOption] = Field(default_factory=list)
    assistant_messages: List[ProactiveAssistantMessage] = Field(default_factory=list)


class ProactiveEmployeePeer(BaseModel):
    """Mock peer context until team/assessment APIs are available."""

    employee_id             : str
    display_name            : str
    relation                : str = "peer"
    mock_assessment_summary : str


class ProactiveEmployeeContext(BaseModel):
    """Employee context that personalises proactive prompts."""

    display_name: str
    role_scope  : str
    mock_data   : bool = True
    peers       : List[ProactiveEmployeePeer] = Field(default_factory=list)


class ProactiveEmployeeNudgeConfig(BaseModel):
    """Idle thresholds that control proactive phase transitions."""

    first_idle_ms : int
    second_idle_ms: int


class ProactiveEmployeeResponse(BaseModel):
    """Backend contract for employee proactive empty-state payload."""

    version  : str
    mock_data: bool
    context  : ProactiveEmployeeContext
    nudge    : ProactiveEmployeeNudgeConfig
    stages   : List[ProactiveEmployeeStage]


#  Assessment-trigger session bootstrap 

class AssessmentTriggerRequest(BaseModel):
    """Body for POST /sessions/assessment-trigger."""

    assessment_id: UUID
    display_name : Optional[str] = None
    category     : Optional[str] = None
    score        : Optional[str] = None
    persona      : str           = "employee"
    chat_mode    : str           = "quick"


class AssessmentTriggerOpeningMessage(BaseModel):
    """Assistant-first opener persisted on the new thread."""

    id              : str
    content         : str
    created_at      : datetime
    follow_up_chips : Optional[List[Dict[str, Any]]] = None


class AssessmentTriggerResponse(BaseModel):
    """Response from POST /sessions/assessment-trigger."""

    assessment_id  : str
    thread         : ThreadResponse
    opening_message: AssessmentTriggerOpeningMessage


#  Growth Spark daily dashboard snippet 

class GrowthSparkGenerateRequest(BaseModel):
    """Body for POST /growth-spark/generate."""

    display_name        : Optional[str] = None
    style_title         : Optional[str] = None
    style_summary       : Optional[str] = None
    dominant_mind_state : Optional[str] = None
    spark_date          : str
    timezone            : Optional[str] = None
    team_context        : Optional[str] = None

    @field_validator("spark_date")
    @classmethod
    def validate_spark_date(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) != 10 or trimmed[4] != "-" or trimmed[7] != "-":
            raise ValueError("spark_date must be yyyy-MM-dd")
        return trimmed


class GrowthSparkGenerateResponse(BaseModel):
    """Response from POST /growth-spark/generate."""

    title     : str
    body      : str
    source    : str
    spark_date: str
