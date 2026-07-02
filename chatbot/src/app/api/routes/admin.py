"""
Admin Routes

Administrative endpoints for system management.
"""

import time
from fastapi import APIRouter, Depends, HTTPException
from app.infrastructure import BedrockClient
from app.repositories import VectorRepository
from app.api.dependencies import get_bedrock_client, get_vector_repository
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/refresh-prompt")
def refresh_system_prompt(bedrock_client: BedrockClient = Depends(get_bedrock_client)):
    """
    Force refresh of cached system prompt from Bedrock Prompt Management

    Call this endpoint after updating the prompt in Bedrock to immediately
    load the new version without waiting for cache expiration.
    """
    try:
        new_prompt = bedrock_client.refresh_prompt_cache()
        return {
            "status": "refreshed",
            "source": "Bedrock Prompt Management",
            "prompt_id": settings.BEDROCK_PROMPT_ID,
            "prompt_version": settings.BEDROCK_PROMPT_VERSION,
            "prompt_preview": (new_prompt[:100] + "..." if len(new_prompt) > 100 else new_prompt),
            "timestamp": time.time(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh prompt: {str(e)}")


@router.post("/refresh-coach-prompt")
def refresh_coach_prompt(bedrock_client: BedrockClient = Depends(get_bedrock_client)):
    """Force refresh of cached coach persona prompt from Bedrock Prompt Management."""
    if not settings.BEDROCK_COACH_PROMPT_ID:
        raise HTTPException(
            status_code=404,
            detail="BEDROCK_COACH_PROMPT_ID is not configured",
        )
    try:
        new_prompt = bedrock_client.refresh_coach_prompt_cache()
        preview = new_prompt or ""
        return {
            "status": "refreshed",
            "source": "Bedrock Prompt Management",
            "prompt_id": settings.BEDROCK_COACH_PROMPT_ID,
            "prompt_version": settings.BEDROCK_COACH_PROMPT_VERSION,
            "prompt_preview": preview[:100] + "..." if len(preview) > 100 else preview,
            "timestamp": time.time(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh coach prompt: {str(e)}",
        )


def _fetch_rag_stats(vector_repo: VectorRepository) -> dict:
    if not settings.ENABLE_RAG:
        raise HTTPException(status_code=503, detail="RAG feature is not enabled")

    try:
        return vector_repo.get_database_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.get("/rag-stats")
def get_rag_stats(vector_repo: VectorRepository = Depends(get_vector_repository)):
    """
    Get RAG database statistics (Public endpoint)

    Returns information about indexed documents and chunks.
    """
    return _fetch_rag_stats(vector_repo)


# API Gateway exposes GET /v1/rag-stats (no /admin prefix).
public_router = APIRouter(tags=["Admin"])


@public_router.get("/rag-stats")
def get_rag_stats_public(vector_repo: VectorRepository = Depends(get_vector_repository)):
    """Alias for API Gateway /rag-stats route."""
    return _fetch_rag_stats(vector_repo)

