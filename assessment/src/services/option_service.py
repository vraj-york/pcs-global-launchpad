from typing import List, Optional
from sqlalchemy.orm import Session
from database.queries.options import OptionQueries
from database.queries.questions import QuestionQueries
from api.schemas.options import OptionCreate, OptionUpdate, OptionResponse
from utils.exceptions import NotFoundException, ValidationException

class OptionService:
    """Business logic for options"""
    
    def __init__(self, db: Session):
        self.db = db
        self.queries = OptionQueries()
        self.question_queries = QuestionQueries()
    
    def get_options(
        self,
        question_id: Optional[str] = None,
        color: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[OptionResponse]:
        """Get all options with optional filtering"""
        options = self.queries.get_all(self.db, question_id, color, skip, limit)
        return [OptionResponse.model_validate(o) for o in options]
    
    def get_option_by_id(self, option_id: str) -> OptionResponse:
        """Get a single option"""
        option = self.queries.get_by_id(self.db, option_id)
        if not option:
            raise NotFoundException(f"Option with ID {option_id} not found")
        return OptionResponse.model_validate(option)
    
    def get_options_by_question(self, question_id: str) -> List[OptionResponse]:
        """Get all options for a specific question"""
        # Verify question exists
        question = self.question_queries.get_by_id(self.db, question_id)
        if not question:
            raise NotFoundException(f"Question with ID {question_id} not found")
        
        options = self.queries.get_by_question(self.db, question_id)
        return [OptionResponse.model_validate(o) for o in options]
    
    def create_option(self, data: OptionCreate) -> OptionResponse:
        """Create new option with validation"""
        # Verify question exists
        question = self.question_queries.get_by_id(self.db, str(data.question_id))
        if not question:
            raise ValidationException(f"Question with ID {data.question_id} does not exist")
        
        # Validate text length
        if len(data.option_text.strip()) < 1:
            raise ValidationException("Option text cannot be empty")
        
        option = self.queries.create(self.db, data)
        return OptionResponse.model_validate(option)
    
    def update_option(self, option_id: str, data: OptionUpdate) -> OptionResponse:
        """Update existing option"""
        # Check if option exists
        existing = self.queries.get_by_id(self.db, option_id)
        if not existing:
            raise NotFoundException(f"Option with ID {option_id} not found")
        
        # Validate question_id if provided
        if data.question_id:
            question = self.question_queries.get_by_id(self.db, str(data.question_id))
            if not question:
                raise ValidationException(f"Question with ID {data.question_id} does not exist")
        
        option = self.queries.update(self.db, option_id, data)
        return OptionResponse.model_validate(option)
    
    def delete_option(self, option_id: str) -> None:
        """Delete an option"""
        success = self.queries.delete(self.db, option_id)
        if not success:
            raise NotFoundException(f"Option with ID {option_id} not found")