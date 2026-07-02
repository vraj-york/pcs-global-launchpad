"""
Business logic for BSP Styles
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4

from database.queries.bsp_styles import BspStyleQueries
from api.schemas.bsp_styles import BspStyleCreate, BspStyleUpdate
from database.models import BspStyle
from utils.exceptions import NotFoundException, ValidationException
from utils.logger import logger


class BspStyleService:
    """Service layer for BSP Style operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.queries = BspStyleQueries(db)
    
    def get_styles(
        self,
        style_number: Optional[int] = None,
        has_video: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[BspStyle]:
        """Get all BSP styles with optional filtering"""
        logger.debug(f"Fetching BSP styles: style_number={style_number}, has_video={has_video}, skip={skip}, limit={limit}")
        styles = self.queries.get_all(
            style_number=style_number,
            has_video=has_video,
            skip=skip,
            limit=limit
        )
        logger.info(f"Retrieved {len(styles)} BSP styles")
        return styles
    
    def get_style_by_id(self, style_id: str) -> BspStyle:
        """Get a specific BSP style by ID"""
        logger.debug(f"Fetching BSP style by ID: {style_id}")
        style = self.queries.get_by_id(style_id)
        if not style:
            logger.warning(f"BSP Style not found: {style_id}")
            raise NotFoundException(f"BSP Style with ID {style_id} not found")
        logger.info(f"Retrieved BSP style: {style.title} (#{style.style_number})")
        return style
    
    def get_style_by_number(self, style_number: int) -> BspStyle:
        """Get a specific BSP style by style number"""
        logger.debug(f"Fetching BSP style by number: {style_number}")
        style = self.queries.get_by_style_number(style_number)
        if not style:
            logger.warning(f"BSP Style not found by number: {style_number}")
            raise NotFoundException(f"BSP Style with number {style_number} not found")
        logger.info(f"Retrieved BSP style: {style.title} (#{style.style_number})")
        return style
    
    def create_style(self, data: BspStyleCreate) -> BspStyle:
        """Create a new BSP style"""
        logger.info(f"Creating BSP style: {data.title} (#{data.style_number})")
        
        # Check if style number already exists
        existing = self.queries.get_by_style_number(data.style_number)
        if existing:
            logger.warning(f"BSP Style with number {data.style_number} already exists")
            raise ValidationException(
                f"BSP Style with number {data.style_number} already exists"
            )
        
        # Check if title already exists
        existing_title = self.queries.get_by_title(data.title)
        if existing_title:
            logger.warning(f"BSP Style with title '{data.title}' already exists")
            raise ValidationException(
                f"BSP Style with title '{data.title}' already exists"
            )
        
        # Check if display_order already exists
        existing_order = self.queries.get_by_display_order(data.display_order)
        if existing_order:
            logger.warning(f"BSP Style with display_order {data.display_order} already exists")
            raise ValidationException(
                f"BSP Style with display_order {data.display_order} already exists"
            )
        
        # Validate youtube_video_id
        if data.has_video and not data.youtube_video_id:
            logger.warning(f"youtube_video_id required when has_video is True")
            raise ValidationException(
                "youtube_video_id is required when has_video is True"
            )
        
        style_dict = data.model_dump()
        # Generate UUID as string (matching Prisma's String @id @default(uuid()))
        style_id = str(uuid4())
        style_dict['id'] = style_id
        
        logger.debug(f"Creating BSP style with ID: {style_id}")
        style = self.queries.create(style_dict)
        logger.info(f"Successfully created BSP style: {style.title} (#{style.style_number}, ID: {style.id})")
        
        return style
    
    def update_style(self, style_id: str, data: BspStyleUpdate) -> BspStyle:
        """Update an existing BSP style"""
        logger.info(f"Updating BSP style: {style_id}")
        
        # Check if style exists
        existing = self.queries.get_by_id(style_id)
        if not existing:
            logger.warning(f"BSP Style not found for update: {style_id}")
            raise NotFoundException(f"BSP Style with ID {style_id} not found")
        
        # If updating style_number, check for duplicates
        if data.style_number is not None and data.style_number != existing.style_number:
            duplicate = self.queries.get_by_style_number(data.style_number)
            if duplicate:
                logger.warning(f"Cannot update: BSP Style with number {data.style_number} already exists")
                raise ValidationException(
                    f"BSP Style with number {data.style_number} already exists"
                )
        
        # If updating title, check for duplicates
        if data.title is not None and data.title != existing.title:
            duplicate_title = self.queries.get_by_title(data.title)
            if duplicate_title:
                logger.warning(f"Cannot update: BSP Style with title '{data.title}' already exists")
                raise ValidationException(
                    f"BSP Style with title '{data.title}' already exists"
                )
        
        # If updating display_order, check for duplicates
        if data.display_order is not None and data.display_order != existing.display_order:
            duplicate_order = self.queries.get_by_display_order(data.display_order)
            if duplicate_order:
                logger.warning(f"Cannot update: BSP Style with display_order {data.display_order} already exists")
                raise ValidationException(
                    f"BSP Style with display_order {data.display_order} already exists"
                )
        
        # Validate youtube_video_id
        has_video = data.has_video if data.has_video is not None else existing.has_video
        youtube_video_id = data.youtube_video_id if data.youtube_video_id is not None else existing.youtube_video_id
        
        if has_video and not youtube_video_id:
            logger.warning(f"youtube_video_id required when has_video is True")
            raise ValidationException(
                "youtube_video_id is required when has_video is True"
            )
        
        style_dict = data.model_dump(exclude_unset=True)
        logger.debug(f"Updating fields: {list(style_dict.keys())}")
        updated = self.queries.update(style_id, style_dict)
        
        if not updated:
            logger.warning(f"BSP Style not found during update: {style_id}")
            raise NotFoundException(f"BSP Style with ID {style_id} not found")
        
        logger.info(f"Successfully updated BSP style: {updated.title} (#{updated.style_number})")
        return updated
    
    def delete_style(self, style_id: str) -> None:
        """Delete a BSP style"""
        logger.info(f"Deleting BSP style: {style_id}")
        
        # Check if style exists before deleting
        existing = self.queries.get_by_id(style_id)
        if existing:
            logger.debug(f"Found BSP style to delete: {existing.title} (#{existing.style_number})")
        
        if not self.queries.delete(style_id):
            logger.warning(f"BSP Style not found for deletion: {style_id}")
            raise NotFoundException(f"BSP Style with ID {style_id} not found")
        
        logger.info(f"Successfully deleted BSP style: {style_id}")
    
    def get_count(self, has_video: Optional[bool] = None) -> int:
        """Get total count of BSP styles"""
        logger.debug(f"Counting BSP styles: has_video={has_video}")
        count = self.queries.get_count(has_video=has_video)
        logger.info(f"BSP styles count: {count}")
        return count
