"""
Chat Routes

All chat endpoints delegate to UnifiedChatService — single context-plane pipeline
(prepare → assemble → agentic Bedrock loop with optional RAG via tools).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_unified_chat_service
from app.api.routes.chat_helpers import require_chatbot_access
from app.config import settings
from app.models.schema import ChatRequest, ChatResponse
from app.services import UnifiedChatService

router = APIRouter(tags=["Chat"])
logger = logging.getLogger(__name__)


async def _handle_chat_request(
    request: ChatRequest,
    fastapi_request: Request,
    unified_service: UnifiedChatService,
    *,
    log_prefix: str = "",
) -> ChatResponse:
    access_token = require_chatbot_access(fastapi_request)
    logger.info("%sAuthenticated chatbot access", log_prefix)

    user_role = request.user_type or "default"
    logger.info("%sUsing user role from payload: %s", log_prefix, user_role)

    try:
        response = await unified_service.handle_unified_chat(
            request,
            access_token=access_token,
        )
        logger.info(
            "%sProcessed query with model: %s",
            log_prefix,
            response.model,
        )
        return response
    except ValueError as e:
        logger.error("%sValidation error: %s", log_prefix, e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("%sUnexpected error: %s", log_prefix, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}") from e


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    fastapi_request: Request,
    unified_service: UnifiedChatService = Depends(get_unified_chat_service),
):
    """Standard chat — same context-plane pipeline as /chat-unified."""
    return await _handle_chat_request(
        request,
        fastapi_request,
        unified_service,
        log_prefix="[Chat] ",
    )


@router.post("/chat-rag", response_model=ChatResponse)
async def chat_rag(
    request: ChatRequest,
    fastapi_request: Request,
    unified_service: UnifiedChatService = Depends(get_unified_chat_service),
):
    """
    RAG-capable chat — uses agentic search_knowledge_base tool (not static pre-fetch).

    Kept for API compatibility; behaviour matches /chat-unified.
    """
    if not settings.ENABLE_RAG:
        raise HTTPException(status_code=503, detail="RAG feature is not enabled")

    if not settings.has_database_config:
        raise HTTPException(status_code=503, detail="RAG database not configured")

    return await _handle_chat_request(
        request,
        fastapi_request,
        unified_service,
        log_prefix="[RAG] ",
    )


@router.post("/chat-unified", response_model=ChatResponse)
async def chat_unified(
    request: ChatRequest,
    fastapi_request: Request,
    unified_service: UnifiedChatService = Depends(get_unified_chat_service),
):
    """Unified chat — tool calling + RAG via agentic loop."""
    return await _handle_chat_request(
        request,
        fastapi_request,
        unified_service,
        log_prefix="[Unified] ",
    )


@router.post("/chat-stream")
async def chat_stream(
    request: ChatRequest,
    fastapi_request: Request,
    unified_service: UnifiedChatService = Depends(get_unified_chat_service),
):
    """Streaming SSE chat — same pipeline as /chat-unified."""
    access_token = require_chatbot_access(fastapi_request)
    logger.info("[Stream] Authenticated chatbot access")

    user_role = request.user_type or "default"
    logger.info("[Stream] Using user role from payload: %s", user_role)

    return StreamingResponse(
        content=unified_service.handle_unified_chat_stream(
            request,
            access_token=access_token,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat")
def chat_info():
    """GET endpoint - returns API usage information"""
    return {
        "message": "This is a POST endpoint. Send a JSON body with required fields.",
        "example": {
            "message": "Hello, how are you?",
            "chat_mode": "quick",
            "user_type": "employee",
            "max_tokens": 1000,
            "temperature": 0.7,
        },
        "model": settings.BEDROCK_CHAT_MODEL,
        "available_modes": ["quick", "deep_dive"],
        "available_user_types": [
            "employee", "coach", "company_admin", "corporation_admin", "superadmin",
        ],
        "note": "All POST chat routes use the unified context-plane pipeline.",
    }


@router.get("/chat-modes")
def get_chat_modes():
    from app.domain.prompts import get_available_chat_modes

    return {"chat_modes": get_available_chat_modes(), "default": "quick"}


@router.get("/user-types")
def get_user_types():
    from app.domain.prompts import get_available_personas

    return {"user_types": get_available_personas(), "default": "employee"}


@router.get("/tools")
def get_available_tools():
    from app.domain.tools import TOOLS

    return {"tools": TOOLS, "count": len(TOOLS), "tool_names": [tool["name"] for tool in TOOLS]}
