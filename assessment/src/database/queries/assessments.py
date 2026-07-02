from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Collection, List, Optional

from database.models import Assessment, AssessmentStatus


class AssessmentQueries:
    """Database operations for user assessments"""

    @staticmethod
    def get_in_progress_for_user(db: Session, user_id: str) -> Optional[Assessment]:
        return (
            db.query(Assessment)
            .filter(
                and_(
                    Assessment.user_id == user_id,
                    Assessment.status == AssessmentStatus.in_progress,
                )
            )
            .first()
        )

    @staticmethod
    def get_by_id(db: Session, assessment_id: str) -> Optional[Assessment]:
        return db.query(Assessment).filter(Assessment.id == assessment_id).first()

    @staticmethod
    def get_by_id_for_user(db: Session, assessment_id: str, user_id: str) -> Optional[Assessment]:
        return (
            db.query(Assessment)
            .filter(and_(Assessment.id == assessment_id, Assessment.user_id == user_id))
            .first()
        )

    @staticmethod
    def list_for_user(
        db: Session,
        user_id: str,
        status: Optional[AssessmentStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Assessment]:
        q = db.query(Assessment).filter(Assessment.user_id == user_id)
        if status is not None:
            q = q.filter(Assessment.status == status)
        return q.order_by(Assessment.started_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def list_for_visible_users(
        db: Session,
        visible_user_ids: Collection[str],
        status: Optional[AssessmentStatus] = None,
        skip: int = 0,
        limit: int = 100,
        *,
        unrestricted_read_scope: bool = False,
    ) -> List[Assessment]:
        q = db.query(Assessment)
        if not unrestricted_read_scope:
            ids = list(visible_user_ids)
            if not ids:
                return []
            q = q.filter(Assessment.user_id.in_(ids))
        if status is not None:
            q = q.filter(Assessment.status == status)
        return q.order_by(Assessment.started_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id_if_visible(
        db: Session,
        assessment_id: str,
        visible_user_ids: Collection[str],
        *,
        unrestricted_read_scope: bool = False,
    ) -> Optional[Assessment]:
        if unrestricted_read_scope:
            return AssessmentQueries.get_by_id(db, assessment_id)
        ids = list(visible_user_ids)
        if not ids:
            return None
        return (
            db.query(Assessment)
            .filter(
                and_(Assessment.id == assessment_id, Assessment.user_id.in_(ids)),
            )
            .first()
        )

    @staticmethod
    def create(
        db: Session,
        user_id: str,
        status: AssessmentStatus = AssessmentStatus.in_progress,
    ) -> Assessment:
        row = Assessment(user_id=user_id, status=status)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def update(db: Session, row: Assessment) -> Assessment:
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def delete(db: Session, row: Assessment) -> None:
        db.delete(row)
        db.commit()
