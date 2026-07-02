"""Memory extraction consent persistence."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from app.config import settings
from app.infrastructure.database import DatabaseClient

logger = logging.getLogger(__name__)


class MemoryConsentRepository:
    def __init__(self, db_client: Optional[DatabaseClient] = None) -> None:
        self.db = db_client or DatabaseClient()

    def get(self, user_id_hash: str) -> Optional[dict]:
        sql = """
            SELECT user_id_hash, granted, scope, source, granted_at, revoked_at, updated_at
            FROM memory_consent
            WHERE user_id_hash = %s
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(sql, (user_id_hash,))
            row = cursor.fetchone()
        return dict(row) if row else None

    def is_granted(self, user_id_hash: str) -> bool:
        row = self.get(user_id_hash)
        if row is None:
            return settings.MEMORY_CONSENT_DEFAULT_GRANTED
        return bool(row.get("granted"))

    def upsert(
        self,
        user_id_hash: str,
        *,
        granted: bool,
        source: str = "ui",
        scope: str = "memory_extraction",
    ) -> dict:
        now = datetime.now(timezone.utc)
        granted_at = now if granted else None
        revoked_at = None if granted else now

        sql = """
            INSERT INTO memory_consent
                (user_id_hash, granted, scope, source, granted_at, revoked_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id_hash) DO UPDATE SET
                granted = EXCLUDED.granted,
                scope = EXCLUDED.scope,
                source = EXCLUDED.source,
                granted_at = CASE WHEN EXCLUDED.granted THEN EXCLUDED.granted_at ELSE memory_consent.granted_at END,
                revoked_at = CASE WHEN EXCLUDED.granted THEN NULL ELSE EXCLUDED.revoked_at END,
                updated_at = EXCLUDED.updated_at
            RETURNING user_id_hash, granted, scope, source, granted_at, revoked_at, updated_at
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(
                sql,
                (
                    user_id_hash,
                    granted,
                    scope,
                    source,
                    granted_at,
                    revoked_at,
                    now,
                ),
            )
            row = cursor.fetchone()
        return dict(row)
