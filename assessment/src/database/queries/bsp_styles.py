"""
Database queries for BSP Styles
Updated: 2026-03-27 - Added unique validation for title and display_order
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database.models import BspStyle
from utils.logger import logger


class BspStyleQueries:
    """Database queries for BSP Styles"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_all(
        self,
        style_number: Optional[int] = None,
        has_video: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[BspStyle]:
        """
        Get all BSP styles with optional filtering
        
        Args:
            style_number: Filter by style number
            has_video: Filter by video availability
            skip: Number of records to skip
            limit: Maximum number of records to return
        """
        logger.debug(f"Querying BSP styles: style_number={style_number}, has_video={has_video}, skip={skip}, limit={limit}")
        query = self.db.query(BspStyle)
        
        if style_number is not None:
            query = query.filter(BspStyle.style_number == style_number)
        
        if has_video is not None:
            query = query.filter(BspStyle.has_video == has_video)
        
        results = query.order_by(BspStyle.display_order).offset(skip).limit(limit).all()
        logger.debug(f"Query returned {len(results)} BSP styles")
        return results
    
    def get_by_id(self, style_id: str) -> Optional[BspStyle]:
        """Get a BSP style by ID (UUID stored as string)"""
        logger.debug(f"Querying BSP style by ID: {style_id}")
        result = self.db.query(BspStyle).filter(BspStyle.id == style_id).first()
        if result:
            logger.debug(f"Found BSP style: {result.title} (#{result.style_number})")
        else:
            logger.debug(f"No BSP style found with ID: {style_id}")
        return result
    
    def get_by_style_number(self, style_number: int) -> Optional[BspStyle]:
        """Get a BSP style by style number"""
        logger.debug(f"Querying BSP style by style_number: {style_number}")
        result = self.db.query(BspStyle).filter(BspStyle.style_number == style_number).first()
        if result:
            logger.debug(f"Found BSP style: {result.title} (#{result.style_number})")
        else:
            logger.debug(f"No BSP style found with style_number: {style_number}")
        return result
    
    def get_by_title(self, title: str) -> Optional[BspStyle]:
        """Get a BSP style by title"""
        logger.debug(f"Querying BSP style by title: {title}")
        result = self.db.query(BspStyle).filter(BspStyle.title == title).first()
        if result:
            logger.debug(f"Found BSP style with title: {title}")
        else:
            logger.debug(f"No BSP style found with title: {title}")
        return result
    
    def get_by_display_order(self, display_order: int) -> Optional[BspStyle]:
        """Get a BSP style by display order"""
        logger.debug(f"Querying BSP style by display_order: {display_order}")
        result = self.db.query(BspStyle).filter(BspStyle.display_order == display_order).first()
        if result:
            logger.debug(f"Found BSP style with display_order: {display_order}")
        else:
            logger.debug(f"No BSP style found with display_order: {display_order}")
        return result
    
    def create(self, style_data: dict) -> BspStyle:
        """Create a new BSP style"""
        logger.debug(f"Creating BSP style: {style_data.get('title')} (#{style_data.get('style_number')})")
        style = BspStyle(**style_data)
        self.db.add(style)
        self.db.commit()
        self.db.refresh(style)
        logger.debug(f"BSP style created successfully with ID: {style.id}")
        return style
    
    def update(self, style_id: str, style_data: dict) -> Optional[BspStyle]:
        """Update an existing BSP style"""
        logger.debug(f"Updating BSP style: {style_id} with fields: {list(style_data.keys())}")
        style = self.get_by_id(style_id)
        if not style:
            logger.debug(f"Cannot update: BSP style not found with ID: {style_id}")
            return None
        
        for key, value in style_data.items():
            if value is not None:
                setattr(style, key, value)
        
        self.db.commit()
        self.db.refresh(style)
        logger.debug(f"BSP style updated successfully: {style.title} (#{style.style_number})")
        return style
    
    def delete(self, style_id: str) -> bool:
        """Delete a BSP style"""
        logger.debug(f"Deleting BSP style: {style_id}")
        style = self.get_by_id(style_id)
        if not style:
            logger.debug(f"Cannot delete: BSP style not found with ID: {style_id}")
            return False
        
        self.db.delete(style)
        self.db.commit()
        logger.debug(f"BSP style deleted successfully: {style_id}")
        return True
    
    def get_count(self, has_video: Optional[bool] = None) -> int:
        """Get total count of BSP styles"""
        logger.debug(f"Counting BSP styles: has_video={has_video}")
        query = self.db.query(func.count(BspStyle.id))
        
        if has_video is not None:
            query = query.filter(BspStyle.has_video == has_video)
        
        count = query.scalar()
        logger.debug(f"BSP styles count: {count}")
        return count
