import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Set

import boto3
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.schemas.assessments import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    AssessmentStatusEnum,
    EnqueueReportResponse,
    EnqueueScoringResponse,
    UploadPrintHtmlResponse,
)
from services.print_html_storage import (
    upload_print_html,
    validate_print_html_s3_key_for_assessment,
)
from database.models import AssessmentReport, AssessmentStatus as DbAssessmentStatus
from database.queries.assessments import AssessmentQueries
from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import AuthorizationException, ConflictException, NotFoundException, ValidationException


def _to_db_status(s: AssessmentStatusEnum) -> DbAssessmentStatus:
    return DbAssessmentStatus(s.value)


_ALLOWED_NEXT: Dict[DbAssessmentStatus, Set[DbAssessmentStatus]] = {
    DbAssessmentStatus.in_progress: {DbAssessmentStatus.completed},
    # Allow returning to in_progress so the user can review or change answers after completion.
    DbAssessmentStatus.completed: {DbAssessmentStatus.scored, DbAssessmentStatus.in_progress},
    DbAssessmentStatus.scored: {DbAssessmentStatus.report_generated},
    DbAssessmentStatus.report_generated: set(),
}


def _validate_transition(current: DbAssessmentStatus, new: DbAssessmentStatus) -> None:
    if current == new:
        return
    allowed = _ALLOWED_NEXT.get(current, set())
    if new not in allowed:
        raise ValidationException(
            f"Invalid status transition: {current.value} -> {new.value}. "
            "Allowed: in_progress <-> completed, completed -> scored, scored -> report_generated."
        )


class AssessmentService:
    def __init__(self, db: Session):
        self.db = db
        self.queries = AssessmentQueries()

    def list_assessments(
        self,
        ctx: AssessmentAccessContext,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AssessmentResponse]:
        st: Optional[DbAssessmentStatus] = None
        if status is not None:
            try:
                st = DbAssessmentStatus(status)
            except ValueError as e:
                raise ValidationException(f"Invalid status filter: {status}") from e
        rows = self.queries.list_for_visible_users(
            self.db,
            ctx.visible_user_ids,
            st,
            skip,
            limit,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        return [AssessmentResponse.model_validate(r) for r in rows]

    def get_assessment(self, assessment_id: str, ctx: AssessmentAccessContext) -> AssessmentResponse:
        row = self.queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        base = AssessmentResponse.model_validate(row)
        rep = (
            self.db.query(AssessmentReport)
            .filter(AssessmentReport.assessment_id == row.id)
            .first()
        )
        rk = str(rep.report_key) if rep and rep.report_key else None
        return base.model_copy(update={"report_key": rk})

    def create_assessment(self, ctx: AssessmentAccessContext, _body: AssessmentCreate) -> AssessmentResponse:
        user_id = ctx.cognito_sub
        existing = self.queries.get_in_progress_for_user(self.db, user_id)
        if existing:
            raise ConflictException(
                "You already have an assessment in progress; complete or abandon it before starting another."
            )
        try:
            row = self.queries.create(self.db, user_id, DbAssessmentStatus.in_progress)
            return AssessmentResponse.model_validate(row)
        except IntegrityError as e:
            self.db.rollback()
            raise ValidationException(
                "Could not create assessment. Ensure your user is provisioned in the application."
            ) from e

    def update_assessment(
        self, assessment_id: str, ctx: AssessmentAccessContext, data: AssessmentUpdate
    ) -> AssessmentResponse:
        row = self.queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        if not ctx.is_owner(row.user_id):
            raise AuthorizationException("Only the assessment owner may update this assessment.")

        patch = data.model_dump(exclude_unset=True)
        if not patch:
            return AssessmentResponse.model_validate(row)

        if data.status is None:
            raise ValidationException("status is required to update an assessment.")

        previous = row.status
        new_status = _to_db_status(data.status)
        if new_status != previous:
            _validate_transition(previous, new_status)

        row.status = new_status

        if previous == DbAssessmentStatus.in_progress and new_status == DbAssessmentStatus.completed:
            row.completed_at = datetime.utcnow()

        if previous == DbAssessmentStatus.completed and new_status == DbAssessmentStatus.in_progress:
            row.completed_at = None

        self.queries.update(self.db, row)
        return AssessmentResponse.model_validate(row)

    def upload_report_print_html(
        self, assessment_id: str, ctx: AssessmentAccessContext, html: str
    ) -> UploadPrintHtmlResponse:
        """
        Store gzipped print HTML from the authenticated browser (report worker reads it).
        """
        row = self.queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        if not ctx.is_owner(row.user_id):
            raise AuthorizationException(
                "Only the assessment owner may upload print HTML for this assessment."
            )
        if row.status == DbAssessmentStatus.in_progress:
            raise ValidationException(
                "Finish the assessment before uploading print HTML.",
            )
        if row.status not in (
            DbAssessmentStatus.completed,
            DbAssessmentStatus.scored,
            DbAssessmentStatus.report_generated,
        ):
            raise ValidationException(
                f"Cannot upload print HTML from status {row.status.value}.",
            )

        try:
            key = upload_print_html(assessment_id, html)
        except ValueError as e:
            raise ValidationException(str(e)) from e

        return UploadPrintHtmlResponse(print_html_s3_key=key)

    def enqueue_scoring(
        self,
        assessment_id: str,
        ctx: AssessmentAccessContext,
        *,
        print_html_s3_key: str | None = None,
    ) -> EnqueueScoringResponse:
        """
        Send assessment_id (and optional print_html_s3_key) to the scoring SQS queue.
        """
        row = self.queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        if not ctx.is_owner(row.user_id):
            raise AuthorizationException("Only the assessment owner may generate a report for this assessment.")

        if row.status == DbAssessmentStatus.report_generated:
            return EnqueueScoringResponse(
                enqueued=False,
                message="Report is already available.",
            )
        if row.status == DbAssessmentStatus.in_progress:
            raise ValidationException(
                "Finish the assessment before generating a report.",
            )
        if row.status not in (DbAssessmentStatus.completed, DbAssessmentStatus.scored):
            raise ValidationException(
                f"Cannot enqueue scoring from status {row.status.value}.",
            )

        queue_url = os.environ.get("SCORING_QUEUE_URL", "").strip()
        if not queue_url:
            raise ValidationException(
                "Report generation is not available (scoring queue is not configured).",
            )

        body: dict[str, str] = {"assessment_id": assessment_id}
        if print_html_s3_key and print_html_s3_key.strip():
            try:
                validate_print_html_s3_key_for_assessment(
                    print_html_s3_key.strip(), assessment_id
                )
            except ValueError as e:
                raise ValidationException(str(e)) from e
            body["print_html_s3_key"] = print_html_s3_key.strip()

        _sqs = boto3.client("sqs")
        _sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(body),
        )
        return EnqueueScoringResponse(enqueued=True, message=None)

    def enqueue_report(
        self,
        assessment_id: str,
        ctx: AssessmentAccessContext,
        *,
        print_html_s3_key: str,
    ) -> EnqueueReportResponse:
        """
        Send assessment_id + print_html_s3_key to the report SQS queue (after scoring).
        """
        row = self.queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        if not ctx.is_owner(row.user_id):
            raise AuthorizationException(
                "Only the assessment owner may enqueue report generation."
            )

        if row.status == DbAssessmentStatus.report_generated:
            return EnqueueReportResponse(
                enqueued=False,
                message="Report is already available.",
            )
        if row.status != DbAssessmentStatus.scored:
            raise ValidationException(
                "Assessment must be scored before generating a report. "
                f"Current status: {row.status.value}.",
            )

        key = (print_html_s3_key or "").strip()
        if not key:
            raise ValidationException("print_html_s3_key is required.")
        try:
            validate_print_html_s3_key_for_assessment(key, assessment_id)
        except ValueError as e:
            raise ValidationException(str(e)) from e

        queue_url = os.environ.get("REPORT_QUEUE_URL", "").strip()
        if not queue_url:
            raise ValidationException(
                "Report generation is not available (report queue is not configured).",
            )

        _sqs = boto3.client("sqs")
        _sqs.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(
                {
                    "assessment_id": assessment_id,
                    "print_html_s3_key": key,
                }
            ),
        )
        return EnqueueReportResponse(enqueued=True, message=None)

    def delete_assessment(self, assessment_id: str, ctx: AssessmentAccessContext) -> None:
        row = self.queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        if not ctx.is_owner(row.user_id):
            raise AuthorizationException("Only the assessment owner may delete this assessment.")
        self.queries.delete(self.db, row)
