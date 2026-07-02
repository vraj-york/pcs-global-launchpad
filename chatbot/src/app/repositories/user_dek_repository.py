"""Per-user DEK persistence for memory encryption and crypto-shred."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.infrastructure.database import DatabaseClient, coerce_bytea


class UserDekRepository:
    def __init__(self, db_client: Optional[DatabaseClient] = None) -> None:
        self.db = db_client or DatabaseClient()

    def get_active(self, user_id_hash: str) -> Optional[dict]:
        sql = """
            SELECT user_id_hash, encrypted_dek, dek_version, created_at, shredded_at
            FROM user_deks
            WHERE user_id_hash = %s
              AND shredded_at IS NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (user_id_hash,))
            row = cursor.fetchone()
            if not row:
                return None
            record = dict(row)
            return {
                "user_id_hash": record["user_id_hash"],
                "encrypted_dek": coerce_bytea(record["encrypted_dek"]),
                "dek_version": record["dek_version"],
                "created_at": record["created_at"],
                "shredded_at": record["shredded_at"],
            }

    def insert(self, user_id_hash: str, encrypted_dek: bytes, *, dek_version: int = 1) -> dict:
        sql = """
            INSERT INTO user_deks (user_id_hash, encrypted_dek, dek_version)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id_hash) DO UPDATE
            SET encrypted_dek = EXCLUDED.encrypted_dek,
                dek_version = EXCLUDED.dek_version,
                shredded_at = NULL
            RETURNING user_id_hash, encrypted_dek, dek_version, created_at, shredded_at
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (user_id_hash, encrypted_dek, dek_version))
            row = cursor.fetchone()
            record = dict(row)
            return {
                "user_id_hash": record["user_id_hash"],
                "encrypted_dek": coerce_bytea(record["encrypted_dek"]),
                "dek_version": record["dek_version"],
                "created_at": record["created_at"],
                "shredded_at": record["shredded_at"],
            }

    def crypto_shred(self, user_id_hash: str) -> bool:
        """Delete the user's DEK row so ciphertext becomes permanently unreadable."""
        sql = """
            DELETE FROM user_deks
            WHERE user_id_hash = %s
            RETURNING user_id_hash
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (user_id_hash,))
            return cursor.fetchone() is not None
