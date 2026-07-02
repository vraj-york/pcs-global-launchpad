"""
Conversation Context Utilities

Helpers for managing and bounding conversation history windows.
Keeps token usage predictable and ensures only recent, relevant
turns are sent to the LLM on each request.
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

#: Default maximum number of complete turns (user + assistant pairs) to retain.
#: 6 turns = 12 messages — aligns with ConversationWindowService.WINDOW_SIZES["deep_dive"].
#: Stateless requests (no thread_id) are trimmed by this safety guard; threaded
#: requests use ConversationWindowService.load() instead of trim_to_window().
DEFAULT_MAX_TURNS: int = 6


def trim_to_window(
    history: Optional[list[dict]],
    max_turns: int = DEFAULT_MAX_TURNS,
    session_id: Optional[str] = None,
) -> Optional[list[dict]]:
    """
    Trim conversation history to the last *max_turns* complete turns.

    A "turn" is one user message plus one assistant response (2 list items).
    Trimming always removes from the head so the most recent exchange is
    preserved intact.

    The frontend only ever sends clean alternating user/assistant pairs
    (validated upstream by ChatRequest.validate_history_roles), so the list
    length is always even and every trimmed slice will start with a user
    message — no orphaned assistant messages can appear at the head.

    Args:
        history:    Conversation history from the request. May be None/empty.
        max_turns:  Maximum number of complete turns to keep (default: 5).
        session_id: Optional session UUID string included in the truncation
                    warning log to aid operational debugging.

    Returns:
        Trimmed list, or the original list unchanged if it already fits
        within the window. Returns None/empty input as-is.
    """
    if not history:
        return history

    max_messages = max_turns * 2  # 1 turn = 1 user message + 1 assistant message

    if len(history) <= max_messages:
        return history

    trimmed = history[-max_messages:]
    turns_dropped = (len(history) - len(trimmed)) // 2

    logger.warning(
        "conversation_history_truncated",
        extra={
            "session_id"    : session_id,
            "original_turns": len(history) // 2,
            "retained_turns": max_turns,
            "turns_dropped" : turns_dropped,
        },
    )

    return trimmed
