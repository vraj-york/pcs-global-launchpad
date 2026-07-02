"""
Server-Sent Events (SSE) Utilities

Defines the structured event schema for streaming chatbot responses and
provides a formatter that serialises events to the SSE wire format.

Event taxonomy

token           Incremental text chunk from the LLM's final response turn.
                Emitted once per streamed delta from Bedrock.

tool_activity   Progress signal emitted during agentic-loop tool calls.
                Gives the user visible feedback instead of a frozen cursor.

thinking_step   Phase-level lifecycle signal (parse_intent / scan_context /
                organize_output) driving the Gemini-style thinking timeline.
                Carries a ``status`` (active|done) and optional dynamic detail.

done            Terminal success event — the stream is complete.
                Carries model ID and accumulated usage metadata.

error           Terminal failure event — the stream is ending abnormally.
                Carries a human-readable message and a short error code.

suggestions     Optional frame after ``done`` with up to two objects
                ``{{"display", "submit"}}`` (short chip label + message sent on
                click). Client prepends the fixed summarize chip.

Wire format (per SSE spec — https://html.spec.whatwg.org/multipage/server-sent-events.html)

    event: <event_type>\\n
    data: <json_payload>\\n
    \\n

Consumers must handle partial-chunk reads — the '\\n\\n' frame boundary
may arrive split across TCP packets. The frontend SSE parser buffers
raw bytes until it sees a complete frame before deserialising.

Usage

    from app.utils.sse import TokenEvent, DoneEvent, format_sse

    yield format_sse(TokenEvent(text="Hello"))
    yield format_sse(DoneEvent(model="claude-...", usage={...}))
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from typing import Literal, Optional

logger = logging.getLogger(__name__)

#  Event type literals 

SSEEventType = Literal[
    "token",
    "tool_activity",
    "thinking_step",
    "done",
    "error",
    "thread_created",
    "suggestions",
]


#  Event dataclasses 

@dataclass
class TokenEvent:
    """Incremental text chunk from the LLM final-response turn."""

    text: str
    event_type: SSEEventType = field(default="token", init=False, repr=False)


@dataclass
class ToolActivityEvent:
    """
    Progress signal emitted while the agentic loop executes a tool.

    *action* is the human-readable string shown in the UI
    (e.g. "Searching knowledge base...", "Fetching corporation details...").
    *tool_name* is the internal tool identifier for client-side logic that
    wants to display tool-specific icons or messaging.
    *reset_stream* — when True the frontend should discard any partial text
    that was being streamed before this event (i.e. the LLM began answering
    with a brief preamble but then decided to call a tool; the preamble is
    not the final answer). Only set on the first tool_activity event that
    follows one or more streamed token events.
    """

    action: str
    tool_name: Optional[str] = None
    reset_stream: bool = False
    event_type: SSEEventType = field(default="tool_activity", init=False, repr=False)


@dataclass
class ThinkingStepEvent:
    """
    A row in the Gemini-style "thinking" timeline.

    Two kinds of steps flow over this channel:

      * Fixed lifecycle phases (the client owns their copy + icon):
          - ``parse_intent``    — understanding the question / routing.
          - ``scan_context``    — memory + context retrieval.
          - ``organize_output`` — the model is composing the final answer.
      * Dynamic tool steps (one per tool the agent actually invokes), whose
        *key* is the tool identifier (e.g. ``search_knowledge_base``) and whose
        *label* carries a human-readable fallback (e.g. "Searching knowledge
        base..."). The client maps known tools to richer copy + icons and
        falls back to *label* for anything unknown.

    *status* transitions forward only: ``active`` → ``done`` (the client
    treats it monotonically). *label* is only set for dynamic tool steps.
    """

    key: str
    status: str  # "active" | "done"
    label: Optional[str] = None
    event_type: SSEEventType = field(default="thinking_step", init=False, repr=False)


@dataclass
class DoneEvent:
    """Terminal success event — stream is fully complete."""

    model: str
    usage: dict
    event_type: SSEEventType = field(default="done", init=False, repr=False)


@dataclass
class ThreadCreatedEvent:
    """
    Emitted as the *first* SSE frame when the server auto-creates a thread.

    Allows the frontend to:
      1. Add the new thread to the sidebar (prependThread in chatbotStore).
      2. Set activeThreadId so subsequent requests carry the correct thread_id.
      3. Include thread_id in any follow-up messages within the same session.

    Fields mirror the ThreadResponse schema so the frontend can hydrate a
    ChatbotThread object directly from this event payload.
    """

    thread_id : str
    persona   : str
    chat_mode : str
    event_type: SSEEventType = field(default="thread_created", init=False, repr=False)


@dataclass
class SuggestionsEvent:
    """
    Follow-up chips emitted after the main assistant stream completes.

    *chips* is 0–2 objects ``{{"display": str, "submit": str}}`` — short UI
    label plus longer text sent as the next user message. The client still
    prepends the fixed summarize chip.
    """

    chips: list
    event_type: SSEEventType = field(default="suggestions", init=False, repr=False)


@dataclass
class ErrorEvent:
    """
    Terminal failure event — stream is ending due to an error.

    *code* is a short machine-readable string the frontend can branch on
    (e.g. "TIMEOUT", "RBAC_DENIED", "CONTENT_FILTER", "UPSTREAM_FAILURE").
    """

    message: str
    code: str = "UNKNOWN"
    event_type: SSEEventType = field(default="error", init=False, repr=False)


# Union alias used in type annotations across the streaming pipeline.
SSEEvent = (
    TokenEvent
    | ToolActivityEvent
    | ThinkingStepEvent
    | DoneEvent
    | SuggestionsEvent
    | ErrorEvent
    | ThreadCreatedEvent
)


#  Formatter 

def format_sse(event: SSEEvent) -> str:
    """
    Serialise an SSEEvent to the SSE wire-format string.

    The *event_type* field is extracted and used as the SSE ``event:`` name;
    it is not included in the ``data:`` JSON payload so consumers only see
    the business-relevant fields when they parse the data line.

    Args:
        event: Any SSEEvent dataclass instance.

    Returns:
        A complete SSE frame ready to be written to a StreamingResponse body::

            event: token\\n
            data: {"text": "Hello"}\\n
            \\n
    """
    payload = asdict(event)
    event_type = payload.pop("event_type")
    return f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
