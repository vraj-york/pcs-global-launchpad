"""
Context Plane prompt assembly (Phase 2).

Splits the system prompt into cacheable static and per-turn dynamic tiers.
Date awareness moves to the user message so the static prefix stays byte-stable.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from app.config import settings
from app.domain.prompts import (
    _CONTEXT_AWARENESS_BLOCK,
    get_chat_mode_prompt,
    get_persona_prompt,
    format_client_snapshot,
)

SystemPromptPayload = Union[str, List[Dict[str, Any]]]


@dataclass(slots=True)
class ContextPlaneResult:
    static_text: str
    dynamic_text: str
    date_awareness: str
    bedrock_system: SystemPromptPayload

    @property
    def legacy_combined(self) -> str:
        parts = [self.static_text]
        if self.dynamic_text.strip():
            parts.append(self.dynamic_text)
        return "\n\n---\n\n".join(parts)


def build_date_awareness_block(current_date: str) -> str:
    return (
        f"[Temporal context — today's date is {current_date}]\n"
        f'Use "{current_date}" as "today" when interpreting timestamps.'
    )


def build_bedrock_system_payload(
    static_text: str,
    dynamic_text: str,
    *,
    enable_caching: Optional[bool] = None,
) -> SystemPromptPayload:
    """Build a Bedrock system value with optional ephemeral cache on the static tier."""
    use_cache = (
        settings.ENABLE_BEDROCK_PROMPT_CACHING
        if enable_caching is None
        else enable_caching
    )
    dynamic = dynamic_text.strip()
    if not use_cache:
        if dynamic:
            return f"{static_text}\n\n---\n\n{dynamic}"
        return static_text

    blocks: List[Dict[str, Any]] = [
        {
            "type": "text",
            "text": static_text,
            "cache_control": {"type": "ephemeral"},
        }
    ]
    if dynamic:
        blocks.append({"type": "text", "text": dynamic})
    return blocks


def build_context_plane(
    *,
    foundation_prompt: str,
    chat_mode: str = "quick",
    user_type: str = "employee",
    persona_prompt: Optional[str] = None,
    client_snapshot: Optional[Dict[str, Any]] = None,
    client_id: Optional[str] = None,
    bsp_profile_block: Optional[str] = None,
    user_personalization_block: Optional[str] = None,
    peer_mentions_block: Optional[str] = None,
    extracted_memories_block: Optional[str] = None,
    current_date: str,
    use_coach_shell: bool = True,
    coach_persona_override: Optional[str] = None,
) -> ContextPlaneResult:
    """
    Assemble Tier S (static) and Tier W/H (dynamic) system content.

    Tier S — foundation, mode, persona shell (cacheable).
    Tier dynamic — context awareness, coach client blocks, warm XML blocks.
    Date — returned separately for the user message (Tier H).
    """
    resolved_persona = persona_prompt
    if resolved_persona is None:
        resolved_persona = get_persona_prompt(
            user_type,
            use_coach_shell=use_coach_shell,
            coach_persona_override=coach_persona_override,
        )

    static_parts = [foundation_prompt.strip()]
    mode_prompt = get_chat_mode_prompt(chat_mode)
    if mode_prompt:
        static_parts.append(mode_prompt)
    if resolved_persona:
        static_parts.append(resolved_persona)

    dynamic_parts: list[str] = []

    if chat_mode != "quick":
        dynamic_parts.append(_CONTEXT_AWARENESS_BLOCK.strip())

    if user_type == "coach":
        if bsp_profile_block:
            dynamic_parts.append(bsp_profile_block)
        elif client_snapshot:
            dynamic_parts.append(format_client_snapshot(client_snapshot))
        elif client_id:
            dynamic_parts.append(
                f"ACTIVE SESSION\n"
                f"Client ID: {client_id}\n"
                f'Call get_client_snapshot("{client_id}") at the start of your '
                f"first response to load this client's full profile before "
                f"addressing the coach's question."
            )

    if user_type in {"employee", "superadmin", "company_admin", "corporation_admin"} and user_personalization_block:
        dynamic_parts.append(user_personalization_block)

    if user_type == "employee" and peer_mentions_block:
        dynamic_parts.append(peer_mentions_block)

    if extracted_memories_block:
        dynamic_parts.append(extracted_memories_block.strip())

    static_text = "\n\n---\n\n".join(static_parts)
    dynamic_text = "\n\n---\n\n".join(dynamic_parts)
    date_awareness = build_date_awareness_block(current_date)

    return ContextPlaneResult(
        static_text=static_text,
        dynamic_text=dynamic_text,
        date_awareness=date_awareness,
        bedrock_system=build_bedrock_system_payload(static_text, dynamic_text),
    )
