"""
Database queries for assessment score style breakdowns.
"""
from dataclasses import dataclass
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from database.models import (
    AssessmentScore,
    AssessmentScoreStyle,
    AssessmentScoreStyleContext,
    BspStyle,
)


@dataclass(frozen=True)
class AssessmentScoreStyleWithBspStyle:
    score_style: AssessmentScoreStyle
    bsp_style: BspStyle


class AssessmentScoreStyleQueries:
    """Load assessment_score_styles joined with bsp_styles for one assessment."""

    @staticmethod
    def get_score_for_assessment(
        db: Session, assessment_id: str | UUID
    ) -> Optional[AssessmentScore]:
        aid = str(assessment_id)
        return (
            db.query(AssessmentScore)
            .filter(AssessmentScore.assessment_id == aid)
            .first()
        )

    @staticmethod
    def list_styles_with_bsp_for_score(
        db: Session, assessment_score_id: str | UUID
    ) -> List[AssessmentScoreStyleWithBspStyle]:
        sid = str(assessment_score_id)
        rows = (
            db.query(AssessmentScoreStyle, BspStyle)
            .join(BspStyle, BspStyle.id == AssessmentScoreStyle.bsp_style_id)
            .filter(AssessmentScoreStyle.assessment_score_id == sid)
            .all()
        )
        return [
            AssessmentScoreStyleWithBspStyle(score_style=score_style, bsp_style=bsp_style)
            for score_style, bsp_style in rows
        ]

    @staticmethod
    def map_by_context(
        rows: List[AssessmentScoreStyleWithBspStyle],
    ) -> Dict[AssessmentScoreStyleContext, AssessmentScoreStyleWithBspStyle]:
        out: Dict[AssessmentScoreStyleContext, AssessmentScoreStyleWithBspStyle] = {}
        for row in rows:
            out[row.score_style.context] = row
        return out
