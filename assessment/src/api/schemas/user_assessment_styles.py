"""
Pydantic schemas for per-assessment user style breakdown (assessment_score_styles + bsp_styles).
"""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from api.schemas.bsp_styles import BspStyleResponse

AssessmentScoreStyleContextLiteral = Literal[
    "overall",
    "professional_typical",
    "professional_stressful",
    "personal_typical",
    "personal_stressful",
]

AssessmentScoreStyleTypeLiteral = Literal["basic", "plural", "split"]


class UserAssessmentContextStyle(BaseModel):
    """One scored context row with full BSP style details."""

    context: AssessmentScoreStyleContextLiteral
    type: AssessmentScoreStyleTypeLiteral
    style: BspStyleResponse


class ProfessionalTypicalScoreBreakdown(BaseModel):
    """PRT axes from ``assessment_score.score_breakdown`` (score_engine keys)."""

    prtred: float = Field(..., description="Control axis score")
    prtgreen: float = Field(..., description="Affiliate axis score")
    prtgrey: float = Field(..., description="Retreat axis score")
    prtblue: float = Field(..., description="Awareness (blue) score")


class ProfessionalStressfulScoreBreakdown(BaseModel):
    """PRS axes from ``assessment_score.score_breakdown``."""

    prsred: float = Field(..., description="Control axis score")
    prsgreen: float = Field(..., description="Affiliate axis score")
    prsgrey: float = Field(..., description="Retreat axis score")
    prsblue: float = Field(..., description="Awareness (blue) score")


class PersonalTypicalScoreBreakdown(BaseModel):
    """PET axes from ``assessment_score.score_breakdown``."""

    petred: float = Field(..., description="Control axis score")
    petgreen: float = Field(..., description="Affiliate axis score")
    petgrey: float = Field(..., description="Retreat axis score")
    petblue: float = Field(..., description="Awareness (blue) score")


class PersonalStressfulScoreBreakdown(BaseModel):
    """PES axes from ``assessment_score.score_breakdown``."""

    pesred: float = Field(..., description="Control axis score")
    pesgreen: float = Field(..., description="Affiliate axis score")
    pesgrey: float = Field(..., description="Retreat axis score")
    pesblue: float = Field(..., description="Awareness (blue) score")


class OverallStressfulScoreBreakdown(BaseModel):
    """Combined overall axes from ``assessment_score.score_breakdown`` (score_engine keys)."""

    cred: float = Field(..., description="Combined control axis score")
    cgreen: float = Field(..., description="Combined affiliate axis score")
    cgrey: float = Field(..., description="Combined retreat axis score")
    cblue: float = Field(..., description="Combined awareness (blue) score")


class DecreaseStressScoreMetrics(BaseModel):
    """Keys from ``score_breakdown`` used by ``compute_dsp`` (decrease_stress report copy)."""

    prblue: float = Field(..., description="Professional stressful blue (prblue / prsblue)")
    peblue: float = Field(..., description="Personal stressful blue (peblue / pesblue)")
    professional_typical_oct: int = Field(
        ..., description="PRT oct (1–13) for decrease-stress paragraph 2"
    )
    personal_typical_oct: int = Field(
        ..., description="PET oct (1–13) for decrease-stress paragraph 2"
    )
    stressful_combo_oct: int = Field(
        ..., description="Stressful combo oct for decrease-stress paragraph 2"
    )


class UserAssessmentStylesResponse(BaseModel):
    """User style breakdown for a scored assessment."""

    model_config = ConfigDict(from_attributes=True)

    assessment_id: UUID
    assessment_score_id: UUID
    overall_style: UserAssessmentContextStyle
    professional_typical: UserAssessmentContextStyle
    professional_stressful: UserAssessmentContextStyle
    personal_typical: UserAssessmentContextStyle
    personal_stressful: UserAssessmentContextStyle
    professional_typical_scores: ProfessionalTypicalScoreBreakdown
    professional_stressful_scores: ProfessionalStressfulScoreBreakdown
    personal_typical_scores: PersonalTypicalScoreBreakdown
    personal_stressful_scores: PersonalStressfulScoreBreakdown
    overall_stressful_scores: OverallStressfulScoreBreakdown
    decrease_stress_metrics: DecreaseStressScoreMetrics
    scored_at: datetime = Field(..., description="When the assessment score row was last updated")
