from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database.connection import get_db
from services.option_service import OptionService
from api.schemas.options import OptionCreate, OptionUpdate, OptionResponse
from utils.exceptions import NotFoundException, ValidationException

router = APIRouter(tags=["options"])

def get_option_service(db: Session = Depends(get_db)) -> OptionService:
    """Dependency to get option service"""
    return OptionService(db)

@router.get("/options", response_model=List[OptionResponse])
def get_options(
    question_id: Optional[UUID] = Query(None, description="Filter by question ID", example="89624ce6-6e26-499a-9632-ef6331c1f1da"),
    color: Optional[str] = Query(None, description="Filter by color (red/green/blue/grey)", example="red"),
    skip: int = Query(0, ge=0),
    limit: int = Query(240, ge=1, le=500),
    service: OptionService = Depends(get_option_service)
):
    """Get all options with optional filtering"""
    try:
        return service.get_options(str(question_id) if question_id else None, color, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/options/{option_id}", response_model=OptionResponse)
def get_option(
    option_id: UUID = Path(..., description="Option UUID", example="c1aef71b-aa3a-4656-9372-43a3fa926dfb"),
    service: OptionService = Depends(get_option_service)
):
    """Get a specific option by ID"""
    try:
        return service.get_option_by_id(str(option_id))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/options/by-question/{question_id}", response_model=List[OptionResponse])
def get_options_by_question(
    question_id: UUID = Path(..., description="Question UUID", example="89624ce6-6e26-499a-9632-ef6331c1f1da"),
    service: OptionService = Depends(get_option_service)
):
    """Get all options for a specific question"""
    try:
        return service.get_options_by_question(str(question_id))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/options", response_model=OptionResponse, status_code=status.HTTP_201_CREATED)
def create_option(
    option: OptionCreate,
    service: OptionService = Depends(get_option_service)
):
    """Create a new option"""
    try:
        return service.create_option(option)
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/options/{option_id}", response_model=OptionResponse)
def update_option(
    option_id: UUID = Path(..., description="Option UUID", example="c1aef71b-aa3a-4656-9372-43a3fa926dfb"),
    option: OptionUpdate = None,
    service: OptionService = Depends(get_option_service)
):
    """Update an existing option"""
    try:
        return service.update_option(str(option_id), option)
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option(
    option_id: UUID = Path(..., description="Option UUID", example="c1aef71b-aa3a-4656-9372-43a3fa926dfb"),
    service: OptionService = Depends(get_option_service)
):
    """Delete an option"""
    try:
        service.delete_option(str(option_id))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))