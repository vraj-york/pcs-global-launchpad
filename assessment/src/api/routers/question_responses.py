from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Request, status
from sqlalchemy.orm import Session
from uuid import UUID

from api.dependencies.auth import get_assessment_access_context
from api.schemas.question_responses import (
    BulkQuestionResponseWrite,
    QuestionResponseOut,
)
from database.connection import get_db
from services.assessment_audit import log_assessment_audit
from services.question_response_service import QuestionResponseService
from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import (
    AuthorizationException,
    ConflictException,
    NotFoundException,
    ValidationException,
)
from utils.subscription_enforcement import require_writable_subscription

router = APIRouter(tags=["question-responses"])


def get_question_response_service(
    db: Session = Depends(get_db),
) -> QuestionResponseService:
    return QuestionResponseService(db)


@router.get(
    "/assessments/{assessment_id}/question-responses",
    response_model=List[QuestionResponseOut],
)
def list_question_responses(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: QuestionResponseService = Depends(get_question_response_service),
):
    try:
        result = service.list_question_responses(str(assessment_id), ctx)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="VIEW",
            entity_id=str(assessment_id),
            metadata={
                "target": "question_response",
                "action": "list",
                "returned_count": len(result),
            },
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/assessments/{assessment_id}/question-responses/bulk",
    response_model=List[QuestionResponseOut],
    status_code=status.HTTP_201_CREATED,
)
def bulk_create_question_responses(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: QuestionResponseService = Depends(get_question_response_service),
    body: BulkQuestionResponseWrite = Body(...),
):
    require_writable_subscription(ctx, db)
    try:
        result = service.bulk_create(str(assessment_id), ctx, body)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="ADD",
            entity_id=str(assessment_id),
            metadata={
                "target": "question_response",
                "action": "bulk_create",
                "count": len(result),
            },
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AuthorizationException:
        raise
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put(
    "/assessments/{assessment_id}/question-responses/bulk",
    response_model=List[QuestionResponseOut],
)
def bulk_update_question_responses(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: QuestionResponseService = Depends(get_question_response_service),
    body: BulkQuestionResponseWrite = Body(...),
):
    require_writable_subscription(ctx, db)
    try:
        result = service.bulk_update(str(assessment_id), ctx, body)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="EDIT",
            entity_id=str(assessment_id),
            metadata={
                "target": "question_response",
                "action": "bulk_update",
                "count": len(result),
            },
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AuthorizationException:
        raise
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
