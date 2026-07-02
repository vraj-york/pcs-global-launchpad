"""
Growth Spark Routes — POST /growth-spark/generate

Daily dashboard coaching snippet (LLM with cache + template fallback).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import get_growth_spark_service
from app.models.schema import GrowthSparkGenerateRequest, GrowthSparkGenerateResponse
from app.services.growth_spark_service import GrowthSparkService
from app.utils.auth_context import extract_auth_context
from app.utils.subscription_access import require_chatbot_subscription

router = APIRouter(prefix="/growth-spark", tags=["Growth Spark"])
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
    "/generate",
    response_model=GrowthSparkGenerateResponse,
    status_code=status.HTTP_200_OK,
)
def generate_growth_spark(
    body: GrowthSparkGenerateRequest,
    fastapi_request: Request,
    service: GrowthSparkService = Depends(get_growth_spark_service),
):
    """
    Generate (or return cached) daily Growth Spark content for the dashboard.

    One LLM call per user per calendar day; subsequent calls return cache.
    """
    user_id_hash = _require_user(fastapi_request)

    try:
        return service.generate(
            user_id_hash=user_id_hash,
            display_name=body.display_name,
            style_title=body.style_title,
            style_summary=body.style_summary,
            dominant_mind_state=body.dominant_mind_state,
            spark_date=body.spark_date,
            timezone=body.timezone,
            team_context=body.team_context,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error(
            "growth_spark_generate_failed",
            extra={"error": str(exc)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Growth Spark content.",
        ) from exc
