"""CRUD and hybrid search for distilled memories."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from app.domain.memory_registry import (
    validate_bsp_dimension,
    validate_memory_kind,
    validate_memory_status,
    validate_scope_type,
    validate_sensitivity,
)
from app.infrastructure.database import DatabaseClient, coerce_bytea

logger = logging.getLogger(__name__)

_ACTIVE_FILTER = """
    soft_deleted_at IS NULL
    AND superseded_by IS NULL
"""


def _normalize_row(row) -> dict:
    record = dict(row)
    if "content_ciphertext" in record and record["content_ciphertext"] is not None:
        record["content_ciphertext"] = coerce_bytea(record["content_ciphertext"])
    return record


class MemoryRepository:
    def __init__(self, db_client: Optional[DatabaseClient] = None) -> None:
        self.db = db_client or DatabaseClient()

    def insert(
        self,
        *,
        user_id_hash: str,
        kind: str,
        content_ciphertext: bytes,
        embedding: list[float],
        entities: list[str],
        entities_normalized: list[str],
        status: str = "candidate",
        bsp_dimension: Optional[str] = None,
        scope_type: str = "personal",
        scope_ref: Optional[str] = None,
        sensitivity: str = "normal",
        importance: float = 0.5,
        source_message_id: Optional[str] = None,
        source_conversation_id: Optional[str] = None,
        extraction_idempotency_key: Optional[str] = None,
        user_edited: bool = False,
    ) -> dict:
        validate_memory_kind(kind)
        validate_bsp_dimension(kind, bsp_dimension)
        validate_memory_status(status)
        validate_scope_type(scope_type)
        validate_sensitivity(sensitivity)

        sql = """
            INSERT INTO memories (
                user_id_hash, kind, bsp_dimension, scope_type, scope_ref, sensitivity,
                content_ciphertext, embedding, entities, entities_normalized,
                importance, status, source_message_id, source_conversation_id,
                extraction_idempotency_key, user_edited
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s::vector, %s::jsonb, %s::jsonb,
                %s, %s, %s, %s,
                %s, %s
            )
            RETURNING id, user_id_hash, kind, bsp_dimension, scope_type, scope_ref,
                      sensitivity, entities, entities_normalized, importance, status,
                      source_message_id, source_conversation_id, user_edited,
                      created_at, last_accessed_at, last_retrieved_at
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(
                sql,
                (
                    user_id_hash,
                    kind,
                    bsp_dimension,
                    scope_type,
                    scope_ref,
                    sensitivity,
                    content_ciphertext,
                    embedding,
                    json.dumps(entities),
                    json.dumps(entities_normalized),
                    importance,
                    status,
                    source_message_id,
                    source_conversation_id,
                    extraction_idempotency_key,
                    user_edited,
                ),
            )
            row = cursor.fetchone()
        return dict(row)

    def get_owned(
        self,
        memory_id: str,
        user_id_hash: str,
        *,
        include_deleted: bool = False,
    ) -> Optional[dict]:
        deleted_clause = "" if include_deleted else "AND soft_deleted_at IS NULL"
        sql = f"""
            SELECT id, user_id_hash, kind, bsp_dimension, scope_type, scope_ref,
                   sensitivity, content_ciphertext, entities, entities_normalized,
                   importance, status, source_message_id, source_conversation_id,
                   superseded_by, user_edited, created_at, last_accessed_at, last_retrieved_at
            FROM memories
            WHERE id = %s AND user_id_hash = %s {deleted_clause}
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (memory_id, user_id_hash))
            row = cursor.fetchone()
        return _normalize_row(row) if row else None

    def list_for_user(
        self,
        user_id_hash: str,
        *,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        params: list[Any] = [user_id_hash]
        status_clause = ""
        if status:
            validate_memory_status(status)
            status_clause = "AND status = %s"
            params.append(status)

        sql = f"""
            SELECT id, user_id_hash, kind, bsp_dimension, scope_type, scope_ref,
                   sensitivity, content_ciphertext, entities, entities_normalized,
                   importance, status, source_message_id, source_conversation_id,
                   user_edited, created_at, last_accessed_at, last_retrieved_at
            FROM memories
            WHERE user_id_hash = %s
              AND soft_deleted_at IS NULL
              AND superseded_by IS NULL
              {status_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
        return [_normalize_row(r) for r in rows]

    def update_content(
        self,
        memory_id: str,
        user_id_hash: str,
        *,
        content_ciphertext: bytes,
        embedding: list[float],
        entities: list[str],
        entities_normalized: list[str],
        user_edited: bool = True,
    ) -> bool:
        sql = """
            UPDATE memories
            SET content_ciphertext = %s,
                embedding = %s::vector,
                entities = %s::jsonb,
                entities_normalized = %s::jsonb,
                user_edited = %s,
                last_accessed_at = %s
            WHERE id = %s AND user_id_hash = %s AND soft_deleted_at IS NULL
        """
        now = datetime.now(timezone.utc)
        with self.db.get_cursor() as cursor:
            cursor.execute(
                sql,
                (
                    content_ciphertext,
                    embedding,
                    json.dumps(entities),
                    json.dumps(entities_normalized),
                    user_edited,
                    now,
                    memory_id,
                    user_id_hash,
                ),
            )
            return cursor.rowcount > 0

    def set_status(
        self,
        memory_id: str,
        user_id_hash: str,
        status: str,
    ) -> bool:
        validate_memory_status(status)
        sql = """
            UPDATE memories
            SET status = %s, last_accessed_at = %s
            WHERE id = %s AND user_id_hash = %s AND soft_deleted_at IS NULL
        """
        now = datetime.now(timezone.utc)
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (status, now, memory_id, user_id_hash))
            return cursor.rowcount > 0

    def soft_delete(self, memory_id: str, user_id_hash: str) -> bool:
        sql = """
            UPDATE memories
            SET soft_deleted_at = %s
            WHERE id = %s AND user_id_hash = %s AND soft_deleted_at IS NULL
        """
        now = datetime.now(timezone.utc)
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (now, memory_id, user_id_hash))
            return cursor.rowcount > 0

    def supersede(self, old_id: str, new_id: str, user_id_hash: str) -> bool:
        sql = """
            UPDATE memories
            SET superseded_by = %s
            WHERE id = %s AND user_id_hash = %s AND superseded_by IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (new_id, old_id, user_id_hash))
            return cursor.rowcount > 0

    def find_by_idempotency_key(self, key: str) -> Optional[dict]:
        sql = """
            SELECT id FROM memories WHERE extraction_idempotency_key = %s LIMIT 1
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (key,))
            row = cursor.fetchone()
        return dict(row) if row else None

    def list_summaries_for_dedup(
        self,
        user_id_hash: str,
        *,
        limit: int = 10,
    ) -> list[dict]:
        sql = f"""
            SELECT id, kind, content_ciphertext, entities_normalized, status
            FROM memories
            WHERE user_id_hash = %s
              AND {_ACTIVE_FILTER}
              AND status IN ('confirmed', 'candidate')
            ORDER BY created_at DESC
            LIMIT %s
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (user_id_hash, limit))
            rows = cursor.fetchall()
        return [_normalize_row(r) for r in rows]

    def semantic_search(
        self,
        *,
        user_id_hash: str,
        query_embedding: list[float],
        allowed_kinds: frozenset[str],
        limit: int,
    ) -> list[dict]:
        if limit <= 0 or not allowed_kinds:
            return []

        kind_placeholders = ", ".join(["%s"] * len(allowed_kinds))
        sql = f"""
            SELECT id, kind, bsp_dimension, content_ciphertext, entities,
                   importance, status,
                   (1 - (embedding <=> %s::vector)) AS similarity
            FROM memories
            WHERE user_id_hash = %s
              AND {_ACTIVE_FILTER}
              AND status = 'confirmed'
              AND kind IN ({kind_placeholders})
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        params: list[Any] = [
            query_embedding,
            user_id_hash,
            *sorted(allowed_kinds),
            query_embedding,
            limit * 3,
        ]
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
        return [_normalize_row(r) for r in rows]

    def entity_search(
        self,
        *,
        user_id_hash: str,
        entity_keys: list[str],
        allowed_kinds: frozenset[str],
        limit: int,
    ) -> list[dict]:
        if limit <= 0 or not entity_keys or not allowed_kinds:
            return []

        kind_placeholders = ", ".join(["%s"] * len(allowed_kinds))
        sql = f"""
            SELECT id, kind, bsp_dimension, content_ciphertext, entities,
                   importance, status, 1.0 AS similarity
            FROM memories
            WHERE user_id_hash = %s
              AND {_ACTIVE_FILTER}
              AND status = 'confirmed'
              AND kind IN ({kind_placeholders})
              AND entities_normalized ?| %s::text[]
            ORDER BY importance DESC, created_at DESC
            LIMIT %s
        """
        params: list[Any] = [
            user_id_hash,
            *sorted(allowed_kinds),
            entity_keys,
            limit * 3,
        ]
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
        return [_normalize_row(r) for r in rows]

    def mark_retrieved(self, memory_ids: list[str]) -> None:
        if not memory_ids:
            return
        now = datetime.now(timezone.utc)
        placeholders = ", ".join(["%s"] * len(memory_ids))
        sql = f"""
            UPDATE memories
            SET last_retrieved_at = %s
            WHERE id IN ({placeholders})
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (now, *memory_ids))

    def find_conflicts(
        self,
        user_id_hash: str,
        kind: str,
        entities_normalized: list[str],
    ) -> list[dict]:
        if not entities_normalized:
            return []
        sql = f"""
            SELECT id, kind, content_ciphertext, entities_normalized
            FROM memories
            WHERE user_id_hash = %s
              AND {_ACTIVE_FILTER}
              AND status = 'confirmed'
              AND kind = %s
              AND entities_normalized ?| %s::text[]
            ORDER BY created_at DESC
            LIMIT 5
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (user_id_hash, kind, entities_normalized))
            rows = cursor.fetchall()
        return [_normalize_row(r) for r in rows]

    def count_candidates(self, user_id_hash: str) -> int:
        sql = """
            SELECT COUNT(*) AS total
            FROM memories
            WHERE user_id_hash = %s
              AND status = 'candidate'
              AND soft_deleted_at IS NULL
              AND superseded_by IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (user_id_hash,))
            row = cursor.fetchone()
        return int(row["total"]) if row else 0
