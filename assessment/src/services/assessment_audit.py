"""
Audit log writes for assessment HTTP API (domain aligned with NestJS audit_logs).
"""
from typing import Any, Literal, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from starlette.requests import Request

from database.queries.audit_logs import insert_audit_log
from utils.assessment_access_context import AssessmentAccessContext
from utils.client_ip import get_client_ip

ASSESSMENT_DOMAIN = "assessment"
AuditEventType = Literal["VIEW", "ADD", "EDIT", "REMOVE"]


def log_assessment_audit(
    db: Session,
    request: Request,
    ctx: AssessmentAccessContext,
    *,
    event_type: AuditEventType,
    entity_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    insert_audit_log(
        db,
        domain=ASSESSMENT_DOMAIN,
        event_type=event_type,
        user_id=ctx.cognito_sub,
        entity_id=entity_id,
        ip_address=get_client_ip(request),
        metadata=metadata,
    )


def metadata_after_payload(model: Any) -> dict[str, Any]:
    """Safe JSON for metadata.after (no secrets)."""
    if hasattr(model, "model_dump"):
        return {"target": "assessment", "after": model.model_dump(mode="json")}
    return {"target": "assessment", "after": jsonable_encoder(model)}
