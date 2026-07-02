"""
Audit Repository

Read-only query access to chatbot_audit_logs.
Used by the audit API endpoints for list and export operations.
"""

import logging
from datetime import datetime
from typing import Optional

from app.infrastructure.database import DatabaseClient

logger = logging.getLogger(__name__)


class AuditRepository:
    """
    Read access to chatbot_audit_logs.

    Returns rows as plain dicts (via RealDictCursor). UUID and datetime
    columns come back as Python uuid.UUID and datetime objects respectively —
    FastAPI's JSON encoder and json.dumps(default=str) both handle these
    transparently.
    """

    def __init__(self, db_client: Optional[DatabaseClient] = None):
        self.db = db_client or DatabaseClient()

    def query_logs(
        self,
        user_id   : Optional[str]      = None,
        outcome   : Optional[str]      = None,
        role      : Optional[str]      = None,
        start_time: Optional[datetime] = None,
        end_time  : Optional[datetime] = None,
        limit     : int                = 50,
        offset    : int                = 0,
    ) -> tuple[list[dict], int]:
        """
        Query audit logs with optional filters, pagination, and a total count.

        Args:
            user_id:    Filter to a specific hashed user identifier.
            outcome:    Filter by outcome value (answered, denied, error, fallback).
            role:       Filter by audit-schema role (super_admin, manager, end_user).
            start_time: Include records with timestamp >= start_time.
            end_time:   Include records with timestamp <= end_time.
            limit:      Page size (max enforced by caller).
            offset:     Pagination offset.

        Returns:
            (rows, total) — rows for the current page, total matching record count.
        """
        conditions: list[str] = []
        values    : list      = []

        if user_id:
            conditions.append("user_id = %s")
            values.append(user_id)
        if outcome:
            conditions.append("outcome = %s")
            values.append(outcome)
        if role:
            conditions.append("role = %s")
            values.append(role)
        if start_time:
            conditions.append("timestamp >= %s")
            values.append(start_time)
        if end_time:
            conditions.append("timestamp <= %s")
            values.append(end_time)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        count_sql = f"SELECT COUNT(*) AS total FROM chatbot_audit_logs {where}"
        data_sql  = f"""
            SELECT
                log_id, timestamp, user_id, role, session_id,
                chat_mode, model_id,
                outcome, denial_reason, error_code,
                retrieved_source_ids, retrieved_chunk_count,
                tool_calls_count, input_tokens, output_tokens,
                latency_ms, correlation_id
            FROM chatbot_audit_logs
            {where}
            ORDER BY timestamp DESC
            LIMIT %s OFFSET %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(count_sql, values)
            total: int = cursor.fetchone()["total"]

            cursor.execute(data_sql, values + [limit, offset])
            rows: list[dict] = [dict(row) for row in cursor.fetchall()]

        logger.info(f"audit_query: {len(rows)} rows returned (total={total})")
        return rows, total
