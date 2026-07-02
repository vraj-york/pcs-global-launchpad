from typing import Dict, List

from sqlalchemy.orm import Session

from database.models import QuestionResponse


class QuestionResponseQueries:
    @staticmethod
    def list_for_assessment(db: Session, assessment_id: str) -> List[QuestionResponse]:
        return (
            db.query(QuestionResponse)
            .filter(QuestionResponse.assessment_id == assessment_id)
            .order_by(QuestionResponse.created_at)
            .all()
        )

    @staticmethod
    def map_by_option_id(db: Session, assessment_id: str) -> Dict[str, QuestionResponse]:
        rows = QuestionResponseQueries.list_for_assessment(db, assessment_id)
        return {str(r.option_id): r for r in rows}

    @staticmethod
    def bulk_insert(db: Session, rows: List[QuestionResponse]) -> None:
        db.add_all(rows)
        db.commit()

    @staticmethod
    def flush_updates(db: Session) -> None:
        db.commit()
