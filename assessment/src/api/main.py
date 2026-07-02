"""
Main FastAPI application
"""
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import time

from api.config import settings
from api.routers import (
    bsp_styles,
    options,
    question_responses,
    questions,
    report_content,
    assessments,
    user_assessment_styles,
)
from utils.logger import logger, log_request, log_error

# Local + Vite defaults; should stay aligned with API Gateway CORS in api_gateway_stack.py
_DEV_FRONTEND_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)

# Only these environments skip localhost (strict CORS from CORS_ORIGINS / defaults only).
_CORS_STRICT_PRODUCTION_ENVS = frozenset({"prod", "production", "prd"})


def _api_error_json(message: str, details=None) -> dict:
    """Error JSON aligned with Node APIs: clients read `message`; `error` kept for compatibility."""
    body: dict = {"success": False, "message": message, "error": message}
    if details is not None:
        body["details"] = details
    return body


def _cors_allowed_origins() -> list:
    out = list(settings.CORS_ORIGINS)
    # Call deployed API (execute-api) from a local Vite app: ENV is usually "dev"/"staging",
    # not the string "development", so we must not gate localhost on that one value only.
    if (settings.ENVIRONMENT or "").lower() not in _CORS_STRICT_PRODUCTION_ENVS:
        for o in _DEV_FRONTEND_ORIGINS:
            if o not in out:
                out.append(o)
    return out


from utils.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
    AuthorizationException,
)

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allowed_origins(),
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests"""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration_ms = (time.time() - start_time) * 1000
    log_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms
    )
    
    return response

def _http_exception_message(exc: HTTPException) -> str:
    detail = exc.detail
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list):
        return "; ".join(str(item) for item in detail)
    return str(detail)


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Align FastAPI HTTP errors with Node APIs: clients read `message` (string)."""
    return JSONResponse(
        status_code=exc.status_code,
        content=_api_error_json(_http_exception_message(exc)),
        headers=exc.headers,
    )


@app.exception_handler(NotFoundException)
async def not_found_exception_handler(request: Request, exc: NotFoundException):
    """Handle not found exceptions"""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content=_api_error_json(str(exc)),
    )

@app.exception_handler(ValidationException)
async def validation_exception_handler(request: Request, exc: ValidationException):
    """Handle validation exceptions"""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=_api_error_json(str(exc)),
    )

@app.exception_handler(ConflictException)
async def conflict_exception_handler(request: Request, exc: ConflictException):
    """Handle conflict (e.g. duplicate in-progress assessment)"""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=_api_error_json(str(exc)),
    )

@app.exception_handler(AuthorizationException)
async def authorization_exception_handler(request: Request, exc: AuthorizationException):
    """Handle forbidden (e.g. admin attempting to mutate another user's assessment)"""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content=_api_error_json(str(exc)),
    )

@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_api_error_json(
            "Validation error",
            details=jsonable_encoder(exc.errors()),
        ),
    )

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    log_error(exc, "Database operation")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_api_error_json("Database error occurred"),
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    log_error(exc, "Unhandled exception")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_api_error_json("Internal server error"),
    )

# Register routers
app.include_router(questions.router)
app.include_router(options.router)
app.include_router(bsp_styles.router)
app.include_router(assessments.router)
app.include_router(question_responses.router)
app.include_router(report_content.router)
app.include_router(user_assessment_styles.router)

# Root endpoint
@app.get("/", tags=["root"])
def root():
    """API root endpoint"""
    return {
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "questions": "/questions",
            "options": "/options",
            "bsp_styles": "/bsp-styles",
            "assessments": "/assessments",
            "question_responses": "/assessments/{id}/question-responses",
            "question_responses_bulk": "/assessments/{id}/question-responses/bulk",
            "report_content": "/report-content/{section_key}",
            "user_assessment_styles": "/assessments/{assessment_id}/user-styles",
        }
    }

# Health endpoint
@app.get("/health", tags=["health"])
def health():
    """Health check endpoint - returns service status without database check"""
    return {
        "status": "healthy",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time()
    }

# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info(f"Starting {settings.API_TITLE} v{settings.API_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("Shutting down API")