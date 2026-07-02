"""
Shared dependencies for FastAPI
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from database.connection import get_db
from services.question_service import QuestionService
from services.option_service import OptionService

# Database dependency
def get_database() -> Session:
    """Get database session"""
    return Depends(get_db)

# Service dependencies
def get_question_service(db: Session = Depends(get_db)) -> QuestionService:
    """Get question service instance"""
    return QuestionService(db)

def get_option_service(db: Session = Depends(get_db)) -> OptionService:
    """Get option service instance"""
    return OptionService(db)


# Pagination dependency
def pagination_params(
    skip: int = 0,
    limit: int = 100
) -> dict:
    """
    Pagination parameters
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip must be non-negative"
        )
    
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 500"
        )
    
    return {"skip": skip, "limit": limit}