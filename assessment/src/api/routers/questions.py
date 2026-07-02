from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database.connection import get_db
from services.question_service import QuestionService
from api.schemas.questions import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionWithOptions
)
from utils.exceptions import NotFoundException, ValidationException

router = APIRouter(tags=["questions"])

def get_question_service(db: Session = Depends(get_db)) -> QuestionService:
    """Dependency to get question service"""
    return QuestionService(db)

@router.get("/questions", response_model=List[QuestionWithOptions])
def get_questions(
    type: Optional[str] = Query(None, description="Filter by question type"),
    situation: Optional[str] = Query(None, description="Filter by situation (typical/stressful)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    service: QuestionService = Depends(get_question_service)
):
    """
    Get all questions with optional filtering. Each question includes its four options
    (red, green, blue, grey), ordered by `display_order`, same shape as `GET .../with-options`.
    
    - **type**: Filter by question type
    - **situation**: Filter by situation (typical/stressful)
    - **is_active**: Filter by active status (true/false)
    - **skip**: Pagination offset
    - **limit**: Maximum results (max 500); use at least 60 to fetch all seeded questions in one page
    """
    try:
        return service.get_questions(type, situation, is_active, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/questions/stats/count", response_model=dict)
def get_question_count(
    type: Optional[str] = Query(None, description="Filter by type"),
    service: QuestionService = Depends(get_question_service)
):
    """Get total count of questions"""
    try:
        count = service.get_count(type)
        return {"count": count, "type": type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/questions/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: UUID = Path(..., description="Question UUID", example="89624ce6-6e26-499a-9632-ef6331c1f1da"),
    service: QuestionService = Depends(get_question_service)
):
    """Get a specific question by ID"""
    try:
        return service.get_question_by_id(str(question_id))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/questions/{question_id}/with-options", response_model=QuestionWithOptions)
def get_question_with_options(
    question_id: UUID = Path(..., description="Question UUID", example="89624ce6-6e26-499a-9632-ef6331c1f1da"),
    service: QuestionService = Depends(get_question_service)
):
    """Get a question with all its options"""
    try:
        return service.get_question_with_options(str(question_id))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/questions", response_model=QuestionWithOptions, status_code=status.HTTP_201_CREATED)
def create_question(
    question: QuestionCreate,
    service: QuestionService = Depends(get_question_service)
):
    """Create a question with exactly four options (red, green, blue, grey) in one request"""
    try:
        return service.create_question(question)
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/questions/{question_id}", response_model=QuestionWithOptions)
def update_question(
    question: QuestionUpdate,
    question_id: UUID = Path(..., description="Question UUID", example="89624ce6-6e26-499a-9632-ef6331c1f1da"),
    service: QuestionService = Depends(get_question_service),
):
    """Update question fields and/or replace all four options (must send exactly four when updating options)"""
    try:
        return service.update_question(str(question_id), question)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: UUID = Path(..., description="Question UUID", example="89624ce6-6e26-499a-9632-ef6331c1f1da"),
    service: QuestionService = Depends(get_question_service)
):
    """Delete a question"""
    try:
        service.delete_question(str(question_id))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))