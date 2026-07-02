"""Role × mode × path policy for memory retrieve and extract."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.domain.memory_registry import MEMORY_KINDS, PERSONAL_MEMORY_KINDS
from app.observability.query_router import QueryPath

L1_L3_PRECEDENCE_INSTRUCTION = (
    "When live BSP behavioral profile (user_personalization) conflicts with "
    "<extracted_memories> on assessment-derived traits, prefer the BSP profile. "
    "Use extracted memories for user-stated preferences and cross-thread context."
)

MEMORY_USAGE_INSTRUCTION = (
    "When <extracted_memories> is present, treat it as authoritative for the user's "
    "stated preferences, schedule, goals, and prior personal facts. Answer personal "
    "questions from these memories first. Do not call search_knowledge_base for "
    "user-specific facts already covered in extracted_memories."
)

_QUICK_TOP_K: dict[str, int] = {
    "employee": 3,
    "coach": 4,
    "company_admin": 3,
    "corporation_admin": 3,
    "superadmin": 3,
}

_FAST_TOP_K = 3
_SUBSTANTIVE_EXTRACT_MIN_CHARS = 80
_PURE_GREETING_MAX_CHARS = 48
_GREETING_RE = re.compile(
    r"^(hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True, slots=True)
class MemoryRetrievePolicy:
    top_k: int
    allowed_kinds: frozenset[str]


_RETRIEVE_BY_ROLE: dict[str, MemoryRetrievePolicy] = {
    "employee": MemoryRetrievePolicy(
        top_k=5,
        allowed_kinds=MEMORY_KINDS - {"org_insight"},
    ),
    "coach": MemoryRetrievePolicy(
        top_k=8,
        allowed_kinds=MEMORY_KINDS - {"org_insight"},
    ),
    "company_admin": MemoryRetrievePolicy(
        top_k=5,
        allowed_kinds=MEMORY_KINDS - {"org_insight"},
    ),
    "corporation_admin": MemoryRetrievePolicy(
        top_k=5,
        allowed_kinds=MEMORY_KINDS - {"org_insight"},
    ),
    "superadmin": MemoryRetrievePolicy(top_k=5, allowed_kinds=MEMORY_KINDS),
}


def resolve_retrieve_policy(
    *,
    persona: str,
    chat_mode: str,
    query_path: QueryPath,
) -> MemoryRetrievePolicy:
    """
    All modes personalize — quick uses a lower top_k, never zero.

    FAST router path still retrieves a small memory set for continuity.
    """
    base = _RETRIEVE_BY_ROLE.get(persona, _RETRIEVE_BY_ROLE["employee"])

    if query_path == QueryPath.FAST:
        return MemoryRetrievePolicy(
            top_k=_FAST_TOP_K,
            allowed_kinds=base.allowed_kinds,
        )

    if chat_mode == "quick":
        return MemoryRetrievePolicy(
            top_k=_QUICK_TOP_K.get(persona, 2),
            allowed_kinds=base.allowed_kinds,
        )

    return base


def is_pure_greeting_message(message: str) -> bool:
    normalized = message.strip()
    if not normalized:
        return True
    return (
        len(normalized) < _PURE_GREETING_MAX_CHARS
        and bool(_GREETING_RE.match(normalized.lower()))
    )


def is_substantive_extraction_message(message: str) -> bool:
    """Long non-greeting user turns should still learn even on FAST chat path."""
    normalized = message.strip()
    if len(normalized) < _SUBSTANTIVE_EXTRACT_MIN_CHARS:
        return False
    if _GREETING_RE.match(normalized.lower()) and len(normalized) < 40:
        return False
    return True


def should_extract(
    *,
    chat_mode: str,
    query_path: QueryPath,
    consent_granted: bool,
    enable_extraction: bool,
    user_message: str = "",
) -> bool:
    """Learn from every non-greeting turn when consent is on (all modes/paths)."""
    if not enable_extraction or not consent_granted:
        return False
    if is_pure_greeting_message(user_message):
        return False
    return True
