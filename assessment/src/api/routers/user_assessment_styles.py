from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Request, status
from sqlalchemy.orm import Session

from api.dependencies.auth import get_assessment_access_context
from api.schemas.user_assessment_styles import UserAssessmentStylesResponse
from database.connection import get_db
from services.assessment_audit import log_assessment_audit
from services.user_assessment_style_service import UserAssessmentStyleService
from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import NotFoundException, ValidationException

router = APIRouter(tags=["user_assessment_styles"])


def get_user_assessment_style_service(
    db: Session = Depends(get_db),
) -> UserAssessmentStyleService:
    return UserAssessmentStyleService(db)


@router.get(
    "/assessments/{assessment_id}/user-styles",
    response_model=UserAssessmentStylesResponse,
)
def get_user_assessment_styles(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: UserAssessmentStyleService = Depends(get_user_assessment_style_service),
):
    try:
        result = service.get_user_styles(str(assessment_id), ctx)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="VIEW",
            entity_id=str(assessment_id),
            metadata={
                "target": "user_assessment_styles",
                "action": "get",
                "assessment_score_id": str(result.assessment_score_id),
            },
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
