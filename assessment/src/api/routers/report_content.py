import re

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from api.dependencies.auth import get_assessment_access_context
from api.schemas.report_content import ReportContentResponse
from database.connection import get_db
from database.models import ReportContent
from utils.assessment_access_context import AssessmentAccessContext

router = APIRouter(tags=["report_content"], prefix="/report-content")

_SECTION_KEY_PATTERN = re.compile(r"^[a-z0-9_]{1,100}$")


@router.get("/{section_key}", response_model=ReportContentResponse)
def get_report_content(
    _ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    db: Session = Depends(get_db),
    section_key: str = Path(..., description="Unique section key, e.g. welcome_and_overall"),
):
    if not _SECTION_KEY_PATTERN.fullmatch(section_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid section_key",
        )
    row = (
        db.query(ReportContent)
        .filter(ReportContent.section_key == section_key)
        .filter(ReportContent.is_active.is_(True))
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report content not found for section_key={section_key}",
        )
    return ReportContentResponse(section_key=row.section_key, content=dict(row.content or {}))
