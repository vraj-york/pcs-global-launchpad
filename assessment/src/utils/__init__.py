"""
Utility functions and helpers
"""

from utils.exceptions import (
    AssessmentException,
    NotFoundException,
    ValidationException,
    DatabaseException,
    AuthenticationException,
    AuthorizationException
)
from utils.validators import (
    validate_email,
    validate_hex_color,
    validate_positive_integer,
    validate_non_empty_string,
    sanitize_string
)
from utils.logger import logger, log_request, log_error, log_db_query
from utils.response_handler import (
    success_response,
    error_response,
    paginated_response
)

__all__ = [
    # Exceptions
    "AssessmentException",
    "NotFoundException",
    "ValidationException",
    "DatabaseException",
    "AuthenticationException",
    "AuthorizationException",
    
    # Validators
    "validate_email",
    "validate_hex_color",
    "validate_positive_integer",
    "validate_non_empty_string",
    "sanitize_string",
    
    # Logger
    "logger",
    "log_request",
    "log_error",
    "log_db_query",
    
    # Response handlers
    "success_response",
    "error_response",
    "paginated_response",
]