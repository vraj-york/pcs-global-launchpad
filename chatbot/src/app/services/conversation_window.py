"""
ConversationWindowService

Builds the LLM conversation window for a thread by combining:
  1. A decrypted summary of older messages (when available)
  2. The last N verbatim decrypted messages

Window sizes per chat_mode
  quick     : 6 messages  (3 user/assistant turns)
  deep_dive : 12 messages (6 user/assistant turns)

Summary injection strategy
  When a summary exists and covers messages OLDER than the current
  verbatim window, it is prepended as a synthetic user/assistant pair:

    {"role": "user",      "content": "[THREAD HISTORY SUMMARY]\\n<summary_text>"}
    {"role": "assistant", "content": "Understood — I have this context in mind."}
    ... last N real messages ...

  This keeps the message array alternating correctly for Claude while
  ensuring the model has richer context about the full conversation arc.

  The summary is skipped when:
    • No summary row exists yet (thread is still short)
    • summary.up_to_message is within the verbatim window
      (the window already covers the full history — no gap to fill)

Upgrade path (Distilled Memories)
  Replace CryptoClient usage here with per-user DEK resolution.
  The summary injection logic and window sizes remain unchanged.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.repositories.message_repository import MessageRepository
    from app.repositories.summary_repository import SummaryRepository
    from app.infrastructure.crypto import CryptoClient

logger = logging.getLogger(__name__)

#: Window size (number of messages) per chat_mode.
#: 1 turn = 1 user message + 1 assistant message (2 messages).
WINDOW_SIZES: dict[str, int] = {
    "quick"    : 6,   # 3 turns
    "deep_dive": 12,  # 6 turns
}
DEFAULT_WINDOW_SIZE: int = 12

_SUMMARY_USER_PREFIX = "[THREAD HISTORY SUMMARY]\n"
_SUMMARY_ACK         = "Understood — I have this context in mind as we continue."


class ConversationWindowService:
    """
    Builds the enriched message window used as LLM conversation_history.

    Injected into UnifiedChatService to replace the Sprint 2
    ``thread_service.load_history_for_thread()`` call.
    """

    def __init__(
        self,
        msg_repo    : "MessageRepository",
        summary_repo: "SummaryRepository",
        crypto      : "CryptoClient",
    ) -> None:
        self.msg_repo     = msg_repo
        self.summary_repo = summary_repo
        self.crypto       = crypto

    def load(self, thread_id: str, chat_mode: str = "quick") -> list[dict]:
        """
        Return the message window for *thread_id* ready for LLM injection.

        Args:
            thread_id: Conversation UUID string.
            chat_mode: "quick" | "deep_dive" — determines verbatim window size.

        Returns:
            Ordered list of ``{"role": ..., "content": ...}`` dicts.
            Empty list when the thread has no messages yet.
        """
        window_size = WINDOW_SIZES.get(chat_mode, DEFAULT_WINDOW_SIZE)

        # 1. Fetch the verbatim window (last window_size messages, oldest-first)
        rows = self.msg_repo.get_window(thread_id, limit=window_size)
        if not rows:
            return []

        # 2. Decrypt verbatim messages.
        # On failure we return [] (graceful degradation) so the chat request
        # still completes — without history rather than with a 500.  The full
        # stack trace is logged so the root cause is diagnosable in CloudWatch.
        try:
            blobs = [r["content"] for r in rows]
            texts = self.crypto.decrypt_batch(blobs)
        except Exception as exc:
            logger.error(
                "conversation_window_decrypt_failed",
                extra={"thread_id": thread_id, "error": str(exc)},
                exc_info=True,
            )
            return []

        verbatim: list[dict] = [
            {"role": r["role"], "content": t}
            for r, t in zip(rows, texts)
        ]

        # 3. Check whether a summary covers messages older than the current window
        summary_row = self._get_summary_if_relevant(thread_id, rows)
        if summary_row is None:
            return verbatim

        # 4. Decrypt and prepend the summary as a synthetic exchange
        try:
            summary_text = self.crypto.decrypt(summary_row["summary"])
        except Exception as exc:
            logger.warning(
                "conversation_window_summary_decrypt_failed",
                extra={"thread_id": thread_id, "error": str(exc)},
            )
            return verbatim

        summary_exchange: list[dict] = [
            {"role": "user",      "content": f"{_SUMMARY_USER_PREFIX}{summary_text}"},
            {"role": "assistant", "content": _SUMMARY_ACK},
        ]
        logger.debug(
            "conversation_window_summary_prepended",
            extra={"thread_id": thread_id, "chat_mode": chat_mode},
        )
        return summary_exchange + verbatim

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_summary_if_relevant(
        self,
        thread_id: str,
        window_rows: list[dict],
    ) -> Optional[dict]:
        """
        Return the summary row only when it covers messages outside the window.

        A summary is relevant when its ``up_to_message`` ID is NOT present in
        the current verbatim window — meaning the summary covers historical
        messages that didn't fit in the window.
        """
        summary_row = self.summary_repo.get(thread_id)
        if not summary_row:
            return None

        up_to = summary_row.get("up_to_message")
        if not up_to:
            return None

        window_ids = {str(r["id"]) for r in window_rows}
        if up_to in window_ids:
            # Summary only covers messages already in the verbatim window —
            # no need to prepend; verbatim text is more informative.
            return None

        return summary_row
