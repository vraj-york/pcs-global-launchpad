from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional
from database.models import Option, Question, OptionColor as DbOptionColor
from api.schemas.options import OptionCreate, OptionUpdate
from utils.option_key import make_option_key


def _enum_attr_to_str(v) -> str:
    return v.value if hasattr(v, "value") else str(v)

class OptionQueries:
    """Database operations for options"""
    
    @staticmethod
    def get_all(
        db: Session,
        question_id: Optional[str] = None,
        color: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Option]:
        """Get all options with optional filtering"""
        query = db.query(Option).options(joinedload(Option.question))
        
        filters = []
        if question_id:
            filters.append(Option.question_id == question_id)
        if color:
            filters.append(Option.color == color)
        
        if filters:
            query = query.filter(and_(*filters))
        
        return query.order_by(Option.display_order, Option.id).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_by_id(db: Session, option_id: str) -> Optional[Option]:
        """Get an option by ID"""
        return db.query(Option).options(joinedload(Option.question)).filter(Option.id == option_id).first()
    
    @staticmethod
    def create(db: Session, data: OptionCreate) -> Option:
        """Create a new option (option_key derived from parent question)."""
        q = db.query(Question).filter(Question.id == str(data.question_id)).first()
        if not q:
            raise ValueError("Question not found")
        color_s = _enum_attr_to_str(data.color)
        key = make_option_key(
            _enum_attr_to_str(q.situation),
            _enum_attr_to_str(q.life_context),
            q.question_order,
            color_s,
        )
        option = Option(
            question_id=str(data.question_id),
            option_key=key,
            color=DbOptionColor(color_s),
            option_text=data.option_text,
            display_order=data.display_order,
        )
        db.add(option)
        db.commit()
        db.refresh(option)
        return option
    
    @staticmethod
    def update(db: Session, option_id: str, data: OptionUpdate) -> Optional[Option]:
        """Update an existing option"""
        option = db.query(Option).filter(Option.id == option_id).first()
        if not option:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(option, key, value)

        parent = (
            db.query(Question).filter(Question.id == str(option.question_id)).first()
        )
        if parent:
            color_s = _enum_attr_to_str(option.color)
            option.option_key = make_option_key(
                _enum_attr_to_str(parent.situation),
                _enum_attr_to_str(parent.life_context),
                parent.question_order,
                color_s,
            )

        db.commit()
        db.refresh(option)
        return option
    
    @staticmethod
    def delete(db: Session, option_id: str) -> bool:
        """Delete an option"""
        option = db.query(Option).filter(Option.id == option_id).first()
        if not option:
            return False
        
        db.delete(option)
        db.commit()
        return True
    
    @staticmethod
    def get_by_question(db: Session, question_id: str) -> List[Option]:
        """Get all options for a specific question"""
        return db.query(Option).options(joinedload(Option.question))\
            .filter(Option.question_id == question_id)\
            .order_by(Option.display_order, Option.id).all()