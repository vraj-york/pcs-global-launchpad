"""
SummaryRepository

Upsert + read access on the ``thread_summaries`` table.

Design decisions:
  • One summary per conversation — upsert replaces the previous row on refresh.
  • ``up_to_message`` tracks the newest message ID included in the summary.
    The service layer compares this against the latest message_id to decide
    whether the summary is stale and needs regeneration.
  • Like MessageRepository, this layer stores and returns raw bytes; the service
    layer handles encryption/decryption via CryptoClient.
  • ``get`` returns None when no summary has been generated yet — callers treat
    this as "summarise from full history" on first request.
"""

import logging
import psycopg2
from typing import Optional

from app.infrastructure.database import DatabaseClient

logger = logging.getLogger(__name__)


class SummaryRepository:
    """Access layer for the ``thread_summaries`` table."""

    def __init__(self, db_client: Optional[DatabaseClient] = None) -> None:
        self.db = db_client or DatabaseClient()

    #  Read 

    def get(self, conversation_id: str) -> Optional[dict]:
        """
        Return the current summary for *conversation_id*, or None.

        Returns:
            Dict with keys: conversation_id, summary (bytes), up_to_message (str),
            tokens (int), generated_at (datetime).
            None if no summary has been generated yet.
        """
        sql = """
            SELECT conversation_id, summary, up_to_message::text,
                   tokens, generated_at
            FROM thread_summaries
            WHERE conversation_id = %s
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (conversation_id,))
            row = cursor.fetchone()

        if not row:
            return None

        result = dict(row)
        if isinstance(result.get("summary"), memoryview):
            result["summary"] = bytes(result["summary"])
        return result

    #  Write 

    def upsert(
        self,
        conversation_id: str,
        summary_encrypted: bytes,
        up_to_message_id: str,
        tokens: int,
    ) -> None:
        """
        Insert or replace the summary for *conversation_id*.

        Called by the summarisation service after each
        successful summary generation.

        Args:
            conversation_id:   UUID string of the parent conversation.
            summary_encrypted: AES-256-GCM ciphertext from CryptoClient.encrypt().
            up_to_message_id:  UUID string of the newest message included.
            tokens:            Token count of the summary text (for billing tracking).
        """
        sql = """
            INSERT INTO thread_summaries
                (conversation_id, summary, up_to_message, tokens, generated_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (conversation_id) DO UPDATE
                SET summary       = EXCLUDED.summary,
                    up_to_message = EXCLUDED.up_to_message,
                    tokens        = EXCLUDED.tokens,
                    generated_at  = now()
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(
                sql,
                (
                    conversation_id,
                    psycopg2.Binary(summary_encrypted),
                    up_to_message_id,
                    tokens,
                ),
            )

        logger.info(
            "summary_upserted: conversation=%s up_to=%s tokens=%d",
            conversation_id,
            up_to_message_id,
            tokens,
        )
