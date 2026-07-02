"""
ExportLogRepository — Persistent audit trail for conversation exports

Writes an append-only record for every export attempt (success or failure).
Used for:

  • Compliance / HIPAA audit trail — who exported what and when.
  • Rate-limiting  — count_recent() checks the DB instead of requiring Redis.
  • Forensics       — IP address + User-Agent for incident investigations.

Design decisions:
  • This repository is WRITE-ONLY from the application layer.  Reads are reserved
    for admin tooling (future audit endpoint or direct DB queries).
  • log_export() never raises — failures are swallowed and logged so that a DB
    write failure never aborts a legitimate export for the end user.
  • truncate_ua() prevents log-injection via a crafted oversized User-Agent header.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.infrastructure.database import DatabaseClient

logger = logging.getLogger(__name__)

_MAX_UA_LENGTH   = 256
_MAX_TITLE_LENGTH = 500


class ExportLogRepository:
    """Append-only audit log for conversation PDF exports."""

    def __init__(self, db_client: Optional[DatabaseClient] = None) -> None:
        self.db = db_client or DatabaseClient()

    ### Write 

    def log_export(
        self,
        *,
        user_id_hash : str,
        thread_id    : str,
        thread_title : str,
        message_count: int,
        persona      : str,
        ip_address   : Optional[str],
        user_agent   : Optional[str],
        success      : bool = True,
        error_code   : Optional[str] = None,
    ) -> None:
        """
        Append a single export event row.

        Never raises — a write failure must not abort the export itself.
        Errors are logged to CloudWatch for operational alerting.

        Args:
            user_id_hash:  SHA-256 hash of the Cognito sub (from JWT).
            thread_id:     UUID of the exported conversation.
            thread_title:  Title of the conversation at export time.
            message_count: Number of messages included in the export.
            persona:       Thread persona (employee | coach | default | superadmin).
            ip_address:    Client IP from X-Forwarded-For or socket peer.
            user_agent:    Client User-Agent header, truncated to 256 chars.
            success:       True if PDF was generated and returned; False otherwise.
            error_code:    Short code for failure reason (not_found, rate_limited,
                           generation_failed, empty_conversation).
        """
        safe_ua    = (user_agent or "")[:_MAX_UA_LENGTH] or None
        safe_title = (thread_title or "")[:_MAX_TITLE_LENGTH]
        safe_ip    = (ip_address  or "").strip()[:64] or None

        sql = """
            INSERT INTO conversation_export_logs
                (user_id_hash, thread_id, thread_title, message_count, persona,
                 ip_address, user_agent, success, error_code)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        try:
            with self.db.get_cursor() as cursor:
                cursor.execute(sql, (
                    user_id_hash,
                    thread_id,
                    safe_title,
                    message_count,
                    persona,
                    safe_ip,
                    safe_ua,
                    success,
                    error_code,
                ))
        except Exception as exc:
            logger.error(
                "export_log_write_failed: user=%s thread=%s error=%s",
                user_id_hash[:8], thread_id, exc,
                exc_info=True,
            )

    ### Read (rate limiting only) 

    def count_recent_successful(
        self,
        user_id_hash: str,
        hours       : int = 1,
    ) -> int:
        """
        Return the number of successful exports by this user in the last *hours*.

        Used to enforce the per-user hourly export rate limit.  The query hits
        the ``idx_export_logs_user_recent`` partial index (success = true),
        making it a fast index scan on active users.

        Args:
            user_id_hash: Hashed user identifier.
            hours:        Look-back window in hours (default 1).

        Returns:
            Integer count of successful exports within the window.
        """
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        sql = """
            SELECT COUNT(*) AS n
            FROM conversation_export_logs
            WHERE user_id_hash = %s
              AND exported_at  >= %s
              AND success      = true
        """
        try:
            with self.db.get_cursor() as cursor:
                cursor.execute(sql, (user_id_hash, since))
                row = cursor.fetchone()
            return int(row["n"]) if row else 0
        except Exception as exc:
            logger.error(
                "export_log_count_failed: user=%s error=%s",
                user_id_hash[:8], exc,
                exc_info=True,
            )
            # On read failure, allow the export (fail open on rate-limit check
            # rather than blocking legitimate users because of a DB hiccup).
            return 0
