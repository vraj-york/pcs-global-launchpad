"""
FastAPI routes for BSP Styles
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database.connection import get_db
from services.bsp_style_service import BspStyleService
from api.schemas.bsp_styles import BspStyleCreate, BspStyleUpdate, BspStyleResponse
from utils.exceptions import NotFoundException, ValidationException
from utils.logger import logger, log_error

router = APIRouter(tags=["bsp_styles"])

def get_bsp_style_service(db: Session = Depends(get_db)) -> BspStyleService:
    """Dependency to get BSP style service"""
    return BspStyleService(db)

@router.get("/bsp-styles", response_model=List[BspStyleResponse])
def get_bsp_styles(
    style_number: Optional[int] = Query(None, ge=1, le=13, description="Filter by style number (1-13)", example=1),
    has_video: Optional[bool] = Query(None, description="Filter by video availability", example=True),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    service: BspStyleService = Depends(get_bsp_style_service)
):
    """
    Get all BSP styles with optional filtering
    
    - **style_number**: Filter by style number (1-13)
    - **has_video**: Filter by video availability
    - **skip**: Pagination offset
    - **limit**: Maximum results (max 500)
    """
    try:
        logger.info(f"GET /bsp-styles - Filters: style_number={style_number}, has_video={has_video}, skip={skip}, limit={limit}")
        return service.get_styles(style_number, has_video, skip, limit)
    except Exception as e:
        log_error(e, "GET /bsp-styles")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bsp-styles/{style_id}", response_model=BspStyleResponse)
def get_bsp_style(
    style_id: str = Path(..., description="BSP Style ID (UUID string)", example="e387c99a-805a-4987-a594-d9183ab7fc2a"),
    service: BspStyleService = Depends(get_bsp_style_service)
):
    """Get a specific BSP style by ID"""
    try:
        logger.info(f"GET /bsp-styles/{style_id}")
        return service.get_style_by_id(style_id)
    except NotFoundException as e:
        logger.warning(f"GET /bsp-styles/{style_id} - Not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        log_error(e, f"GET /bsp-styles/{style_id}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bsp-styles/by-number/{style_number}", response_model=BspStyleResponse)
def get_bsp_style_by_number(
    style_number: int = Path(..., ge=1, le=16, description="Style number (1-16)", example=1),
    service: BspStyleService = Depends(get_bsp_style_service)
):
    """Get a specific BSP style by style number"""
    try:
        logger.info(f"GET /bsp-styles/by-number/{style_number}")
        return service.get_style_by_number(style_number)
    except NotFoundException as e:
        logger.warning(f"GET /bsp-styles/by-number/{style_number} - Not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        log_error(e, f"GET /bsp-styles/by-number/{style_number}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bsp-styles", response_model=BspStyleResponse, status_code=status.HTTP_201_CREATED)
def create_bsp_style(
    style: BspStyleCreate,
    service: BspStyleService = Depends(get_bsp_style_service)
):
    """Create a new BSP style"""
    try:
        logger.info(f"POST /bsp-styles - Creating: {style.title} (#{style.style_number})")
        result = service.create_style(style)
        logger.info(f"POST /bsp-styles - Created successfully: ID={result.id}")
        return result
    except ValidationException as e:
        logger.warning(f"POST /bsp-styles - Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_error(e, "POST /bsp-styles")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/bsp-styles/{style_id}", response_model=BspStyleResponse)
def update_bsp_style(
    style_id: str = Path(..., description="BSP Style ID (UUID string)", example="e387c99a-805a-4987-a594-d9183ab7fc2a"),
    style: BspStyleUpdate = None,
    service: BspStyleService = Depends(get_bsp_style_service)
):
    """Update an existing BSP style"""
    try:
        logger.info(f"PUT /bsp-styles/{style_id}")
        result = service.update_style(style_id, style)
        logger.info(f"PUT /bsp-styles/{style_id} - Updated successfully")
        return result
    except NotFoundException as e:
        logger.warning(f"PUT /bsp-styles/{style_id} - Not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationException as e:
        logger.warning(f"PUT /bsp-styles/{style_id} - Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log_error(e, f"PUT /bsp-styles/{style_id}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/bsp-styles/{style_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bsp_style(
    style_id: str = Path(..., description="BSP Style ID (UUID string)", example="e387c99a-805a-4987-a594-d9183ab7fc2a"),
    service: BspStyleService = Depends(get_bsp_style_service)
):
    """Delete a BSP style"""
    try:
        logger.info(f"DELETE /bsp-styles/{style_id}")
        service.delete_style(style_id)
        logger.info(f"DELETE /bsp-styles/{style_id} - Deleted successfully")
    except NotFoundException as e:
        logger.warning(f"DELETE /bsp-styles/{style_id} - Not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        log_error(e, f"DELETE /bsp-styles/{style_id}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bsp-styles/stats/count", response_model=dict)
def get_bsp_style_count(
    has_video: Optional[bool] = Query(None, description="Filter by video availability"),
    service: BspStyleService = Depends(get_bsp_style_service)
):
    """Get total count of BSP styles"""
    try:
        logger.info(f"GET /bsp-styles/stats/count - Filter: has_video={has_video}")
        count = service.get_count(has_video)
        logger.info(f"GET /bsp-styles/stats/count - Count: {count}")
        return {"count": count, "has_video": has_video}
    except Exception as e:
        log_error(e, "GET /bsp-styles/stats/count")
        raise HTTPException(status_code=500, detail=str(e))
