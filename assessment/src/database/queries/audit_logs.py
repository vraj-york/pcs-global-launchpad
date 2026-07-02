from typing import Any, Optional

from sqlalchemy.orm import Session

from database.models import AuditLog
from utils.logger import logger


def insert_audit_log(
    db: Session,
    *,
    domain: str,
    event_type: str,
    user_id: Optional[str],
    entity_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """
    Append-only audit row. Swallows errors so API responses are never blocked by logging.
    """
    try:
        row = AuditLog(
            domain=domain[:100],
            event_type=event_type[:100],
            user_id=user_id[:255] if user_id else None,
            entity_id=entity_id[:255] if entity_id else None,
            ip_address=ip_address[:45] if ip_address else None,
            audit_metadata=metadata,
        )
        db.add(row)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("Failed to write audit_logs row: %s", e, exc_info=True)
