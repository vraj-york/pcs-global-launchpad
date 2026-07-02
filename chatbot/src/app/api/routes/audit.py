"""
Audit API Routes

Exposes chatbot_audit_logs to two consumers:

  1. Super admins (JWT-authenticated)
     GET /audit/logs          — paginated list with filters
     GET /audit/logs/export   — full filtered export via S3 presigned URL

  2. Backend service (API-key authenticated)
     GET /audit/logs/backend-export — time-scoped export for nightly pulls

Auth design note

Unlike the TEMPORARY chat routes (which read role from the request payload),
these endpoints decode the Cognito JWT properly via decode_access_token().
The audit endpoints are security-sensitive enough to require verified role
resolution — they should not inherit the TEMPORARY fallback pattern.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import uuid as uuid_module
from datetime import datetime
from typing import Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings
from app.infrastructure.database import DatabaseClient 
from app.repositories.audit_repository import AuditRepository
from app.utils.auth import decode_access_token
from app.utils.auth_context import AuthContext, AuthContextError, extract_auth_context
from app.api.dependencies import get_database_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["Audit"])
bearer = HTTPBearer()


#  Auth Dependencies 

async def get_auth_context(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> AuthContext:
    """
    Extracts and validates auth context from the Bearer token.

    Unlike the chat routes, the role is decoded from the Cognito JWT
    cognito:groups claim (via decode_access_token), not from the request payload.
    This ensures super_admin guard decisions are based on a verified identity.
    """
    token = credentials.credentials
    try:
        role = decode_access_token(token)  # reads cognito:groups claim
        return extract_auth_context(
            access_token  = token,
            fallback_role = role,
        )
    except AuthContextError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail     ="Invalid or missing token",
        )


def require_super_admin(auth: AuthContext = Depends(get_auth_context)) -> AuthContext:
    """
    Role guard — rejects any role that is not superadmin.
    Used as a dependency on every audit endpoint.
    """
    if auth.role != "superadmin":
        logger.warning(
            "unauthorized_audit_access_attempt",
            extra={"user_id": auth.user_id, "role": auth.role},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail     ="Audit log access requires super_admin role",
        )
    return auth


#  Shared helpers 

def _get_audit_repo(
    db_client: DatabaseClient = Depends(get_database_client),
) -> AuditRepository:
    return AuditRepository(db_client=db_client)


class ExportResponse(BaseModel):
    export_id         : str
    download_url      : str
    expires_in_seconds: int
    record_count      : int
    format            : str


def _write_export_to_s3(rows: list[dict], fmt: str, export_id: str) -> str:
    """
    Serialises rows to CSV or JSON and uploads to S3.
    Returns the S3 object key.
    """
    if not settings.AUDIT_EXPORT_BUCKET:
        raise RuntimeError("AUDIT_EXPORT_BUCKET is not configured")

    key = f"audit-exports/{export_id}.{fmt}"
    s3  = boto3.client("s3", region_name=settings.AWS_REGION)

    if fmt == "csv":
        buffer = io.StringIO()
        if rows:
            writer = csv.DictWriter(buffer, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        content      = buffer.getvalue().encode("utf-8")
        content_type = "text/csv"
    else:
        content      = json.dumps(rows, default=str, indent=2).encode("utf-8")
        content_type = "application/json"

    s3.put_object(
        Bucket      = settings.AUDIT_EXPORT_BUCKET,
        Key         = key,
        Body        = content,
        ContentType = content_type,
        Metadata    = {
            "exported-by" : "chatbot-audit-service",
            "export-id"   : export_id,
            "record-count": str(len(rows)),
        },
    )
    return key


def _generate_presigned_url(key: str) -> str:
    s3 = boto3.client("s3", region_name=settings.AWS_REGION)
    return s3.generate_presigned_url(
        "get_object",
        Params    = {"Bucket": settings.AUDIT_EXPORT_BUCKET, "Key": key},
        ExpiresIn = settings.EXPORT_URL_EXPIRY_SECONDS,
    )


#  Health check 

@router.get("/health")
async def audit_health():
    return {"status": "ok", "service": "audit-api"}


#  Super admin: paginated list 

class AuditLogsResponse(BaseModel):
    items : list[dict]
    total : int
    limit : int
    offset: int


@router.get("/logs", response_model=AuditLogsResponse)
async def list_audit_logs(
    auth      : AuthContext        = Depends(require_super_admin),
    repo      : AuditRepository    = Depends(_get_audit_repo),
    user_id   : Optional[str]      = Query(default=None, description="Filter by hashed user_id"),
    outcome   : Optional[str]      = Query(default=None, description="answered | denied | error | fallback"),
    role      : Optional[str]      = Query(default=None, description="super_admin | manager | end_user"),
    start_time: Optional[datetime] = Query(default=None),
    end_time  : Optional[datetime] = Query(default=None),
    limit     : int                = Query(default=50, ge=1, le=200),
    offset    : int                = Query(default=0, ge=0),
):
    """
    Paginated audit log query. Only accessible by super_admin.

    All filter parameters are optional and combinable.
    Returns rows sorted by timestamp DESC.
    """
    rows, total = repo.query_logs(
        user_id    = user_id,
        outcome    = outcome,
        role       = role,
        start_time = start_time,
        end_time   = end_time,
        limit      = limit,
        offset     = offset,
    )
    return AuditLogsResponse(items=rows, total=total, limit=limit, offset=offset)


#  Super admin: export 

@router.get("/logs/export", response_model=ExportResponse)
async def export_audit_logs(
    auth      : AuthContext        = Depends(require_super_admin),
    repo      : AuditRepository    = Depends(_get_audit_repo),
    user_id   : Optional[str]      = Query(default=None),
    outcome   : Optional[str]      = Query(default=None),
    role      : Optional[str]      = Query(default=None),
    start_time: Optional[datetime] = Query(default=None),
    end_time  : Optional[datetime] = Query(default=None),
    fmt       : str                = Query(default="json", pattern="^(json|csv)$"),
):
    """
    Export filtered audit logs to S3 and return a presigned download URL.

    The URL expires after EXPORT_URL_EXPIRY_SECONDS (default 1 hour).
    Hard ceiling of 10 000 records per export to prevent runaway queries.
    """
    if not settings.AUDIT_EXPORT_BUCKET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail     ="Export storage is not configured",
        )

    rows, total = repo.query_logs(
        user_id    = user_id,
        outcome    = outcome,
        role       = role,
        start_time = start_time,
        end_time   = end_time,
        limit      = 10_000,
        offset     = 0,
    )

    export_id = str(uuid_module.uuid4())
    logger.info(
        "audit_export_initiated",
        extra={"requested_by": auth.user_id, "export_id": export_id, "record_count": total, "format": fmt},
    )

    try:
        key = _write_export_to_s3(rows, fmt, export_id)
        url = _generate_presigned_url(key)
    except ClientError as e:
        logger.error("export_s3_failure", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail     ="Export generation failed",
        )

    return ExportResponse(
        export_id         = export_id,
        download_url      = url,
        expires_in_seconds= settings.EXPORT_URL_EXPIRY_SECONDS,
        record_count      = len(rows),
        format            = fmt,
    )


#  Backend service: time-scoped export 

async def _verify_backend_api_key(
    x_api_key: Optional[str] = Header(default=None, alias="x-api-key"),
) -> None:
    """
    FastAPI dependency — validates the X-Api-Key header for service-to-service calls.
    The backend team uses this instead of a user JWT since they call as a service,
    not as an individual user.
    """
    if not settings.AUDIT_BACKEND_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail     ="Backend access is not configured",
        )
    if not x_api_key or x_api_key != settings.AUDIT_BACKEND_API_KEY:
        logger.warning("invalid_backend_api_key_attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail     ="Invalid or missing API key",
        )


@router.get(
    "/logs/backend-export",
    response_model=ExportResponse,
    dependencies  =[Depends(_verify_backend_api_key)],
)
async def backend_export_audit_logs(
    repo      : AuditRepository    = Depends(_get_audit_repo),
    start_time: Optional[datetime] = Query(default=None),
    end_time  : Optional[datetime] = Query(default=None),
    fmt       : str                = Query(default="json", pattern="^(json|csv)$"),
):
    """
    Dedicated export endpoint for backend team service-to-service pulls.

    - Authenticated via X-Api-Key header, not a user JWT
    - start_time and end_time are required — unbounded pulls are not allowed
    - Date range is capped at 31 days per request
    - Returns a presigned S3 URL identical to the super admin export
    """
    if not start_time or not end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail     ="start_time and end_time are required for backend export",
        )

    if (end_time - start_time).days > 31:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail     ="Date range cannot exceed 31 days per request",
        )

    if not settings.AUDIT_EXPORT_BUCKET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail     ="Export storage is not configured",
        )

    rows, total = repo.query_logs(
        start_time = start_time,
        end_time   = end_time,
        limit      = 10_000,
        offset     = 0,
    )

    export_id = str(uuid_module.uuid4())
    logger.info(
        "backend_export_initiated",
        extra={"export_id": export_id, "record_count": total, "start_time": str(start_time), "end_time": str(end_time)},
    )

    try:
        key = _write_export_to_s3(rows, fmt, export_id)
        url = _generate_presigned_url(key)
    except ClientError as e:
        logger.error("backend_export_s3_failure", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail     ="Export generation failed",
        )

    return ExportResponse(
        export_id         = export_id,
        download_url      = url,
        expires_in_seconds= settings.EXPORT_URL_EXPIRY_SECONDS,
        record_count      = len(rows),
        format            = fmt,
    )
