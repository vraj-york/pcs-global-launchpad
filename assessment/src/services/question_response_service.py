from typing import List, Set

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.schemas.question_responses import BulkQuestionResponseWrite, QuestionResponseOut
from database.models import AssessmentStatus, Option, QuestionResponse
from database.queries.assessments import AssessmentQueries
from database.queries.question_responses import QuestionResponseQueries
from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import AuthorizationException, ConflictException, NotFoundException, ValidationException


class QuestionResponseService:
    def __init__(self, db: Session):
        self.db = db
        self.assessment_queries = AssessmentQueries()
        self.response_queries = QuestionResponseQueries()

    def list_question_responses(
        self, assessment_id: str, ctx: AssessmentAccessContext
    ) -> List[QuestionResponseOut]:
        """List responses for an assessment the caller may read (same visibility as GET assessment)."""
        row = self.assessment_queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        rows = self.response_queries.list_for_assessment(self.db, assessment_id)
        return [QuestionResponseOut.model_validate(r) for r in rows]

    def _load_writable_assessment(self, assessment_id: str, ctx: AssessmentAccessContext):
        row = self.assessment_queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not row:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")
        if not ctx.is_owner(row.user_id):
            raise AuthorizationException(
                "Only the assessment owner may add or update question responses."
            )
        if row.status != AssessmentStatus.in_progress:
            raise ValidationException(
                "Question responses can only be created or updated while the assessment is in progress."
            )
        return row

    def _validate_option_ids_exist(self, option_ids: Set[str]) -> None:
        if not option_ids:
            return
        q = self.db.query(Option).filter(Option.id.in_(list(option_ids)))
        found = {str(r.id) for r in q.all()}
        missing = option_ids - found
        if missing:
            raise ValidationException("One or more option_id values are invalid.")

    @staticmethod
    def _dedupe_option_ids(items) -> None:
        raw = [str(i.option_id) for i in items]
        if len(raw) != len(set(raw)):
            raise ValidationException("Duplicate option_id in request.")

    def bulk_create(
        self, assessment_id: str, ctx: AssessmentAccessContext, data: BulkQuestionResponseWrite
    ) -> List[QuestionResponseOut]:
        self._load_writable_assessment(assessment_id, ctx)
        self._dedupe_option_ids(data.items)

        option_ids = {str(i.option_id) for i in data.items}
        self._validate_option_ids_exist(option_ids)

        existing = self.response_queries.map_by_option_id(self.db, assessment_id)
        overlap = option_ids & set(existing.keys())
        if overlap:
            sample = sorted(overlap)[:5]
            extra = f" (+{len(overlap) - 5} more)" if len(overlap) > 5 else ""
            raise ConflictException(
                f"Response(s) already exist for option_id(s): {sample}{extra}"
            )

        rows = [
            QuestionResponse(
                assessment_id=assessment_id,
                option_id=str(item.option_id),
                value=item.value,
            )
            for item in data.items
        ]
        try:
            self.response_queries.bulk_insert(self.db, rows)
        except IntegrityError as e:
            self.db.rollback()
            raise ConflictException(
                "Could not create question responses (duplicate or invalid reference)."
            ) from e

        return [QuestionResponseOut.model_validate(r) for r in rows]

    def bulk_update(
        self, assessment_id: str, ctx: AssessmentAccessContext, data: BulkQuestionResponseWrite
    ) -> List[QuestionResponseOut]:
        self._load_writable_assessment(assessment_id, ctx)
        self._dedupe_option_ids(data.items)

        option_ids = {str(i.option_id) for i in data.items}
        self._validate_option_ids_exist(option_ids)

        by_option = self.response_queries.map_by_option_id(self.db, assessment_id)
        missing = sorted(option_ids - set(by_option.keys()))
        if missing:
            raise ValidationException(
                f"No existing response for option_id(s): {missing[:10]}"
                + ("..." if len(missing) > 10 else "")
            )

        out: List[QuestionResponse] = []
        for item in data.items:
            oid = str(item.option_id)
            row = by_option[oid]
            row.value = item.value
            out.append(row)

        try:
            self.response_queries.flush_updates(self.db)
        except IntegrityError as e:
            self.db.rollback()
            raise ValidationException("Could not update question responses.") from e

        for r in out:
            self.db.refresh(r)
        return [QuestionResponseOut.model_validate(r) for r in out]
