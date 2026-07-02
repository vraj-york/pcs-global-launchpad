from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.queries.questions import QuestionQueries
from api.schemas.questions import QuestionCreate, QuestionUpdate, QuestionResponse, QuestionWithOptions
from utils.exceptions import NotFoundException, ValidationException


class QuestionService:
    """Business logic for questions"""

    def __init__(self, db: Session):
        self.db = db
        self.queries = QuestionQueries()

    def get_questions(
        self,
        type: Optional[str] = None,
        situation: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[QuestionWithOptions]:
        """Get all questions with optional filtering; each question includes its four options."""
        questions = self.queries.get_all_with_options(
            self.db, type, situation, is_active, skip, limit
        )
        return [QuestionWithOptions.model_validate(q) for q in questions]

    def get_question_by_id(self, question_id: str) -> QuestionResponse:
        """Get a single question"""
        question = self.queries.get_by_id(self.db, question_id)
        if not question:
            raise NotFoundException(f"Question with ID {question_id} not found")
        return QuestionResponse.model_validate(question)

    def get_question_with_options(self, question_id: str) -> QuestionWithOptions:
        """Get a question with its options (ordered by display_order)"""
        question = self.queries.get_by_id_with_options(self.db, question_id)
        if not question:
            raise NotFoundException(f"Question with ID {question_id} not found")
        return QuestionWithOptions.model_validate(question)

    def create_question(self, data: QuestionCreate) -> QuestionWithOptions:
        """Create a question and exactly four options"""
        if len(data.question_text.strip()) < 10:
            raise ValidationException("Question text must be at least 10 characters long")

        try:
            question = self.queries.create_with_options(self.db, data)
            return QuestionWithOptions.model_validate(question)
        except IntegrityError as e:
            self.db.rollback()
            raise ValidationException(
                "Database constraint failed: question_order and option_key must be unique across the system."
            ) from e

    def update_question(self, question_id: str, data: QuestionUpdate) -> QuestionWithOptions:
        """Update question fields and/or all four options"""
        existing = self.queries.get_by_id(self.db, question_id)
        if not existing:
            raise NotFoundException(f"Question with ID {question_id} not found")

        if data.question_text is not None and len(data.question_text.strip()) < 10:
            raise ValidationException("Question text must be at least 10 characters long")

        update_dump = data.model_dump(exclude_unset=True)
        if not update_dump:
            q = self.queries.get_by_id_with_options(self.db, question_id)
            return QuestionWithOptions.model_validate(q)

        try:
            question = self.queries.update_with_options(self.db, question_id, data)
            if not question:
                raise NotFoundException(f"Question with ID {question_id} not found")
            return QuestionWithOptions.model_validate(question)
        except ValueError as e:
            self.db.rollback()
            raise ValidationException(str(e)) from e
        except IntegrityError as e:
            self.db.rollback()
            raise ValidationException(
                "Database constraint failed: question_order and option_key must be unique across the system."
            ) from e

    def delete_question(self, question_id: str) -> None:
        """Delete a question"""
        success = self.queries.delete(self.db, question_id)
        if not success:
            raise NotFoundException(f"Question with ID {question_id} not found")

    def get_count(self, type: Optional[str] = None) -> int:
        """Get total count of questions"""
        return self.queries.get_count(self.db, type)
