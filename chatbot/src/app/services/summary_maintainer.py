"""
SummaryMaintainerService

Generates (or refreshes) a compressed summary of conversation history that
has scrolled outside the verbatim context window.

When to trigger
  After every message pair is persisted, call ``refresh_if_needed(thread_id)``.
  The method is a cheap no-op when the thread is still short.

  Trigger threshold: total messages > REFRESH_THRESHOLD (default 16).
    With a 12-message verbatim window, 16 total means ≥4 messages are
    stranded outside the window — enough to warrant a summary.

Summary generation
  Messages older than the verbatim window (messages[:-WINDOW_SIZE]) are
  decrypted, formatted as a transcript, and sent to Claude Haiku with a
  focused summarisation prompt.

  Output is encrypted and upserted into ``thread_summaries``.  An existing
  summary is always replaced (not incrementally patched) so the blast
  radius of any summarisation error is bounded to one thread.

Model choice
  Claude Haiku is used because summaries are a cost-sensitive background
  task.  The model is configurable via ``BEDROCK_SUMMARY_MODEL`` env var.

Caller contract
  ``refresh_if_needed`` is synchronous.  Call it after ``DoneEvent`` is
  yielded in the streaming path — by that point the client has already
  received the full response and the extra latency is invisible to the user.
  The Lambda continues running until the function returns or times out.

Upgrade path (Distilled Memories)
  Replace per-thread encryption with per-user DEK here.
  The summarisation prompt and Haiku call remain unchanged.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.repositories.message_repository import MessageRepository
    from app.repositories.summary_repository import SummaryRepository
    from app.infrastructure.crypto import CryptoClient
    from app.infrastructure.bedrock_client import BedrockClient

logger = logging.getLogger(__name__)

#: Trigger a summary refresh once the total message count exceeds this.
REFRESH_THRESHOLD: int = 16

#: Number of recent messages kept verbatim (must match ConversationWindowService).
WINDOW_SIZE: int = 12

#: Maximum older messages to include in one summary batch (safety cap).
MAX_MESSAGES_TO_SUMMARISE: int = 80

_SUMMARY_SYSTEM_PROMPT = (
    "You are a conversation summariser. "
    "Produce a concise, factual summary of the conversation transcript provided. "
    "Focus on: main topics discussed, decisions or commitments made, "
    "key questions asked and answered, and any unresolved items. "
    "Write in third person (e.g. 'The user asked…', 'The assistant explained…'). "
    "Aim for 3-6 sentences. Do not add commentary or analysis."
)


class SummaryMaintainerService:
    """
    Keeps the ``thread_summaries`` table current as conversations grow.

    Designed to be called synchronously in the Lambda's post-response
    cleanup window — after the SSE DoneEvent is flushed to the client.
    """

    def __init__(
        self,
        msg_repo    : "MessageRepository",
        summary_repo: "SummaryRepository",
        crypto      : "CryptoClient",
        bedrock     : "BedrockClient",
        summary_model: Optional[str] = None,
    ) -> None:
        self.msg_repo      = msg_repo
        self.summary_repo  = summary_repo
        self.crypto        = crypto
        self.bedrock       = bedrock
        self._summary_model = summary_model  # None → use BedrockClient default

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def refresh_if_needed(self, thread_id: str) -> None:
        """
        Regenerate the thread summary if the message count exceeds the threshold.

        No-op when:
          • Total messages ≤ REFRESH_THRESHOLD
          • Bedrock or encryption errors (logged, never re-raised)

        Args:
            thread_id: Conversation UUID string.
        """
        try:
            total = self.msg_repo.count(thread_id)
            if total <= REFRESH_THRESHOLD:
                return

            older_rows = self._get_older_messages(thread_id)
            if not older_rows:
                return

            transcript = self._build_transcript(older_rows)
            if not transcript:
                return

            summary_text, token_count = self._call_haiku(transcript)
            if not summary_text:
                return

            summary_bytes = self.crypto.encrypt(summary_text)

            # up_to_message = the newest ID in older_rows (last message before window)
            up_to_id = str(older_rows[-1]["id"])

            self.summary_repo.upsert(
                conversation_id   = thread_id,
                summary_encrypted = summary_bytes,
                up_to_message_id  = up_to_id,
                tokens            = token_count,
            )

            logger.info(
                "summary_refreshed",
                extra={
                    "thread_id"     : thread_id,
                    "older_messages": len(older_rows),
                    "tokens"        : token_count,
                },
            )

        except Exception as exc:
            logger.error(
                "summary_refresh_failed",
                extra={"thread_id": thread_id, "error": str(exc)},
                exc_info=True,
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_older_messages(self, thread_id: str) -> list[dict]:
        """
        Return decrypted messages that fall outside the verbatim window.

        Strategy:
          1. Fetch the verbatim window to find its oldest message ID.
          2. Use list_paginated(before_id=oldest_window_id) to get older messages.
          3. Decrypt all of them.
        """
        window_rows = self.msg_repo.get_window(thread_id, limit=WINDOW_SIZE)
        if not window_rows:
            return []

        oldest_window_id = str(window_rows[0]["id"])

        older_rows = self.msg_repo.list_paginated(
            conversation_id=thread_id,
            limit=MAX_MESSAGES_TO_SUMMARISE,
            before_id=oldest_window_id,
        )
        if not older_rows:
            return []

        # Decrypt content in-place
        try:
            blobs  = [r["content"] for r in older_rows]
            texts  = self.crypto.decrypt_batch(blobs)
        except Exception as exc:
            logger.error(
                "summary_decrypt_failed",
                extra={"thread_id": thread_id, "error": str(exc)},
            )
            return []

        for row, text in zip(older_rows, texts):
            row["_text"] = text

        return older_rows

    def _build_transcript(self, rows: list[dict]) -> str:
        """Format decrypted rows as a plain-text transcript for Haiku."""
        lines: list[str] = []
        for row in rows:
            role = row.get("role", "unknown").capitalize()
            text = row.get("_text", "")
            if text:
                lines.append(f"{role}: {text}")
        return "\n".join(lines)

    def _call_haiku(self, transcript: str) -> tuple[str, int]:
        """
        Call Claude Haiku via BedrockClient and return (summary_text, token_count).

        Uses ``generate_chat_response`` (synchronous) with no tools.
        Returns ("", 0) on any Bedrock error.
        """
        from app.config import settings

        model = (
            self._summary_model
            or settings.BEDROCK_SUMMARY_MODEL
        )

        messages = [{"role": "user", "content": f"Summarise this conversation:\n\n{transcript}"}]

        try:
            result = self.bedrock.generate_chat_response(
                messages      = messages,
                system_prompt = _SUMMARY_SYSTEM_PROMPT,
                max_tokens    = 400,
                temperature   = 0.1,
                tools         = None,
                # Override model to Haiku for cost efficiency
                model_id      = model,
            )
        except Exception as exc:
            logger.error("haiku_summary_call_failed", extra={"error": str(exc)})
            return "", 0

        # Extract text from Bedrock content block
        content = result.get("content", [])
        text    = ""
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "")
                break
        if not text:
            text = str(content) if content else ""

        usage       = result.get("usage", {})
        token_count = usage.get("output_tokens", 0)

        return text.strip(), token_count
