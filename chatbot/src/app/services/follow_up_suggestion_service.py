"""
Post-assistant follow-up suggestion generation.

Produces 0–2 chip pairs (short ``display`` label + longer ``submit`` message).
The UI shows ``display``; clicking sends ``submit`` as the next user message so
the main model gets enough context. The first chip is always a fixed summarize
action on the client.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from app.config import settings
from app.domain.tools import get_tools_for_persona

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FollowUpChipPayload:
    """One dynamic chip: concise UI label + fuller text sent as user message."""

    display: str
    submit: str


@dataclass(frozen=True)
class FollowUpSuggestionResult:
    """Outcome of the cheap follow-up generation call (for UI + telemetry)."""

    chips: List[FollowUpChipPayload]
    intent_tag: Optional[str] = None
    cache_hit: bool = False


_MAX_ASSISTANT_CHARS = 12000
_MAX_USER_CHARS = 4000
_MAX_DISPLAY_LEN = 72
_MAX_SUBMIT_LEN = 2000
_MIN_SUBMIT_LEN = 24

_TOOL_KEYWORDS: Dict[str, List[str]] = {
    "search_knowledge_base": [
        "knowledge",
        "document",
        "policy",
        "methodology",
        "bsp",
        "framework",
        "assessment",
        "guide",
        "procedure",
        "onboarding",
    ],
    "get_client_snapshot": ["client", "profile", "snapshot", "coach", "behavioral"],
    "get_session_notes_history": [
        "session",
        "notes",
        "history",
        "longitudinal",
        "progress",
    ],
    "get_corporations_list": ["corporation", "companies", "directory", "list", "org"],
    "get_corporation_details": ["corporation", "company", "details", "uuid"],
}


def _permitted_tool_names(persona: str) -> List[str]:
    return [t["name"] for t in get_tools_for_persona(persona)]


def _raw_suggestions_to_pairs(raw: Any) -> List[Tuple[str, str]]:
    """Parse model output into (display, submit) tuples (max two)."""
    if not isinstance(raw, list):
        return []
    out: List[Tuple[str, str]] = []
    for item in raw[:4]:
        if isinstance(item, dict):
            d = (
                item.get("display")
                or item.get("label")
                or item.get("chip")
                or item.get("chip_text")
                or ""
            )
            s = (
                item.get("submit")
                or item.get("message")
                or item.get("user_message")
                or item.get("full_query")
                or item.get("query")
                or ""
            )
            if isinstance(d, str) and isinstance(s, str):
                ds = d.strip()
                ss = s.strip()
                if ds and ss:
                    out.append((ds, ss))
        elif isinstance(item, str) and item.strip():
            ss = item.strip()
            words = ss.split()[:8]
            ds = " ".join(words)
            if len(ds) > _MAX_DISPLAY_LEN:
                ds = ds[: _MAX_DISPLAY_LEN].rstrip()
            out.append((ds, ss))
        if len(out) >= 2:
            break
    return out[:2]


def _filter_chip_pairs(
    pairs: List[Tuple[str, str]],
    permitted_tools: List[str],
) -> List[FollowUpChipPayload]:
    """Keep pairs aligned with permitted tool domains; enforce display rules."""
    valid: List[FollowUpChipPayload] = []
    tool_kw: Dict[str, List[str]] = {
        t: _TOOL_KEYWORDS.get(t, [t.replace("_", " ")]) for t in permitted_tools
    }
    block_phrases = (
        "summarize",
        "summary of",
        "entire conversation",
        "whole conversation",
        "recap this chat",
    )

    for display, submit in pairs:
        d = display.strip()
        s = submit.strip()
        if len(d) < 2 or len(s) < _MIN_SUBMIT_LEN:
            continue
        if "?" in d:
            continue
        d_low = d.lower()
        s_low = s.lower()
        if any(p in d_low for p in block_phrases) or any(p in s_low for p in block_phrases):
            continue
        matched = any(
            any(kw in s_low for kw in tool_kw[t]) for t in permitted_tools
        )
        if not matched and len(permitted_tools) == 1:
            matched = True
        if matched:
            d_cut = d[:_MAX_DISPLAY_LEN].rstrip()
            s_cut = s[:_MAX_SUBMIT_LEN].rstrip()
            valid.append(FollowUpChipPayload(display=d_cut, submit=s_cut))
        if len(valid) >= 2:
            break
    return valid[:2]


def _parse_json_object(raw: str) -> Dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return json.loads(match.group(0))


def _extract_response_text(result: Dict[str, Any]) -> str:
    parts: List[str] = []
    for block in result.get("content", []) or []:
        if block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n".join(parts).strip()


def generate_follow_up_dynamic_queries(
    bedrock: Any,
    persona: str,
    last_user_message: str,
    assistant_final_text: str,
) -> FollowUpSuggestionResult:
    """
    Return 0–2 follow-up chips plus metadata. Swallows all errors and returns
    an empty ``chips`` list so the streaming path never fails.
    """
    permitted = _permitted_tool_names(persona)
    modules_str = ", ".join(permitted)
    clipped = (assistant_final_text or "")[:_MAX_ASSISTANT_CHARS]
    user_clipped = (last_user_message or "")[:_MAX_USER_CHARS]

    system = f"""You are a next-step recommender for an enterprise assistant.

Return only valid JSON. Do not wrap in markdown code fences. No preamble.

Permitted capabilities for this user (keep suggestions relevant): {modules_str}

Rules:
- Output exactly two objects in key "suggestions".
- Each object MUST have:
  - "display": A very short imperative phrase for a UI chip (about 3–5 words maximum).
    NOT a question (no "?" character). Action-oriented next step, e.g.
    "Review BSP assessment criteria" or "Compare corporation profiles".
  - "submit": A longer message (1-1.5 sentences maximum) the user would send next so the
    assistant can answer precisely. Must match the intent of "display" but add
    enough context, scope, or constraints. May use statements or questions.
- Do NOT suggest summarizing the entire conversation (the UI already offers that).
- Also output "intent_tag" (snake_case topic) and "response_summary" (2–3 sentences
  on what the assistant just covered).

JSON shape:
{{"intent_tag":"...","response_summary":"...","suggestions":[{{"display":"...","submit":"..."}},{{"display":"...","submit":"..."}}]}}
"""

    user_content = f"""Current turn:
User: {user_clipped}
Assistant reply (may be truncated):
{clipped}

Produce intent_tag, response_summary, and two suggestion objects with display and submit."""

    messages = [{"role": "user", "content": user_content}]

    try:
        result = bedrock.generate_chat_response(
            messages=messages,
            system_prompt=system,
            max_tokens=520,
            temperature=0.45,
            tools=None,
            model_id=settings.BEDROCK_SUMMARY_MODEL,
        )
    except Exception as exc:
        logger.warning(
            "follow_up_suggestions_bedrock_error",
            extra={"error": str(exc)},
        )
        return FollowUpSuggestionResult(chips=[])

    raw_text = _extract_response_text(result)
    if not raw_text:
        return FollowUpSuggestionResult(chips=[])

    try:
        data = _parse_json_object(raw_text)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning(
            "follow_up_suggestions_json_parse",
            extra={"error": str(exc)},
        )
        return FollowUpSuggestionResult(chips=[])

    sugg = data.get("suggestions")
    pairs = _raw_suggestions_to_pairs(sugg)

    intent_val: Optional[str] = None
    raw_intent = data.get("intent_tag")
    if isinstance(raw_intent, str) and raw_intent.strip():
        intent_val = raw_intent.strip()[:200]

    filtered = _filter_chip_pairs(pairs, permitted)
    return FollowUpSuggestionResult(
        chips=filtered,
        intent_tag=intent_val,
        cache_hit=False,
    )
