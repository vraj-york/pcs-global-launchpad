from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional

from database.models import Question, Option, OptionColor as DbOptionColor
from api.schemas.options import OptionColor as ApiOptionColor
from api.schemas.questions import QuestionCreate, QuestionUpdate
from utils.option_key import make_option_key


def _enum_attr_to_str(v) -> str:
    return v.value if hasattr(v, "value") else str(v)


def _to_db_option_color(api_color) -> DbOptionColor:
    if isinstance(api_color, ApiOptionColor):
        v = api_color.value
    elif isinstance(api_color, str):
        v = api_color
    else:
        v = str(api_color)
    return DbOptionColor(v)


class QuestionQueries:
    """Database operations for questions"""

    @staticmethod
    def _sort_options(question: Question) -> None:
        if question.options:
            question.options.sort(key=lambda o: o.display_order)

    @staticmethod
    def get_all(
        db: Session,
        type: Optional[str] = None,
        situation: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Question]:
        """Get all questions with optional filtering"""
        query = db.query(Question)

        filters = []
        if type:
            filters.append(Question.type == type)
        if situation:
            filters.append(Question.situation == situation)
        if is_active is not None:
            filters.append(Question.is_active == is_active)

        if filters:
            query = query.filter(and_(*filters))

        return query.order_by(Question.question_order, Question.id).offset(skip).limit(limit).all()

    @staticmethod
    def get_all_with_options(
        db: Session,
        type: Optional[str] = None,
        situation: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Question]:
        """List questions with options eager-loaded (sorted by display_order per question)."""
        query = db.query(Question).options(joinedload(Question.options))

        filters = []
        if type:
            filters.append(Question.type == type)
        if situation:
            filters.append(Question.situation == situation)
        if is_active is not None:
            filters.append(Question.is_active == is_active)

        if filters:
            query = query.filter(and_(*filters))

        rows = query.order_by(Question.question_order, Question.id).offset(skip).limit(limit).all()
        for q in rows:
            QuestionQueries._sort_options(q)
        return rows

    @staticmethod
    def get_by_id(db: Session, question_id: str) -> Optional[Question]:
        """Get a question by ID"""
        return db.query(Question).filter(Question.id == question_id).first()

    @staticmethod
    def get_by_id_with_options(db: Session, question_id: str) -> Optional[Question]:
        """Get a question with options loaded, ordered by display_order."""
        q = (
            db.query(Question)
            .options(joinedload(Question.options))
            .filter(Question.id == question_id)
            .first()
        )
        if q:
            QuestionQueries._sort_options(q)
        return q

    @staticmethod
    def create_with_options(db: Session, data: QuestionCreate) -> Question:
        """Create a question and exactly four options in one transaction."""
        q_dict = data.model_dump(exclude={"options"})
        question = Question(**q_dict)
        db.add(question)
        db.flush()

        sit = _enum_attr_to_str(question.situation)
        lc = _enum_attr_to_str(question.life_context)
        qo = question.question_order

        for opt in data.options:
            color_s = _enum_attr_to_str(opt.color)
            db.add(
                Option(
                    question_id=question.id,
                    option_key=make_option_key(sit, lc, qo, color_s),
                    color=_to_db_option_color(opt.color),
                    option_text=opt.option_text,
                    display_order=opt.display_order,
                )
            )
        db.commit()
        out = QuestionQueries.get_by_id_with_options(db, str(question.id))
        if out is None:
            raise RuntimeError("Failed to reload question after create")
        return out

    @staticmethod
    def update_with_options(db: Session, question_id: str, data: QuestionUpdate) -> Optional[Question]:
        """Update question scalars and/or replace all four options (matched by color)."""
        question = (
            db.query(Question)
            .options(joinedload(Question.options))
            .filter(Question.id == question_id)
            .first()
        )
        if not question:
            return None

        update_data = data.model_dump(exclude_unset=True)
        option_payload = update_data.pop("options", None)

        for key, value in update_data.items():
            setattr(question, key, value)

        if option_payload is not None:
            if len(question.options) != 4:
                raise ValueError(
                    "Question must already have exactly 4 options to update them; "
                    f"found {len(question.options)}"
                )
            by_color = {_db_color_value(o.color): o for o in question.options}

            sit = _enum_attr_to_str(question.situation)
            lc = _enum_attr_to_str(question.life_context)
            qo = question.question_order

            for opt in option_payload:
                db_c = _to_db_option_color(opt["color"])
                key = _db_color_value(db_c)
                row = by_color.get(key)
                if row is None:
                    raise ValueError(f"Missing option row for color {key}")
                row.option_key = make_option_key(sit, lc, qo, key)
                row.option_text = opt["option_text"]
                row.display_order = opt["display_order"]

        db.commit()
        out = QuestionQueries.get_by_id_with_options(db, question_id)
        return out

    @staticmethod
    def delete(db: Session, question_id: str) -> bool:
        """Delete a question"""
        question = db.query(Question).filter(Question.id == question_id).first()
        if not question:
            return False

        db.delete(question)
        db.commit()
        return True

    @staticmethod
    def get_count(db: Session, type: Optional[str] = None) -> int:
        """Get total count of questions"""
        query = db.query(Question)
        if type:
            query = query.filter(Question.type == type)
        return query.count()


def _db_color_value(color: DbOptionColor) -> str:
    return color.value if hasattr(color, "value") else str(color)
