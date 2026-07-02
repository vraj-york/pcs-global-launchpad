import json
import os
import re
import tempfile
import time
import uuid
from typing import Any

import boto3
from aws_lambda_powertools import Logger  # type: ignore[import-not-found]
from sqlalchemy.orm import Session

from monitoring.sentry_init import init_sentry, set_worker_context
from bsp_score_engine.report_filename import default_report_filename
from bsp_score_engine.snapshot_html_pdf import generate_snapshot_html_pdf
from database.connection import get_db_context
from database.models import (
    AppUser,
    Assessment,
    AssessmentReport,
    AssessmentScore,
    AssessmentStatus,
)
from services.print_html_storage import download_print_html

init_sentry(
    "report_worker",
    function_name=os.environ.get("AWS_LAMBDA_FUNCTION_NAME"),
)

_s3 = boto3.client("s3")
logger = Logger(service="assessment-report-worker")


def _require_assessment_id(value: Any) -> uuid.UUID:
    if value is None or str(value).strip() == "":
        raise ValueError("assessment_id is required")
    try:
        return uuid.UUID(str(value).strip())
    except Exception as e:
        raise ValueError(f"assessment_id must be a valid UUID, got: {value!r}") from e


def _require_print_html_s3_key(value: Any) -> str:
    key = (value or "").strip() if value is not None else ""
    if not key:
        raise ValueError("print_html_s3_key is required for client HTML report pipeline")
    return key


def _reports_s3_user_folder(account: dict[str, str], assessment_id: str) -> str:
    """
    S3 path segment under reports_prefix: sanitized email (local_at_domain),
    or assessment_id if email is missing.
    """
    raw = (account.get("email") or "").strip().lower()
    if not raw:
        return assessment_id
    local, sep, domain = raw.partition("@")
    if not sep or not domain:
        seg = re.sub(r"[^a-zA-Z0-9._-]", "_", raw)
        return (seg[:200] if seg else assessment_id)
    safe_local = re.sub(r"[^a-zA-Z0-9._-]", "_", local)
    safe_domain = re.sub(r"[^a-zA-Z0-9._-]", "_", domain)
    folder = f"{safe_local}_at_{safe_domain}".strip("_")
    if not folder:
        return assessment_id
    return folder[:200]


def _require_account_for_assessment(
    db: Session, assessment_id: uuid.UUID
) -> dict[str, str]:
    """
    Report names come only from app_users (via assessment.user_id). No defaults.
    """
    row = (
        db.query(
            AppUser.first_name,
            AppUser.last_name,
            AppUser.email,
            AppUser.job_role,
        )
        .join(Assessment, Assessment.user_id == AppUser.cognito_sub)
        .filter(Assessment.id == assessment_id)
        .first()
    )
    if not row:
        raise ValueError(
            f"No app_users row linked to assessment_id={assessment_id} "
            "(assessment.user_id must match app_users.cognito_sub)."
        )
    first_name, last_name, email, job_role = row
    fn = (first_name or "").strip()
    ln = (last_name or "").strip()
    if not fn and not ln:
        raise ValueError(
            f"app_users.first_name and last_name are both empty for "
            f"assessment_id={assessment_id}"
        )
    return {
        "firstname": fn,
        "lastname": ln,
        "email": (email or "").strip(),
        "phone": "",
        "role": (job_role or "").strip(),
        "company": "",
        "active": "1",
        "archive": "0",
    }


def _persist_report_key(
    db: Session,
    assessment_id: uuid.UUID,
    report_s3_key: str,
) -> None:
    """
    Upsert assessment_reports.report (S3 key) and set assessment status.
    """
    score_row = (
        db.query(AssessmentScore)
        .filter(AssessmentScore.assessment_id == assessment_id)
        .first()
    )
    if not score_row:
        raise ValueError(
            f"No AssessmentScore for assessment_id={assessment_id}; "
            "run scoring before persisting report."
        )

    row = (
        db.query(AssessmentReport)
        .filter(AssessmentReport.assessment_id == assessment_id)
        .first()
    )
    if row:
        row.assessment_score_id = score_row.id
        row.report_key = report_s3_key
    else:
        db.add(
            AssessmentReport(
                id=uuid.uuid4(),
                assessment_id=assessment_id,
                assessment_score_id=score_row.id,
                report_key=report_s3_key,
            )
        )

    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise ValueError(f"Assessment not found: {assessment_id}")
    assessment.status = AssessmentStatus.report_generated
    db.add(assessment)


def _generate_pdf(
    assessment_id: str,
    output_path: str,
    *,
    print_html_s3_key: str | None,
) -> str:
    key = _require_print_html_s3_key(print_html_s3_key)
    html = download_print_html(key)
    logger.info(
        "report_pdf_generator",
        extra={
            "mode": "client_html_snapshot",
            "assessment_id": assessment_id,
            "print_html_s3_key": key,
        },
    )
    return generate_snapshot_html_pdf(
        html,
        output_path,
        assessment_id=assessment_id,
    )


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    """SQS worker: client HTML snapshot → Playwright PDF → S3."""
    start = time.perf_counter()
    bucket = os.environ.get("REPORTS_BUCKET", "").strip()
    reports_prefix = os.environ.get("REPORTS_PREFIX", "assessment-reports/").strip()
    if not bucket:
        raise ValueError("REPORTS_BUCKET env var is required")

    records = event.get("Records") or []
    logger.info(
        "sqs_batch_received",
        extra={"records": len(records), "bucket": bucket, "prefix": reports_prefix},
    )
    for record in records:
        msg_start = time.perf_counter()
        body = record.get("body") or "{}"
        try:
            msg = json.loads(body) if isinstance(body, str) else (body or {})
        except Exception:
            logger.exception("invalid_message_body_json")
            raise

        aid = _require_assessment_id(msg.get("assessment_id"))
        assessment_id = str(aid)
        print_html_s3_key = (msg.get("print_html_s3_key") or "").strip() or None

        set_worker_context(
            assessment_id=assessment_id,
            sqs_message_id=record.get("messageId"),
            print_html_s3_key=print_html_s3_key,
        )

        with get_db_context() as db:
            account = _require_account_for_assessment(db, aid)

        logger.info(
            "report_generation_started",
            extra={
                "assessment_id": assessment_id,
                "account_email": account.get("email"),
                "print_html_s3_key": print_html_s3_key,
            },
        )

        suggested_filename = default_report_filename(account)
        user_folder = _reports_s3_user_folder(account, assessment_id)
        s3_key = f"{reports_prefix}{user_folder}/{suggested_filename}"

        fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)
        try:
            _generate_pdf(
                assessment_id,
                pdf_path,
                print_html_s3_key=print_html_s3_key,
            )
            _s3.upload_file(
                Filename=pdf_path,
                Bucket=bucket,
                Key=s3_key,
                ExtraArgs={"ContentType": "application/pdf"},
            )
            logger.info(
                "report_uploaded",
                extra={
                    "assessment_id": assessment_id,
                    "s3_key": s3_key,
                    "duration_ms": int((time.perf_counter() - msg_start) * 1000),
                },
            )

            with get_db_context() as db:
                _persist_report_key(db, aid, s3_key)
            logger.info(
                "report_key_persisted",
                extra={"assessment_id": assessment_id, "report_key": s3_key},
            )
        finally:
            try:
                os.unlink(pdf_path)
            except OSError:
                pass

    logger.info(
        "sqs_batch_processed",
        extra={
            "processed": len(records),
            "duration_ms": int((time.perf_counter() - start) * 1000),
        },
    )
    return {"ok": True, "processed": len(records)}
