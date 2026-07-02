"""
SSE Event Unit Tests

Covers serialisation and wire-format correctness for all SSE event dataclasses,
with particular focus on the ``ThreadCreatedEvent`` added in Sprint 3 (A1-WIRE).

Test matrix
  • event_type field is NOT included in the JSON payload (stripped by format_sse)
  • event_type IS used as the SSE ``event:`` line
  • All business fields survive a round-trip through ``format_sse`` → JSON parse
  • ``ThreadCreatedEvent`` carries thread_id, persona, chat_mode
  • Existing events (TokenEvent, ToolActivityEvent, DoneEvent, ErrorEvent,
    SuggestionsEvent) are covered by the shared wire-format contract
"""

import json

import pytest

from app.utils.sse import (
    DoneEvent,
    ErrorEvent,
    SuggestionsEvent,
    ThinkingStepEvent,
    ThreadCreatedEvent,
    TokenEvent,
    ToolActivityEvent,
    format_sse,
)


### Helpers

def _parse_sse_frame(frame: str) -> tuple[str, dict]:
    """
    Parse a raw SSE frame string into (event_type, payload_dict).

    Expects the standard two-line format::

        event: <type>\\n
        data: <json>\\n
        \\n
    """
    lines = [l for l in frame.strip().splitlines() if l]
    assert len(lines) == 2, f"Expected 2 non-empty lines, got {len(lines)}: {lines!r}"

    event_line, data_line = lines
    assert event_line.startswith("event: "), f"Bad event line: {event_line!r}"
    assert data_line.startswith("data: "),   f"Bad data line: {data_line!r}"

    event_type = event_line[len("event: "):]
    payload    = json.loads(data_line[len("data: "):])
    return event_type, payload


### ThreadCreatedEvent — Sprint 3

class TestThreadCreatedEvent:
    def test_event_type_literal(self):
        evt = ThreadCreatedEvent(
            thread_id="tid-001",
            persona="employee",
            chat_mode="quick",
        )
        assert evt.event_type == "thread_created"

    def test_event_type_not_in_json_payload(self):
        evt = ThreadCreatedEvent(
            thread_id="tid-001",
            persona="employee",
            chat_mode="quick",
        )
        _, payload = _parse_sse_frame(format_sse(evt))
        assert "event_type" not in payload

    def test_wire_format_event_line(self):
        evt = ThreadCreatedEvent(
            thread_id="tid-001",
            persona="employee",
            chat_mode="quick",
        )
        event_type, _ = _parse_sse_frame(format_sse(evt))
        assert event_type == "thread_created"

    def test_payload_fields_round_trip(self):
        evt = ThreadCreatedEvent(
            thread_id="550e8400-e29b-41d4-a716-446655440000",
            persona="coach",
            chat_mode="deep_dive",
        )
        _, payload = _parse_sse_frame(format_sse(evt))
        assert payload["thread_id"] == "550e8400-e29b-41d4-a716-446655440000"
        assert payload["persona"]   == "coach"
        assert payload["chat_mode"] == "deep_dive"

    def test_all_personas_accepted(self):
        for persona in ("employee", "coach", "superadmin", "default"):
            evt = ThreadCreatedEvent(
                thread_id="tid-x",
                persona=persona,
                chat_mode="quick",
            )
            _, payload = _parse_sse_frame(format_sse(evt))
            assert payload["persona"] == persona

    def test_all_chat_modes_accepted(self):
        for mode in ("quick", "deep_dive"):
            evt = ThreadCreatedEvent(
                thread_id="tid-x",
                persona="employee",
                chat_mode=mode,
            )
            _, payload = _parse_sse_frame(format_sse(evt))
            assert payload["chat_mode"] == mode

    def test_frame_ends_with_double_newline(self):
        """SSE spec: frames MUST be terminated by a blank line."""
        frame = format_sse(ThreadCreatedEvent(
            thread_id="tid-x",
            persona="employee",
            chat_mode="quick",
        ))
        assert frame.endswith("\n\n")

    def test_payload_contains_exactly_three_fields(self):
        """thread_id, persona, chat_mode — no extras leaking through."""
        evt = ThreadCreatedEvent(
            thread_id="tid-001",
            persona="employee",
            chat_mode="quick",
        )
        _, payload = _parse_sse_frame(format_sse(evt))
        assert set(payload.keys()) == {"thread_id", "persona", "chat_mode"}


### Existing events — regression guard

class TestTokenEvent:
    def test_wire_format(self):
        event_type, payload = _parse_sse_frame(
            format_sse(TokenEvent(text="Hello"))
        )
        assert event_type        == "token"
        assert payload["text"]   == "Hello"
        assert "event_type" not in payload

    def test_empty_text(self):
        _, payload = _parse_sse_frame(format_sse(TokenEvent(text="")))
        assert payload["text"] == ""


class TestToolActivityEvent:
    def test_wire_format_defaults(self):
        event_type, payload = _parse_sse_frame(
            format_sse(ToolActivityEvent(action="Searching…"))
        )
        assert event_type                == "tool_activity"
        assert payload["action"]         == "Searching…"
        assert payload["tool_name"]      is None
        assert payload["reset_stream"]   is False
        assert "event_type" not in payload

    def test_reset_stream_true(self):
        _, payload = _parse_sse_frame(
            format_sse(ToolActivityEvent(
                action="Fetching…",
                tool_name="get_client_snapshot",
                reset_stream=True,
            ))
        )
        assert payload["reset_stream"] is True
        assert payload["tool_name"]    == "get_client_snapshot"


class TestDoneEvent:
    def test_wire_format(self):
        usage = {"input_tokens": 100, "output_tokens": 50}
        event_type, payload = _parse_sse_frame(
            format_sse(DoneEvent(model="claude-x", usage=usage))
        )
        assert event_type         == "done"
        assert payload["model"]   == "claude-x"
        assert payload["usage"]   == usage
        assert "event_type" not in payload


class TestSuggestionsEvent:
    def test_wire_format(self):
        chips = [
            {"display": "Review docs", "submit": "Please summarize key policy docs."},
            {"display": "Compare orgs", "submit": "Compare the two corporations we discussed."},
        ]
        event_type, payload = _parse_sse_frame(format_sse(SuggestionsEvent(chips=chips)))
        assert event_type == "suggestions"
        assert payload["chips"] == chips
        assert "event_type" not in payload


class TestThinkingStepEvent:
    def test_wire_format_defaults(self):
        event_type, payload = _parse_sse_frame(
            format_sse(ThinkingStepEvent(key="parse_intent", status="active"))
        )
        assert event_type        == "thinking_step"
        assert payload["key"]     == "parse_intent"
        assert payload["status"]  == "active"
        assert payload["label"]   is None
        assert "event_type" not in payload

    def test_label_round_trip(self):
        _, payload = _parse_sse_frame(
            format_sse(ThinkingStepEvent(
                key="search_knowledge_base",
                status="active",
                label="Searching knowledge base...",
            ))
        )
        assert payload["key"]   == "search_knowledge_base"
        assert payload["label"] == "Searching knowledge base..."

    def test_done_status(self):
        _, payload = _parse_sse_frame(
            format_sse(ThinkingStepEvent(key="organize_output", status="done"))
        )
        assert payload["status"] == "done"

    def test_payload_contains_exactly_three_fields(self):
        _, payload = _parse_sse_frame(
            format_sse(ThinkingStepEvent(key="parse_intent", status="active"))
        )
        assert set(payload.keys()) == {"key", "status", "label"}


class TestErrorEvent:
    def test_wire_format_defaults(self):
        event_type, payload = _parse_sse_frame(
            format_sse(ErrorEvent(message="Something went wrong."))
        )
        assert event_type        == "error"
        assert payload["message"] == "Something went wrong."
        assert payload["code"]    == "UNKNOWN"
        assert "event_type" not in payload

    def test_custom_code(self):
        _, payload = _parse_sse_frame(
            format_sse(ErrorEvent(message="Timeout", code="TIMEOUT"))
        )
        assert payload["code"] == "TIMEOUT"


### format_sse — cross-cutting contract

class TestFormatSSEContract:
    """All event types must satisfy the shared wire-format contract."""

    EVENTS = [
        TokenEvent(text="hi"),
        ToolActivityEvent(action="Doing something"),
        ThinkingStepEvent(key="search_knowledge_base", status="active", label="x"),
        DoneEvent(model="m", usage={}),
        ErrorEvent(message="err"),
        ThreadCreatedEvent(thread_id="t", persona="employee", chat_mode="quick"),
        SuggestionsEvent(
            chips=[{"display": "A", "submit": "Longer submit text for A." * 2}],
        ),
    ]

    @pytest.mark.parametrize("event", EVENTS)
    def test_frame_starts_with_event_line(self, event):
        frame = format_sse(event)
        assert frame.startswith("event: ")

    @pytest.mark.parametrize("event", EVENTS)
    def test_frame_has_data_line(self, event):
        frame = format_sse(event)
        assert "\ndata: " in frame

    @pytest.mark.parametrize("event", EVENTS)
    def test_data_is_valid_json(self, event):
        _, payload = _parse_sse_frame(format_sse(event))
        assert isinstance(payload, dict)

    @pytest.mark.parametrize("event", EVENTS)
    def test_event_type_not_in_payload(self, event):
        _, payload = _parse_sse_frame(format_sse(event))
        assert "event_type" not in payload
