from typing import List, Optional

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Path,
    Query,
    Request,
    status,
)
from sqlalchemy.orm import Session
from uuid import UUID

from api.dependencies.auth import get_assessment_access_context
from api.schemas.assessments import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    EnqueueReportRequest,
    EnqueueReportResponse,
    EnqueueScoringRequest,
    EnqueueScoringResponse,
    UploadPrintHtmlRequest,
    UploadPrintHtmlResponse,
)
from database.connection import get_db
from services.assessment_audit import log_assessment_audit, metadata_after_payload
from services.assessment_service import AssessmentService
from utils.assessment_access_context import AssessmentAccessContext
from utils.exceptions import (
    AuthorizationException,
    ConflictException,
    NotFoundException,
    ValidationException,
)
from utils.subscription_enforcement import (
    require_can_start_new_assessment,
    require_writable_subscription,
)

router = APIRouter(tags=["assessments"], prefix="/assessments")


def get_assessment_service(db: Session = Depends(get_db)) -> AssessmentService:
    return AssessmentService(db)


@router.get("", response_model=List[AssessmentResponse])
def list_assessments(
    request: Request,
    db: Session = Depends(get_db),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    status: Optional[str] = Query(None, description="Filter by assessment status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    List assessments visible to the caller.
    Accessible regardless of subscription status — users can always view past results.
    """
    try:
        items = service.list_assessments(ctx, status, skip, limit)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="VIEW",
            metadata={
                "target": "assessment",
                "action": "list",
                "filter_status": status,
                "skip": skip,
                "limit": limit,
                "returned_count": len(items),
            },
        )
        return items
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Get a single assessment.
    Accessible regardless of subscription status — users can always view past results.
    """
    try:
        result = service.get_assessment(str(assessment_id), ctx)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="VIEW",
            entity_id=str(assessment_id),
            metadata=metadata_after_payload(result),
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
def create_assessment(
    request: Request,
    db: Session = Depends(get_db),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: AssessmentService = Depends(get_assessment_service),
    body: AssessmentCreate = Body(default_factory=AssessmentCreate),
):
    """
    Start a new assessment.

    Subscription enforcement:
    - Blocked / inactive subscription → 403.
    - one_time company plan: shared assessment credit pool → 403 when credits exhausted.
    - assessment-only / individual B2C: one assessment per user.
    - employee_range_max cap: 403 if company is at limit.
    - Annual plan: allowed (assessments + results + readouts).
    - Monthly plan: allowed (full access).
    """
    require_can_start_new_assessment(ctx, db)

    try:
        result = service.create_assessment(ctx, body)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="ADD",
            entity_id=str(result.id),
            metadata=metadata_after_payload(result),
        )
        return result
    except ConflictException as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{assessment_id}/enqueue-scoring",
    response_model=EnqueueScoringResponse,
    status_code=status.HTTP_200_OK,
)
def enqueue_assessment_scoring(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: AssessmentService = Depends(get_assessment_service),
    body: EnqueueScoringRequest = Body(default_factory=EnqueueScoringRequest),
):
    """
    Enqueue scoring / report generation.
    Requires active subscription (blocked/inactive → 403).
    Past reports remain readable via GET even when subscription lapses.
    """
    require_writable_subscription(ctx, db)

    try:
        result = service.enqueue_scoring(
            str(assessment_id),
            ctx,
            print_html_s3_key=body.print_html_s3_key,
        )
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="EDIT",
            entity_id=str(assessment_id),
            metadata={
                "target": "assessment",
                "action": "enqueue_scoring",
                "enqueued": result.enqueued,
                "message": result.message,
            },
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AuthorizationException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{assessment_id}/report-print-html",
    response_model=UploadPrintHtmlResponse,
    status_code=status.HTTP_200_OK,
)
def upload_assessment_report_print_html(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: AssessmentService = Depends(get_assessment_service),
    body: UploadPrintHtmlRequest = Body(...),
):
    try:
        result = service.upload_report_print_html(str(assessment_id), ctx, body.html)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="EDIT",
            entity_id=str(assessment_id),
            metadata={
                "target": "assessment",
                "action": "upload_report_print_html",
                "print_html_s3_key": result.print_html_s3_key,
            },
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AuthorizationException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{assessment_id}/enqueue-report",
    response_model=EnqueueReportResponse,
    status_code=status.HTTP_200_OK,
)
def enqueue_assessment_report(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: AssessmentService = Depends(get_assessment_service),
    body: EnqueueReportRequest = Body(...),
):
    try:
        result = service.enqueue_report(
            str(assessment_id),
            ctx,
            print_html_s3_key=body.print_html_s3_key,
        )
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="EDIT",
            entity_id=str(assessment_id),
            metadata={
                "target": "assessment",
                "action": "enqueue_report",
                "enqueued": result.enqueued,
                "message": result.message,
            },
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AuthorizationException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: AssessmentService = Depends(get_assessment_service),
    body: AssessmentUpdate = Body(...),
):
    """
    Update assessment (e.g. submit answers, change status).
    Requires active subscription — blocked/inactive → 403.
    """
    require_writable_subscription(ctx, db)

    try:
        result = service.update_assessment(str(assessment_id), ctx, body)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="EDIT",
            entity_id=str(assessment_id),
            metadata=metadata_after_payload(result),
        )
        return result
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AuthorizationException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(
    request: Request,
    db: Session = Depends(get_db),
    assessment_id: UUID = Path(..., description="Assessment UUID"),
    ctx: AssessmentAccessContext = Depends(get_assessment_access_context),
    service: AssessmentService = Depends(get_assessment_service),
):
    """Delete an assessment. Requires active subscription."""
    require_writable_subscription(ctx, db)

    try:
        service.delete_assessment(str(assessment_id), ctx)
        log_assessment_audit(
            db,
            request,
            ctx,
            event_type="REMOVE",
            entity_id=str(assessment_id),
            metadata={"target": "assessment", "action": "delete"},
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AuthorizationException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
