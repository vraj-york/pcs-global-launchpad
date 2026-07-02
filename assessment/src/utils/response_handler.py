"""
Standardized API response handlers
"""
from typing import Any, Optional, List
from pydantic import BaseModel

class SuccessResponse(BaseModel):
    """Standard success response"""
    success: bool = True
    message: str
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    """Standard error response (includes `message` for frontend parity with Node APIs)."""

    success: bool = False
    message: str
    error: str
    details: Optional[Any] = None

class PaginatedResponse(BaseModel):
    """Paginated response"""
    success: bool = True
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int

def success_response(message: str, data: Any = None) -> dict:
    """Create success response"""
    return {
        "success": True,
        "message": message,
        "data": data
    }

def error_response(error: str, details: Any = None) -> dict:
    """Create error response"""
    body: dict[str, Any] = {
        "success": False,
        "message": error,
        "error": error,
    }
    if details is not None:
        body["details"] = details
    return body

def paginated_response(
    data: List[Any],
    total: int,
    page: int,
    page_size: int
) -> dict:
    """Create paginated response"""
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "success": True,
        "data": data,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    }