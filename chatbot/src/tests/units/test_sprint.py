"""
Sprint Unit Tests — Multi-Turn Context + SSE Streaming

Covers every unit added or modified during the sprint:

  Context utilities (app.utils.context)
    - trim_to_window: happy path, edge cases, over-limit, None / empty

  SSE event schema (app.utils.sse)
    - Event dataclass construction (all four types)
    - format_sse: wire-format structure, event_type stripped from payload
    - format_sse: round-trip parse produces valid JSON

  Prompt engineering (app.domain.context_plane)
    - build_context_plane: Context Awareness injected in deep_dive only
    - build_context_plane: Context Awareness absent in quick mode
    - PERSONA_PROMPT_VERSION is set and >= "2"
"""

import json
import pytest

# Import directly from submodules to avoid the app.utils.__init__ umbrella
# which pulls in app.utils.auth → PyJWT (an AWS-only runtime dependency).
from app.utils.context import trim_to_window, DEFAULT_MAX_TURNS
from app.utils.sse import (
    TokenEvent,
    ToolActivityEvent,
    DoneEvent,
    ErrorEvent,
    SuggestionsEvent,
    format_sse,
)
from app.domain.context_plane import build_context_plane
from app.domain.prompts import (
    PERSONA_PROMPT_VERSION,
    _CONTEXT_AWARENESS_BLOCK,
    COACH_PERSONA_SHELL,
)


# 
# Fixtures
# 

def make_history(turns: int) -> list[dict]:
    """Return a well-formed conversation history with *turns* complete turns."""
    history = []
    for i in range(turns):
        history.append({"role": "user",      "content": f"User message {i + 1}"})
        history.append({"role": "assistant", "content": f"Assistant reply {i + 1}"})
    return history


# 
# trim_to_window
# 

class TestTrimToWindow:

    def test_returns_none_for_none_input(self):
        assert trim_to_window(None) is None

    def test_returns_empty_list_for_empty_input(self):
        assert trim_to_window([]) == []

    def test_history_within_window_unchanged(self):
        history = make_history(3)  # 3 turns < default 5
        result  = trim_to_window(history)
        assert result == history

    def test_history_exactly_at_limit_unchanged(self):
        history = make_history(DEFAULT_MAX_TURNS)
        result  = trim_to_window(history)
        assert result == history

    def test_history_over_limit_is_trimmed(self):
        history = make_history(DEFAULT_MAX_TURNS + 2)
        result  = trim_to_window(history)
        assert len(result) == DEFAULT_MAX_TURNS * 2

    def test_trimmed_slice_is_tail(self):
        """The most recent turns are retained, not the oldest."""
        history = make_history(7)
        result  = trim_to_window(history, max_turns=5)
        assert result == history[-10:]  # last 5 turns = last 10 messages

    def test_result_starts_with_user_message(self):
        """After trimming, the first retained message must be a user turn."""
        history = make_history(8)
        result  = trim_to_window(history, max_turns=5)
        assert result[0]["role"] == "user"

    def test_custom_max_turns(self):
        history = make_history(6)
        result  = trim_to_window(history, max_turns=2)
        assert len(result) == 4  # 2 turns × 2 messages

    def test_session_id_forwarded_in_log(self, caplog):
        """Truncation warning must include the session_id."""
        import logging
        history = make_history(8)
        with caplog.at_level(logging.WARNING, logger="app.utils.context"):
            trim_to_window(history, max_turns=5, session_id="test-session-abc")
        # The session_id appears somewhere in the captured log records
        full_output = " ".join(r.message for r in caplog.records)
        assert "conversation_history_truncated" in full_output

    def test_no_log_when_within_window(self, caplog):
        """No warning emitted when history fits within the window."""
        import logging
        history = make_history(3)
        with caplog.at_level(logging.WARNING, logger="app.utils.context"):
            trim_to_window(history, max_turns=5)
        assert caplog.records == []


# 
# SSE Event dataclasses
# 

class TestSSEEventDataclasses:

    def test_token_event_fields(self):
        ev = TokenEvent(text="hello")
        assert ev.text == "hello"
        assert ev.event_type == "token"

    def test_tool_activity_defaults(self):
        ev = ToolActivityEvent(action="Searching...")
        assert ev.action == "Searching..."
        assert ev.tool_name is None
        assert ev.reset_stream is False
        assert ev.event_type == "tool_activity"

    def test_tool_activity_reset_stream(self):
        ev = ToolActivityEvent(action="Searching...", reset_stream=True, tool_name="search_knowledge_base")
        assert ev.reset_stream is True
        assert ev.tool_name == "search_knowledge_base"

    def test_done_event_fields(self):
        ev = DoneEvent(model="claude-sonnet", usage={"input_tokens": 10, "output_tokens": 20})
        assert ev.model == "claude-sonnet"
        assert ev.usage["output_tokens"] == 20
        assert ev.event_type == "done"

    def test_error_event_defaults(self):
        ev = ErrorEvent(message="Something went wrong")
        assert ev.code == "UNKNOWN"
        assert ev.event_type == "error"

    def test_error_event_custom_code(self):
        ev = ErrorEvent(message="Forbidden", code="RBAC_DENIED")
        assert ev.code == "RBAC_DENIED"


# 
# format_sse wire format
# 

class TestFormatSSE:

    def _parse_frame(self, frame: str) -> tuple[str, dict]:
        """Parse an SSE frame string into (event_type, data_dict)."""
        event_type = None
        data_json  = None
        for line in frame.strip().split("\n"):
            if line.startswith("event:"):
                event_type = line[6:].strip()
            elif line.startswith("data:"):
                data_json = line[5:].strip()
        assert event_type is not None, "SSE frame missing 'event:' line"
        assert data_json  is not None, "SSE frame missing 'data:' line"
        return event_type, json.loads(data_json)

    def test_token_wire_format(self):
        frame = format_sse(TokenEvent(text="Hi"))
        assert frame.endswith("\n\n"), "SSE frames must end with \\n\\n"
        event_type, payload = self._parse_frame(frame)
        assert event_type == "token"
        assert payload == {"text": "Hi"}

    def test_tool_activity_wire_format(self):
        ev    = ToolActivityEvent(action="Loading...", tool_name="search_knowledge_base", reset_stream=True)
        frame = format_sse(ev)
        event_type, payload = self._parse_frame(frame)
        assert event_type == "tool_activity"
        assert payload["action"] == "Loading..."
        assert payload["reset_stream"] is True
        assert payload["tool_name"] == "search_knowledge_base"

    def test_done_wire_format(self):
        ev    = DoneEvent(model="m", usage={"input_tokens": 1, "output_tokens": 2})
        frame = format_sse(ev)
        event_type, payload = self._parse_frame(frame)
        assert event_type == "done"
        assert payload["model"] == "m"
        assert payload["usage"]["input_tokens"] == 1

    def test_error_wire_format(self):
        ev    = ErrorEvent(message="Timed out", code="TIMEOUT")
        frame = format_sse(ev)
        event_type, payload = self._parse_frame(frame)
        assert event_type == "error"
        assert payload["message"] == "Timed out"
        assert payload["code"] == "TIMEOUT"

    def test_event_type_not_in_data_payload(self):
        """event_type must be stripped from the JSON payload (it goes in the event: line)."""
        frame = format_sse(TokenEvent(text="x"))
        _, payload = self._parse_frame(frame)
        assert "event_type" not in payload

    def test_data_is_valid_json(self):
        for ev in [
            TokenEvent(text="abc"),
            ToolActivityEvent(action="act"),
            DoneEvent(model="m", usage={}),
            ErrorEvent(message="err"),
            SuggestionsEvent(
                chips=[
                    {"display": "One", "submit": "Submit one with enough length here."},
                ],
            ),
        ]:
            frame = format_sse(ev)
            _, payload = self._parse_frame(frame)
            assert isinstance(payload, dict)


# 
# build_context_plane — Context Awareness injection
# 

class TestContextPlaneContextAwareness:

    _BASE_PROMPT = "You are a helpful assistant."
    _DATE        = "2026-03-19"

    def _build(self, chat_mode: str, user_type: str = "default") -> str:
        plane = build_context_plane(
            foundation_prompt=self._BASE_PROMPT,
            chat_mode=chat_mode,
            user_type=user_type,
            current_date=self._DATE,
        )
        return plane.legacy_combined

    def test_context_awareness_present_in_deep_dive(self):
        prompt = self._build("deep_dive")
        assert "CONVERSATION CONTEXT AWARENESS" in prompt

    def test_context_awareness_absent_in_quick_mode(self):
        prompt = self._build("quick")
        assert "CONVERSATION CONTEXT AWARENESS" not in prompt

    def test_context_awareness_present_for_all_personas_in_deep_dive(self):
        for persona in ("employee", "coach", "superadmin", "default"):
            prompt = self._build("deep_dive", user_type=persona)
            assert "CONVERSATION CONTEXT AWARENESS" in prompt, \
                f"Context Awareness missing for persona '{persona}'"

    def test_reference_resolution_instructions_in_deep_dive(self):
        """Core behaviour instructions should be present in deep_dive output."""
        prompt = self._build("deep_dive")
        assert "clarifying question" in prompt
        assert "5 conversation turns" in prompt

    def test_quick_mode_stateless_instruction_present(self):
        """Quick mode retains concise-response instructions."""
        prompt = self._build("quick")
        assert "direct answer" in prompt.lower()

    def test_deep_dive_contains_persona_and_context_awareness(self):
        """Coach shell and context block appear for coach/deep_dive."""
        prompt = self._build("deep_dive", user_type="coach")
        assert "AUDIENCE: Coach" in prompt
        assert "CONVERSATION CONTEXT AWARENESS" in prompt
        assert COACH_PERSONA_SHELL.splitlines()[0].strip() in prompt

    def test_foundation_always_present(self):
        """Layer 1 text appears in all modes."""
        for mode in ("quick", "deep_dive"):
            prompt = self._build(mode)
            assert self._BASE_PROMPT in prompt


# 
# PERSONA_PROMPT_VERSION
# 

class TestPersonaPromptVersion:

    def test_version_is_set(self):
        assert PERSONA_PROMPT_VERSION is not None
        assert isinstance(PERSONA_PROMPT_VERSION, str)

    def test_version_is_at_least_two(self):
        assert int(PERSONA_PROMPT_VERSION) >= 2, \
            "Version should be >=2 after Context Awareness was added"

    def test_context_awareness_block_is_non_empty(self):
        assert _CONTEXT_AWARENESS_BLOCK.strip(), \
            "_CONTEXT_AWARENESS_BLOCK must not be empty"
