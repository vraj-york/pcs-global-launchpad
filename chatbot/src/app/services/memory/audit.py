"""Memory audit log writes."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from app.infrastructure.database import DatabaseClient

logger = logging.getLogger(__name__)


def write_memory_audit_log(
    *,
    user_id_hash: str,
    actor_role: str,
    action: str,
    memory_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    db_client: Optional[DatabaseClient] = None,
) -> None:
    db = db_client or DatabaseClient()
    sql = """
        INSERT INTO memory_audit_log
            (user_id_hash, actor_role, action, memory_id, metadata)
        VALUES (%s, %s, %s, %s, %s::jsonb)
    """
    try:
        with db.get_cursor() as cursor:
            cursor.execute(
                sql,
                (
                    user_id_hash,
                    actor_role,
                    action,
                    memory_id,
                    json.dumps(metadata or {}),
                ),
            )
    except Exception as exc:
        logger.error(
            "memory_audit_log_failed action=%s error=%s",
            action,
            exc,
        )
