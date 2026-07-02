"""
Custom exceptions for the application
"""

class AssessmentException(Exception):
    """Base exception for assessment module"""
    pass

class NotFoundException(AssessmentException):
    """Raised when a resource is not found"""
    pass

class ValidationException(AssessmentException):
    """Raised when validation fails"""
    pass

class DatabaseException(AssessmentException):
    """Raised when database operation fails"""
    pass

class AuthenticationException(AssessmentException):
    """Raised when authentication fails"""
    pass

class AuthorizationException(AssessmentException):
    """Raised when authorization fails"""
    pass


class ConflictException(AssessmentException):
    """Raised when the request conflicts with current state (e.g. duplicate in-progress assessment)"""
    pass