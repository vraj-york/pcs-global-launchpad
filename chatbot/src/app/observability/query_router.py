"""
Heuristic fast/deep query router (Phase 3 v1).

No extra model call — uses persona, mode, mentions, and keyword signals.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from app.config import settings


class QueryPath(str, Enum):
    FAST = "fast"
    DEEP = "deep"


_DEEP_KEYWORDS: tuple[str, ...] = (
    "my style",
    "my profile",
    "my bsp",
    "my assessment",
    "personality type",
    "behavioral type",
    "pioneer",
    "collaborator",
    "authoritarian",
    "session prep",
    "prepare for session",
    "session note",
    "client snapshot",
    "coaching session",
    "knowledge base",
    "search for",
    "corporation",
    "corporate directory",
    "get_client_snapshot",
    "mentioned peer",
    "@",
)

_BORDERLINE_KEYWORDS: tuple[str, ...] = (
    "style",
    "profile",
    "bsp",
    "assessment",
    "coaching",
    "collaborate",
    "communicate",
    "team",
    "work with",
)

_GREETING_RE = re.compile(
    r"^(hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)\b",
    re.IGNORECASE,
)


@dataclass(slots=True)
class QueryRouteDecision:
    path: QueryPath
    confidence: float
    reasons: list[str] = field(default_factory=list)
    speculative_warm: bool = False


def route_query(
    *,
    persona: str,
    chat_mode: str,
    message: str,
    mentions_present: bool,
    client_id: Optional[str] = None,
    has_client_snapshot: bool = False,
) -> QueryRouteDecision:
    """
    Choose fast vs deep execution path for the current turn.

    Fast path: cached static prefix, no tools, no warm-tier HTTP on the critical path.
    Deep path: full agentic loop with tools and warm context resolution.
    """
    reasons: list[str] = []

    if persona == "coach":
        return QueryRouteDecision(
            path=QueryPath.DEEP,
            confidence=1.0,
            reasons=["coach_persona"],
        )

    if chat_mode == "deep_dive":
        return QueryRouteDecision(
            path=QueryPath.DEEP,
            confidence=1.0,
            reasons=["deep_dive_mode"],
        )

    if mentions_present:
        return QueryRouteDecision(
            path=QueryPath.DEEP,
            confidence=1.0,
            reasons=["peer_mentions"],
        )

    if client_id or has_client_snapshot:
        return QueryRouteDecision(
            path=QueryPath.DEEP,
            confidence=1.0,
            reasons=["coach_client_context"],
        )

    if persona not in {"employee"}:
        return QueryRouteDecision(
            path=QueryPath.DEEP,
            confidence=0.9,
            reasons=["non_employee_persona"],
        )

    normalized = message.strip().lower()
    if any(keyword in normalized for keyword in _DEEP_KEYWORDS):
        matched = next(k for k in _DEEP_KEYWORDS if k in normalized)
        return QueryRouteDecision(
            path=QueryPath.DEEP,
            confidence=0.95,
            reasons=[f"deep_keyword:{matched}"],
        )

    if len(normalized) <= 80 and (
        _GREETING_RE.match(normalized) or normalized.endswith("?") and len(normalized) < 40
    ):
        reasons.append("short_greeting_or_question")
        speculative = (
            settings.ENABLE_SPECULATIVE_WARM_PREFETCH
            and _has_borderline_signals(normalized)
        )
        if speculative:
            reasons.append("speculative_warm_prefetch")
        return QueryRouteDecision(
            path=QueryPath.FAST,
            confidence=0.85,
            reasons=reasons,
            speculative_warm=speculative,
        )

    if _has_borderline_signals(normalized):
        return QueryRouteDecision(
            path=QueryPath.DEEP,
            confidence=0.7,
            reasons=["borderline_bsp_signals"],
        )

    reasons.append("default_quick_employee")
    return QueryRouteDecision(
        path=QueryPath.FAST,
        confidence=0.75,
        reasons=reasons,
        speculative_warm=False,
    )


def _has_borderline_signals(normalized_message: str) -> bool:
    return any(keyword in normalized_message for keyword in _BORDERLINE_KEYWORDS)
