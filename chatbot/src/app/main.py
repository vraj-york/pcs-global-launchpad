"""
FastAPI Application Entry Point

Main application setup with middleware, routes, and Lambda handler.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.config import settings
from app.observability.logging_setup import configure_app_logging
from app.api.routes import health, chat, admin
from app.api.routes.admin import public_router as admin_public_router
from app.api.routes import audit
from app.api.routes import threads
from app.api.routes import proactive
from app.api.routes import memories
from app.api.routes import sessions
from app.api.routes import growth_spark

configure_app_logging()

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Intelligent chatbot API with RAG capabilities",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Amz-Date",
        "X-Api-Key",
        "X-Amz-Security-Token",
    ],
    # Let the browser/Axiosread the PDF filename from the export endpoint response headers
    expose_headers=["Content-Disposition"],
)

# Include routers
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(admin_public_router)
app.include_router(audit.router)
app.include_router(threads.router)
app.include_router(proactive.router)
app.include_router(memories.router)
app.include_router(sessions.router)
app.include_router(growth_spark.router)


# Root endpoint
@app.get("/")
def root():
    """Root endpoint with API information"""
    return {
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "endpoints": {
            "health"              : "/health (GET)",
            "chat_unified"        : "/chat-unified (POST) — primary buffered chat",
            "chat_stream"         : "/chat-stream (POST) — SSE streaming",
            "chat"                : "/chat (POST) — alias of unified pipeline",
            "chat_rag"            : "/chat-rag (POST) — alias; RAG via agentic tools",
            "chat_modes"          : "/chat-modes (GET)",
            "user_types"          : "/user-types (GET)",
            "admin_refresh_prompt": "/admin/refresh-prompt (POST)",
            "admin_rag_stats"     : "/admin/rag-stats (GET)",
            "audit_logs"          : "/audit/logs (GET)",
            "audit_export"        : "/audit/logs/export (GET)",
            "threads_list"        : "/threads (GET)",
            "threads_create"      : "/threads (POST)",
            "threads_get"         : "/threads/{id} (GET)",
            "threads_update"      : "/threads/{id} (PATCH)",
            "threads_delete"      : "/threads/{id} (DELETE)",
            "threads_messages"    : "/threads/{id}/messages (GET)",
            "threads_generate_title": "/threads/{id}/generate-title (POST)",
            "threads_export"      : "/threads/{id}/export (GET)",
            "proactive_employee"   : "/proactive/employee (GET)",
            "sessions_assessment_trigger": "/sessions/assessment-trigger (POST)",
            "growth_spark_generate"      : "/growth-spark/generate (POST)",
            "memories_list"        : "/memories (GET, POST)",
            "memories_consent"     : "/memories/consent (GET, POST)",
            "memories_item"        : "/memories/{id} (PATCH, DELETE)",
            "memories_confirm"     : "/memories/{id}/confirm (POST)",
            "memories_reject"      : "/memories/{id}/reject (POST)",
        },
        "docs": "/docs",
        "openapi": "/openapi.json",
        "rag_enabled": settings.ENABLE_RAG,
        "prompt_source": (
            "Bedrock Prompt Management" if settings.BEDROCK_PROMPT_ID else "Fallback"
        ),
    }


# AWS Lambda handler
def handler(event, context):
    """
    AWS Lambda handler function

    Wraps FastAPI app with Mangum for Lambda compatibility.
    """
    asgi_handler = Mangum(app, lifespan="off")
    return asgi_handler(event, context)
