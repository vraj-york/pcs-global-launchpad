"""
Business logic for per-assessment user style breakdown.
"""
from uuid import UUID

from sqlalchemy.orm import Session

from api.schemas.bsp_styles import BspStyleResponse
from api.schemas.user_assessment_styles import (
    DecreaseStressScoreMetrics,
    OverallStressfulScoreBreakdown,
    PersonalStressfulScoreBreakdown,
    PersonalTypicalScoreBreakdown,
    ProfessionalStressfulScoreBreakdown,
    ProfessionalTypicalScoreBreakdown,
    UserAssessmentContextStyle,
    UserAssessmentStylesResponse,
)
from database.models import AssessmentScoreStyleContext
from database.queries.assessment_score_styles import AssessmentScoreStyleQueries
from database.queries.assessments import AssessmentQueries
from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import NotFoundException, ValidationException

_REQUIRED_CONTEXTS = (
    AssessmentScoreStyleContext.overall,
    AssessmentScoreStyleContext.professional_typical,
    AssessmentScoreStyleContext.professional_stressful,
    AssessmentScoreStyleContext.personal_typical,
    AssessmentScoreStyleContext.personal_stressful,
)


class UserAssessmentStyleService:
    def __init__(self, db: Session):
        self.db = db
        self.assessment_queries = AssessmentQueries()
        self.style_queries = AssessmentScoreStyleQueries()

    def get_user_styles(
        self, assessment_id: str, ctx: AssessmentAccessContext
    ) -> UserAssessmentStylesResponse:
        assessment = self.assessment_queries.get_by_id_if_visible(
            self.db,
            assessment_id,
            ctx.visible_user_ids,
            unrestricted_read_scope=ctx.unrestricted_read_scope,
        )
        if not assessment:
            raise NotFoundException(f"Assessment with ID {assessment_id} not found")

        score = self.style_queries.get_score_for_assessment(self.db, assessment_id)
        if not score:
            raise NotFoundException(
                f"No score found for assessment {assessment_id}; styles are available after scoring"
            )

        rows = self.style_queries.list_styles_with_bsp_for_score(self.db, score.id)
        by_context = self.style_queries.map_by_context(rows)

        missing = [c.value for c in _REQUIRED_CONTEXTS if c not in by_context]
        if missing:
            raise ValidationException(
                f"Incomplete style breakdown for assessment {assessment_id}; "
                f"missing contexts: {', '.join(missing)}"
            )

        def _to_context_style(
            context: AssessmentScoreStyleContext,
        ) -> UserAssessmentContextStyle:
            row = by_context[context]
            return UserAssessmentContextStyle(
                context=context.value,
                type=row.score_style.type.value,
                style=BspStyleResponse.model_validate(row.bsp_style),
            )

        breakdown = score.score_breakdown if isinstance(score.score_breakdown, dict) else {}

        def _float(key: str) -> float:
            raw = breakdown.get(key)
            if raw is None:
                return 0.0
            try:
                return float(raw)
            except (TypeError, ValueError):
                return 0.0

        def _int(key: str, fallback: int) -> int:
            raw = breakdown.get(key)
            if raw is None:
                return fallback
            try:
                return int(raw)
            except (TypeError, ValueError):
                return fallback

        prt_style = by_context[AssessmentScoreStyleContext.professional_typical].bsp_style
        pet_style = by_context[AssessmentScoreStyleContext.personal_typical].bsp_style
        prblue = _float("prblue")
        if prblue == 0.0:
            prblue = _float("prsblue")
        peblue = _float("peblue")
        if peblue == 0.0:
            peblue = _float("pesblue")

        return UserAssessmentStylesResponse(
            assessment_id=UUID(str(assessment.id)),
            assessment_score_id=UUID(str(score.id)),
            overall_style=_to_context_style(AssessmentScoreStyleContext.overall),
            professional_typical=_to_context_style(
                AssessmentScoreStyleContext.professional_typical
            ),
            professional_stressful=_to_context_style(
                AssessmentScoreStyleContext.professional_stressful
            ),
            personal_typical=_to_context_style(
                AssessmentScoreStyleContext.personal_typical
            ),
            personal_stressful=_to_context_style(
                AssessmentScoreStyleContext.personal_stressful
            ),
            professional_typical_scores=ProfessionalTypicalScoreBreakdown(
                prtred=_float("prtred"),
                prtgreen=_float("prtgreen"),
                prtgrey=_float("prtgrey"),
                prtblue=_float("prtblue"),
            ),
            professional_stressful_scores=ProfessionalStressfulScoreBreakdown(
                prsred=_float("prsred"),
                prsgreen=_float("prsgreen"),
                prsgrey=_float("prsgrey"),
                prsblue=_float("prsblue"),
            ),
            personal_typical_scores=PersonalTypicalScoreBreakdown(
                petred=_float("petred"),
                petgreen=_float("petgreen"),
                petgrey=_float("petgrey"),
                petblue=_float("petblue"),
            ),
            personal_stressful_scores=PersonalStressfulScoreBreakdown(
                pesred=_float("pesred"),
                pesgreen=_float("pesgreen"),
                pesgrey=_float("pesgrey"),
                pesblue=_float("pesblue"),
            ),
            overall_stressful_scores=OverallStressfulScoreBreakdown(
                cred=_float("cred"),
                cgreen=_float("cgreen"),
                cgrey=_float("cgrey"),
                cblue=_float("cblue"),
            ),
            decrease_stress_metrics=DecreaseStressScoreMetrics(
                prblue=prblue,
                peblue=peblue,
                professional_typical_oct=_int(
                    "professional_typical_oct", int(prt_style.style_number)
                ),
                personal_typical_oct=_int(
                    "personal_typical_oct", int(pet_style.style_number)
                ),
                stressful_combo_oct=_int("stressful_combo_oct", 0),
            ),
            scored_at=score.updated_at,
        )
