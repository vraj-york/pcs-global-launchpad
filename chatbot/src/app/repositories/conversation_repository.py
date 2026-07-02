"""
ConversationRepository

CRUD + lifecycle operations on the ``conversations`` table.

Design decisions:
  • Soft-delete: soft_deleted_at is set to now() instead of DELETE to preserve
    the audit trail within the GDPR retention window.  Hard deletes are a
    separate admin operation (not exposed via the chat API).
  • Owner check: every mutating method accepts ``user_id_hash`` and includes it
    in the WHERE clause.  An operation on a thread the caller does not own
    silently returns False / None — the route handler raises HTTP 404 so that
    the existence of other users' threads is not leaked.
  • Pagination: offset-based (sidebar lists rarely exceed a few hundred
    threads per user).  Cursor-based pagination can replace this in Distilled Memories
    without changing the caller interface.
  • last_message_at: written by the *caller* (message_repository or chat service)
    after a successful message append, not via DB trigger, so the column only
    moves forward and is always tied to a real message timestamp.
"""

import logging
import psycopg2
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.infrastructure.database import DatabaseClient

logger = logging.getLogger(__name__)


class ConversationRepository:
    """Access layer for the ``conversations`` table."""

    def __init__(self, db_client: Optional[DatabaseClient] = None) -> None:
        self.db = db_client or DatabaseClient()

    #  Read 

    def get(self, conversation_id: str, user_id_hash: str) -> Optional[dict]:
        """
        Return one active conversation row if it is owned by *user_id_hash*.

        Returns None if not found, soft-deleted, or owned by someone else.
        Callers should treat None as HTTP 404 to avoid leaking thread existence.
        """
        sql = """
            SELECT id, user_id_hash, title, pinned, persona, chat_mode,
                   coach_client_id, created_at, updated_at,
                   last_message_at, soft_deleted_at
            FROM conversations
            WHERE id = %s
              AND user_id_hash = %s
              AND soft_deleted_at IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (conversation_id, user_id_hash))
            row = cursor.fetchone()
        return dict(row) if row else None

    def list_by_user(
        self,
        user_id_hash: str,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        """
        Return a page of active conversations for *user_id_hash*, plus the total.

        Ordered: pinned threads first, then by most recent activity descending.
        Threads with no messages yet sort by created_at.

        Args:
            user_id_hash: SHA-256 hash of the Cognito sub.
            limit:        Page size (caller should cap at a reasonable maximum).
            offset:       Pagination offset.

        Returns:
            (rows, total) — rows for this page, total matching thread count.
        """
        base_where = "WHERE user_id_hash = %s AND soft_deleted_at IS NULL"

        count_sql = f"SELECT COUNT(*) AS total FROM conversations {base_where}"

        data_sql = f"""
            SELECT id, user_id_hash, title, pinned, persona, chat_mode,
                   coach_client_id, created_at, updated_at,
                   last_message_at
            FROM conversations
            {base_where}
            ORDER BY pinned DESC, COALESCE(last_message_at, created_at) DESC
            LIMIT %s OFFSET %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(count_sql, (user_id_hash,))
            total: int = cursor.fetchone()["total"]

            cursor.execute(data_sql, (user_id_hash, limit, offset))
            rows: list[dict] = [dict(r) for r in cursor.fetchall()]

        return rows, total

    #  Create 

    def create(
        self,
        user_id_hash: str,
        persona: str,
        chat_mode: str,
        title: str = "New conversation",
        coach_client_id: Optional[str] = None,
    ) -> dict:
        """
        Insert a new conversation row and return it.

        Args:
            user_id_hash:    SHA-256 of Cognito sub.
            persona:         One of employee | coach | superadmin | default.
            chat_mode:       quick | deep_dive.
            title:           Human-readable thread title (auto-generated on first
                             assistant message).
            coach_client_id: Required when persona == "coach".

        Returns:
            The newly created conversation as a plain dict.
        """
        sql = """
            INSERT INTO conversations
                (user_id_hash, title, persona, chat_mode, coach_client_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id_hash, title, pinned, persona, chat_mode,
                      coach_client_id, created_at, updated_at, last_message_at
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(
                sql,
                (user_id_hash, title, persona, chat_mode, coach_client_id),
            )
            row = cursor.fetchone()

        logger.info("conversation_created: id=%s user=%s", row["id"], user_id_hash[:8])
        return dict(row)

    #  Update 

    def rename(self, conversation_id: str, user_id_hash: str, title: str) -> bool:
        """
        Rename a thread.  Returns True if the row was updated, False if not found
        or not owned.
        """
        sql = """
            UPDATE conversations
            SET title = %s
            WHERE id = %s AND user_id_hash = %s AND soft_deleted_at IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (title, conversation_id, user_id_hash))
            return cursor.rowcount > 0

    def set_pinned(
        self, conversation_id: str, user_id_hash: str, pinned: bool
    ) -> bool:
        """Toggle the pinned flag.  Returns True on success."""
        sql = """
            UPDATE conversations
            SET pinned = %s
            WHERE id = %s AND user_id_hash = %s AND soft_deleted_at IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (pinned, conversation_id, user_id_hash))
            return cursor.rowcount > 0

    def update_last_message_at(
        self, conversation_id: str, last_message_at: datetime
    ) -> None:
        """
        Advance ``last_message_at`` to *last_message_at*.

        Called by the chat service after successfully persisting a message pair.
        Does NOT require an owner check — it is an internal operation triggered
        by the service layer, not a user request.
        """
        sql = """
            UPDATE conversations
            SET last_message_at = %s
            WHERE id = %s AND soft_deleted_at IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (last_message_at, conversation_id))

    #  Delete 

    def soft_delete(self, conversation_id: str, user_id_hash: str) -> bool:
        """
        Mark a thread as deleted by setting soft_deleted_at = now().

        The thread and its messages are hidden from all queries but remain
        on disk for the GDPR audit window.  Returns True if the row was updated.

        Upgrade path (Distilled Memories): replace with crypto-shred — rotate/delete the
        per-user DEK so the ciphertext becomes permanently unreadable.
        """
        sql = """
            UPDATE conversations
            SET soft_deleted_at = now()
            WHERE id = %s AND user_id_hash = %s AND soft_deleted_at IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (conversation_id, user_id_hash))
            deleted = cursor.rowcount > 0

        if deleted:
            logger.info(
                "conversation_soft_deleted: id=%s user=%s",
                conversation_id,
                user_id_hash[:8],
            )
        return deleted
