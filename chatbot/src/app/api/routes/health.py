"""
Health Check Routes
"""

from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "model": settings.BEDROCK_CHAT_MODEL,
        "rag_enabled": settings.ENABLE_RAG,
    }
