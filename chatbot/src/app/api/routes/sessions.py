"""
Session Routes — /sessions

Assessment-triggered coaching session bootstrap.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import get_assessment_trigger_service
from app.models.schema import AssessmentTriggerRequest, AssessmentTriggerResponse
from app.services.assessment_trigger_service import AssessmentTriggerService
from app.utils.auth_context import extract_auth_context
from app.utils.subscription_access import require_chatbot_subscription

router = APIRouter(prefix="/sessions", tags=["Sessions"])
logger = logging.getLogger(__name__)


def _extract_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None


def _require_user(request: Request) -> str:
    access_token = _extract_token(request)
    require_chatbot_subscription(access_token)
    auth = extract_auth_context(access_token=access_token, fallback_role="employee")
    if auth.user_id == "unknown":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return auth.user_id


@router.post(
    "/assessment-trigger",
    response_model=AssessmentTriggerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_assessment_trigger_session(
    body: AssessmentTriggerRequest,
    fastapi_request: Request,
    service: AssessmentTriggerService = Depends(get_assessment_trigger_service),
):
    """
    Start a coaching thread after assessment completion.

    Creates a new employee thread, generates a personalized assistant opening
    message (LLM with template fallback), and optional follow-up chips.
    """
    user_id_hash = _require_user(fastapi_request)

    try:
        result = service.create_session(
            user_id_hash=user_id_hash,
            assessment_id=str(body.assessment_id),
            display_name=body.display_name,
            category=body.category,
            score=body.score,
            persona=body.persona,
            chat_mode=body.chat_mode,
        )
    except Exception as exc:
        logger.error(
            "assessment_trigger_session_failed",
            extra={"error": str(exc)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start assessment coaching session.",
        ) from exc

    return result
