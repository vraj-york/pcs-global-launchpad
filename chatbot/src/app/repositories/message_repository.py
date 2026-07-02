"""
MessageRepository

Append-only write + paginated / windowed read operations on the ``messages``
table.

Design decisions:
  • Append-only: message ``content`` is never updated in place; deletion
    happens at the conversation level via soft_delete.  ``follow_up_chips`` is
    an exception: it is written after the assistant row exists (post-stream).
  • content is stored as raw bytes (BYTEA).  The repository does not know about
    encryption — callers pass in pre-encrypted bytes and receive raw bytes back.
    Encryption/decryption is the responsibility of the service layer
    (CryptoClient).  This keeps the repository testable without KMS.
  • get_window returns the last *limit* messages in chronological order
    (oldest first) so the caller can pass them directly to the LLM context
    without reversing.
  • list_paginated uses cursor-based pagination keyed on (created_at, id) for
    the chat history API endpoint.  An offset parameter is also supported for
    simpler callers.
"""

import json
import logging
import psycopg2
from typing import Any, Optional

from app.infrastructure.database import DatabaseClient

logger = logging.getLogger(__name__)

# Deterministic ordering when created_at ties (e.g. legacy rows from one txn).
_ROLE_ORDER_SQL = (
    "CASE role WHEN 'user' THEN 0 WHEN 'assistant' THEN 1 WHEN 'tool' THEN 2 ELSE 3 END"
)


class MessageRepository:
    """Access layer for the ``messages`` table."""

    def __init__(self, db_client: Optional[DatabaseClient] = None) -> None:
        self.db = db_client or DatabaseClient()

    #  Write 

    def append(
        self,
        conversation_id: str,
        role: str,
        content_encrypted: bytes,
        tokens_in: Optional[int] = None,
        tokens_out: Optional[int] = None,
        tool_calls: Optional[list] = None,
    ) -> dict:
        """
        Insert a single message and return the created row (id + created_at).

        Args:
            conversation_id:   UUID string of the parent conversation.
            role:              "user" | "assistant" | "tool".
            content_encrypted: AES-256-GCM ciphertext from CryptoClient.encrypt().
            tokens_in:         Input token count (None for user messages).
            tokens_out:        Output token count (None for user messages).
            tool_calls:        JSON-serialisable list of tool invocations, or None.

        Returns:
            Dict with at minimum ``id`` and ``created_at``.
        """
        sql = """
            INSERT INTO messages
                (conversation_id, role, content, tokens_in, tokens_out, tool_calls)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, conversation_id, role, tokens_in, tokens_out,
                      tool_calls, follow_up_chips, created_at
        """
        import json as _json
        tool_calls_json = (
            _json.dumps(tool_calls) if tool_calls is not None else None
        )

        with self.db.get_cursor() as cursor:
            cursor.execute(
                sql,
                (
                    conversation_id,
                    role,
                    psycopg2.Binary(content_encrypted),
                    tokens_in,
                    tokens_out,
                    tool_calls_json,
                ),
            )
            row = cursor.fetchone()

        return dict(row)

    #  Read 

    def get_window(self, conversation_id: str, limit: int = 12) -> list[dict]:
        """
        Return the most recent *limit* messages in chronological order.

        Used by the chat service to build the LLM conversation window.
        Each row includes the raw ``content`` bytes — the caller decrypts them
        via CryptoClient.decrypt_batch().

        Args:
            conversation_id: UUID string.
            limit:           Maximum number of messages to return (default 12,
                             aligns with the Thread & Trim context window).

        Returns:
            List of dicts ordered oldest-first.  ``content`` is Python bytes.
        """
        sql = f"""
            SELECT id, conversation_id, role, content, tokens_in, tokens_out,
                   tool_calls, follow_up_chips, created_at
            FROM (
                SELECT id, conversation_id, role, content, tokens_in, tokens_out,
                       tool_calls, follow_up_chips, created_at
                FROM messages
                WHERE conversation_id = %s
                ORDER BY created_at DESC, {_ROLE_ORDER_SQL} DESC, id DESC
                LIMIT %s
            ) sub
            ORDER BY created_at ASC, {_ROLE_ORDER_SQL} ASC, id ASC
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (conversation_id, limit))
            rows = cursor.fetchall()

        return [_coerce_row(dict(r)) for r in rows]

    def list_paginated(
        self,
        conversation_id: str,
        limit: int = 20,
        before_id: Optional[str] = None,
    ) -> list[dict]:
        """
        Return up to *limit* messages, optionally before a cursor message.

        Used by the chat history API endpoint to page backwards through a
        thread (infinite scroll loading older messages).  Returns rows in
        chronological order (oldest first within the page).

        Args:
            conversation_id: UUID string.
            limit:           Page size.
            before_id:       If provided, return only messages created before
                             the message with this id (exclusive cursor).

        Returns:
            List of dicts ordered oldest-first within the page.
            ``content`` is Python bytes (encrypted — decrypt in service layer).
        """
        if before_id:
            sql = f"""
                SELECT id, conversation_id, role, content, tokens_in, tokens_out,
                       tool_calls, follow_up_chips, created_at
                FROM (
                    SELECT id, conversation_id, role, content, tokens_in, tokens_out,
                           tool_calls, follow_up_chips, created_at
                    FROM messages
                    WHERE conversation_id = %s
                      AND created_at < (
                          SELECT created_at FROM messages WHERE id = %s
                      )
                    ORDER BY created_at DESC, {_ROLE_ORDER_SQL} DESC, id DESC
                    LIMIT %s
                ) sub
                ORDER BY created_at ASC, {_ROLE_ORDER_SQL} ASC, id ASC
            """
            params = (conversation_id, before_id, limit)
        else:
            sql = f"""
                SELECT id, conversation_id, role, content, tokens_in, tokens_out,
                       tool_calls, follow_up_chips, created_at
                FROM (
                    SELECT id, conversation_id, role, content, tokens_in, tokens_out,
                           tool_calls, follow_up_chips, created_at
                    FROM messages
                    WHERE conversation_id = %s
                    ORDER BY created_at DESC, {_ROLE_ORDER_SQL} DESC, id DESC
                    LIMIT %s
                ) sub
                ORDER BY created_at ASC, {_ROLE_ORDER_SQL} ASC, id ASC
            """
            params = (conversation_id, limit)

        with self.db.get_cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        return [_coerce_row(dict(r)) for r in rows]

    def append_pair(
        self,
        conversation_id    : str,
        user_encrypted     : bytes,
        assistant_encrypted: bytes,
        tokens_in          : Optional[int] = None,
        tokens_out         : Optional[int] = None,
    ) -> tuple[dict, dict]:
        """
        Insert a user message and its assistant reply in a single transaction.

        Both rows are written inside one ``get_cursor()`` context, so the commit
        covers them atomically — a failure after the first INSERT rolls back both,
        preventing orphaned user messages without a corresponding assistant reply.

        Args:
            conversation_id:     UUID string of the parent conversation.
            user_encrypted:      Encrypted bytes for the user message.
            assistant_encrypted: Encrypted bytes for the assistant message.
            tokens_in:           Input token count (applied to the user row).
            tokens_out:          Output token count (applied to the assistant row).

        Returns:
            (user_row, assistant_row) as plain dicts with ``id`` and ``created_at``.
        """
        sql_user = """
            INSERT INTO messages
                (conversation_id, role, content, tokens_in, tokens_out)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, conversation_id, role, tokens_in, tokens_out,
                      tool_calls, follow_up_chips, created_at
        """
        sql_asst = """
            INSERT INTO messages
                (conversation_id, role, content, tokens_in, tokens_out, created_at)
            VALUES (
                %s, 'assistant', %s, NULL, %s,
                (SELECT created_at + interval '1 microsecond'
                 FROM messages WHERE id = %s)
            )
            RETURNING id, conversation_id, role, tokens_in, tokens_out,
                      tool_calls, follow_up_chips, created_at
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(
                sql_user,
                (conversation_id, "user", psycopg2.Binary(user_encrypted), tokens_in, None),
            )
            user_row = dict(cursor.fetchone())

            cursor.execute(
                sql_asst,
                (
                    conversation_id,
                    psycopg2.Binary(assistant_encrypted),
                    tokens_out,
                    user_row["id"],
                ),
            )
            asst_row = dict(cursor.fetchone())

        return user_row, asst_row

    def update_follow_up_chips(self, message_id: str, chips: list[dict[str, Any]]) -> None:
        """
        Persist suggestion chips on an assistant message (post-stream update).

        Not part of the append-only content path; chips are non-sensitive JSON.
        """
        sql = """
            UPDATE messages
            SET follow_up_chips = %s::jsonb
            WHERE id = %s AND role = 'assistant'
        """
        payload = json.dumps(chips)
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (payload, message_id))

    def list_all_for_export(
        self,
        conversation_id: str,
        max_messages   : int = 500,
    ) -> list[dict]:
        """
        Fetch all user and assistant messages for a thread export.

        Excludes 'tool' role messages (internal LLM tool-call artefacts that
        must not appear in user-facing exports).  Results are ordered
        chronologically (oldest first).

        Args:
            conversation_id: UUID string of the parent conversation.
            max_messages:    Hard cap to prevent runaway allocations.

        Returns:
            List of dicts with raw (encrypted) ``content`` bytes.
        """
        sql = f"""
            SELECT id, conversation_id, role, content, created_at
            FROM messages
            WHERE conversation_id = %s
              AND role IN ('user', 'assistant')
            ORDER BY created_at ASC, {_ROLE_ORDER_SQL} ASC, id ASC
            LIMIT %s
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (conversation_id, max_messages))
            rows = cursor.fetchall()

        return [_coerce_row(dict(r)) for r in rows]

    def count(self, conversation_id: str) -> int:
        """Return the total number of messages in the conversation."""
        sql = "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = %s"
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (conversation_id,))
            row = cursor.fetchone()
        return int(row["n"]) if row else 0

    def get_latest_id(self, conversation_id: str) -> Optional[str]:
        """Return the UUID of the most recent message in the conversation."""
        sql = f"""
            SELECT id FROM messages
            WHERE conversation_id = %s
            ORDER BY created_at DESC, {_ROLE_ORDER_SQL} DESC, id DESC
            LIMIT 1
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (conversation_id,))
            row = cursor.fetchone()
        return str(row["id"]) if row else None


#  Helpers 

def _coerce_row(row: dict) -> dict:
    """
    Convert psycopg2 BYTEA columns (returned as memoryview) to plain bytes.

    psycopg2's RealDictCursor returns BYTEA columns as memoryview objects.
    The service layer (and tests) expect plain bytes so that CryptoClient
    can accept them without extra conversion.
    """
    if "content" in row and isinstance(row["content"], memoryview):
        row["content"] = bytes(row["content"])
    return row
