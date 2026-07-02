"""
ThreadService — Conversation thread lifecycle management

Sits between the route handlers / UnifiedChatService and the three
thread-persistence repositories.  Owns:

  • Thread CRUD (create, read, list, rename, pin, soft-delete)
  • Message persistence (encrypt pair → append → advance last_message_at)
  • History loading (decrypt window → LLM-ready list for context injection)
  • Message history pagination (decrypt page → API response)

Design decisions:
  • All encryption / decryption is handled here — repositories are byte-agnostic.
  • ThreadOwnershipError is raised (not HTTP 404) so route handlers decide the
    HTTP status code; this keeps the service layer HTTP-free and testable.
  • persist_message_pair is intentionally synchronous so callers can fire-and-
    forget it in a try/except without awaiting; encryption + DB writes are fast
    relative to a full Bedrock round-trip.
  • load_history_for_thread returns [] (empty, not an error) when the thread has
    no messages yet — the caller should fall back to frontend-provided history.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from app.infrastructure.crypto import CryptoClient
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.domain.exceptions import ThreadOwnershipError

logger = logging.getLogger(__name__)


class ThreadService:
    """Orchestrates thread lifecycle: CRUD, message persistence, history loading."""

    def __init__(
        self,
        conv_repo  : ConversationRepository,
        msg_repo   : MessageRepository,
        crypto     : CryptoClient,
    ) -> None:
        self.conv_repo = conv_repo
        self.msg_repo  = msg_repo
        self.crypto    = crypto

    #  Thread CRUD 

    def get_or_create_thread(
        self,
        user_id_hash    : str,
        thread_id       : Optional[str],
        persona         : str,
        chat_mode       : str,
        coach_client_id : Optional[str] = None,
    ) -> dict:
        """
        Return an existing thread or create a new one.

        If *thread_id* is provided and the thread is owned by *user_id_hash*,
        return the existing row.  If it does not exist or is not owned, raise
        ThreadOwnershipError.

        If *thread_id* is None, create and return a new thread.

        Args:
            user_id_hash:    SHA-256 hash of the Cognito sub.
            thread_id:       UUID string of an existing thread, or None.
            persona:         employee | coach | superadmin | default.
            chat_mode:       quick | deep_dive.
            coach_client_id: Required only when persona == "coach".

        Returns:
            The conversation row as a plain dict.

        Raises:
            ThreadOwnershipError: When thread_id is provided but not accessible.
        """
        if thread_id:
            row = self.conv_repo.get(thread_id, user_id_hash)
            if not row:
                raise ThreadOwnershipError("Thread not found or access denied.")
            return row

        return self.conv_repo.create(
            user_id_hash    = user_id_hash,
            persona         = persona,
            chat_mode       = chat_mode,
            coach_client_id = coach_client_id,
        )

    def list_threads(
        self,
        user_id_hash: str,
        limit       : int = 50,
        offset      : int = 0,
    ) -> tuple[list[dict], int]:
        """Return a paginated list of active threads for *user_id_hash*."""
        return self.conv_repo.list_by_user(user_id_hash, limit=limit, offset=offset)

    def get_thread(self, thread_id: str, user_id_hash: str) -> Optional[dict]:
        """
        Return the thread if owned, None otherwise.

        Route handlers should convert None → HTTP 404.
        """
        return self.conv_repo.get(thread_id, user_id_hash)

    def rename_thread(self, thread_id: str, user_id_hash: str, title: str) -> bool:
        """Rename a thread.  Returns True on success, False if not found / not owned."""
        return self.conv_repo.rename(thread_id, user_id_hash, title)

    def set_pinned(self, thread_id: str, user_id_hash: str, pinned: bool) -> bool:
        """Toggle pinned.  Returns True on success."""
        return self.conv_repo.set_pinned(thread_id, user_id_hash, pinned)

    def delete_thread(self, thread_id: str, user_id_hash: str) -> bool:
        """Soft-delete a thread.  Returns True if deleted, False if not found / not owned."""
        return self.conv_repo.soft_delete(thread_id, user_id_hash)

    #  Message persistence 

    def persist_message_pair(
        self,
        thread_id     : str,
        user_text     : str,
        assistant_text: str,
        tokens_in     : Optional[int] = None,
        tokens_out    : Optional[int] = None,
    ) -> str:
        """
        Encrypt and persist one user + one assistant message, then advance
        ``last_message_at`` on the parent conversation.

        Called from UnifiedChatService after the Bedrock response is complete —
        both streaming (after DoneEvent) and non-streaming paths.

        Error handling: the caller should wrap in try/except and log; a DB
        failure here must never surface as an HTTP error to the end user.

        Args:
            thread_id:      UUID string of the conversation.
            user_text:      The raw user message text.
            assistant_text: The full assistant response text.
            tokens_in:      Total input tokens for this turn (for billing tracking).
            tokens_out:     Total output tokens for this turn.

        Returns:
            The persisted assistant message row id (UUID string).
        """
        user_enc = self.crypto.encrypt(user_text)
        asst_enc = self.crypto.encrypt(assistant_text)

        # Both inserts share one DB cursor → one commit/rollback.
        # If the assistant insert fails the user insert is rolled back too,
        # preventing orphaned messages in the conversation.
        _user_row, asst_row = self.msg_repo.append_pair(
            conversation_id     = thread_id,
            user_encrypted      = user_enc,
            assistant_encrypted = asst_enc,
            tokens_in           = tokens_in,
            tokens_out          = tokens_out,
        )

        self.conv_repo.update_last_message_at(
            thread_id, datetime.now(timezone.utc)
        )

        logger.info(
            "thread_message_persisted: thread=%s tokens_in=%s tokens_out=%s",
            thread_id,
            tokens_in,
            tokens_out,
        )
        return str(asst_row["id"])

    def persist_assistant_message(
        self,
        thread_id: str,
        assistant_text: str,
        tokens_out: Optional[int] = None,
    ) -> dict:
        """
        Encrypt and persist a single assistant message (assessment-trigger opener).

        Used when coaching starts with a bot-initiated message and no user turn yet.
        """
        asst_enc = self.crypto.encrypt(assistant_text)
        asst_row = self.msg_repo.append(
            conversation_id=thread_id,
            role="assistant",
            content_encrypted=asst_enc,
            tokens_out=tokens_out,
        )
        self.conv_repo.update_last_message_at(
            thread_id, datetime.now(timezone.utc)
        )
        logger.info(
            "thread_assistant_message_persisted: thread=%s",
            thread_id,
        )
        return asst_row

    def update_follow_up_chips(
        self, assistant_message_id: str, chips: list[dict[str, Any]]
    ) -> None:
        """Persist follow-up suggestion chips on an assistant message row."""
        self.msg_repo.update_follow_up_chips(assistant_message_id, chips)

    #  History loading (for LLM context injection) 

    def load_history_for_thread(
        self,
        thread_id: str,
        limit    : int = 12,
    ) -> list[dict]:
        """
        Return the last *limit* messages as a decrypted conversation history
        list, ready to be injected into ChatRequest.conversation_history.

        Returns an empty list when the thread has no messages yet.  The caller
        should fall back to frontend-provided conversation_history in that case.

        Format:
            [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}, ...]

        Args:
            thread_id: UUID string of the conversation.
            limit:     Maximum number of messages to include (default 12 =
                       context window).  This is the "Trim" in Thread & Trim.
        """
        rows = self.msg_repo.get_window(thread_id, limit=limit)
        if not rows:
            return []

        blobs = [r["content"] for r in rows]
        try:
            texts = self.crypto.decrypt_batch(blobs)
        except Exception as exc:
            logger.error(
                "load_history_decrypt_failed",
                extra={"thread_id": thread_id, "error": str(exc)},
                exc_info=True,
            )
            return []

        return [
            {"role": row["role"], "content": text}
            for row, text in zip(rows, texts)
        ]

    #  Full message list for export 

    def list_all_messages_for_export(
        self,
        thread_id   : str,
        user_id_hash: str,
        max_messages: int = 500,
    ) -> list[dict]:
        """
        Fetch and decrypt ALL user/assistant messages for a thread export.

        Unlike list_messages (which pages through at most 50 messages at a
        time), this method fetches the full conversation history in one query
        and is intended exclusively for the export endpoint.

        Args:
            thread_id:    UUID string.
            user_id_hash: Requester's SHA-256 user ID hash.
            max_messages: Safety cap (default 500).

        Returns:
            List of decrypted message dicts:
                { id, role, content (plaintext), created_at }

        Raises:
            ThreadOwnershipError: If the thread is not owned by user_id_hash.
        """
        thread = self.conv_repo.get(thread_id, user_id_hash)
        if not thread:
            raise ThreadOwnershipError("Thread not found or access denied.")

        rows = self.msg_repo.list_all_for_export(
            thread_id, max_messages=max_messages
        )
        if not rows:
            return []

        blobs = [r["content"] for r in rows]
        texts = self.crypto.decrypt_batch(blobs)

        return [
            {
                "id"        : str(row["id"]),
                "role"      : row["role"],
                "content"   : text,
                "created_at": row["created_at"],
            }
            for row, text in zip(rows, texts)
        ]

    #  Message history pagination (for the API endpoint) 

    def list_messages(
        self,
        thread_id   : str,
        user_id_hash: str,
        limit       : int           = 20,
        before_id   : Optional[str] = None,
    ) -> tuple[list[dict], bool]:
        """
        Return a decrypted page of messages for the given thread.

        Performs an ownership check first — raises ThreadOwnershipError if the
        thread does not exist or is not owned.

        Args:
            thread_id:    UUID string.
            user_id_hash: Requester's SHA-256 user ID hash.
            limit:        Page size.  One extra record is fetched to determine
                          whether more pages exist (has_more).
            before_id:    Cursor — return messages older than this message ID.

        Returns:
            (messages, has_more) — decrypted message dicts and pagination flag.

        Raises:
            ThreadOwnershipError: If the thread is not owned by *user_id_hash*.
        """
        thread = self.conv_repo.get(thread_id, user_id_hash)
        if not thread:
            raise ThreadOwnershipError("Thread not found or access denied.")

        # Fetch limit+1 to detect whether there's a next page
        rows = self.msg_repo.list_paginated(
            thread_id, limit=limit + 1, before_id=before_id
        )

        has_more = len(rows) > limit
        rows     = rows[:limit]

        if not rows:
            return [], False

        blobs = [r["content"] for r in rows]
        texts = self.crypto.decrypt_batch(blobs)

        result = [
            {
                **{k: v for k, v in row.items() if k != "content"},
                "content": text,
            }
            for row, text in zip(rows, texts)
        ]
        return result, has_more
