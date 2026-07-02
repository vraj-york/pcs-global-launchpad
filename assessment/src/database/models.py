from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    Boolean,
    SmallInteger,
    Enum,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

Base = declarative_base()


# Enums matching Prisma schema
class QuestionType(str, enum.Enum):
    environmental_preferences = "environmental_preferences"
    interaction_preferences = "interaction_preferences"
    character_strengths_distressors = "character_strengths_distressors"


class SituationType(str, enum.Enum):
    typical = "typical"
    stressful = "stressful"


class LifeContextType(str, enum.Enum):
    professional = "professional"
    personal = "personal"


class OptionColor(str, enum.Enum):
    red = "red"
    green = "green"
    blue = "blue"
    grey = "grey"


class AssessmentStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    scored = "scored"
    report_generated = "report_generated"


class Question(Base):
    """
    Mirrors Prisma Question model.
    Schema managed by Prisma (backend), data seeded by assessment Lambda.
    """

    __tablename__ = "questions"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_order = Column(SmallInteger, unique=True, nullable=False)
    question_text = Column(Text, nullable=False)
    type = Column(
        Enum(QuestionType, name="questiontype", create_type=False), nullable=False
    )
    situation = Column(
        Enum(SituationType, name="situationtype", create_type=False), nullable=False
    )
    life_context = Column(
        Enum(LifeContextType, name="lifecontexttype", create_type=False), nullable=False
    )
    version = Column(SmallInteger, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    options = relationship(
        "Option",
        back_populates="question",
        lazy="select",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Question(id={self.id}, order={self.question_order}, text='{self.question_text[:30]}...')>"


class Option(Base):
    """
    Mirrors Prisma Option model.
    4 color-coded options per question (red/green/blue/grey).
    """

    __tablename__ = "options"
    __table_args__ = (
        UniqueConstraint("question_id", "color", name="options_question_id_color_key"),
        UniqueConstraint(
            "question_id", "display_order", name="options_question_id_display_order_key"
        ),
        {"extend_existing": True},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    option_key = Column(String, unique=True, nullable=False)
    color = Column(
        Enum(OptionColor, name="optioncolor", create_type=False), nullable=False
    )
    option_text = Column(Text, nullable=False)
    display_order = Column(SmallInteger, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    question = relationship("Question", back_populates="options")

    def __repr__(self):
        return (
            f"<Option(id={self.id}, option_key={self.option_key}, color={self.color})>"
        )


class BspStyle(Base):
    """
    Mirrors Prisma BspStyle model.
    BSP (Behavioral Style Profile) personality styles.
    Note: id is String (text) type, not UUID type in Prisma
    """

    __tablename__ = "bsp_styles"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True)  # UUID stored as string
    style_number = Column(Integer, unique=True, nullable=False)
    title = Column(String(100), unique=True, nullable=False)
    has_video = Column(Boolean, default=False, nullable=False)
    youtube_video_id = Column(String(20))
    description = Column(Text, nullable=False)
    display_order = Column(Integer, unique=True, nullable=False)
    environmental_preferences = Column(ARRAY(Text), nullable=False)
    interaction_preferences = Column(ARRAY(Text), nullable=False)
    character_strengths = Column(ARRAY(Text), nullable=False)
    psychological_needs = Column(ARRAY(Text), nullable=False)
    likes = Column(ARRAY(Text), nullable=False)
    dislikes = Column(ARRAY(Text), nullable=False)
    work_preferences = Column(ARRAY(Text), nullable=False)
    warning_signs = Column(ARRAY(Text), nullable=False)
    when_feeling_stressed = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<BspStyle(id={self.id}, style_number={self.style_number}, title='{self.title}')>"


class AppUser(Base):
    """
    Mirrors Prisma AppUser (subset for report worker: names + contact).
    """

    __tablename__ = "app_users"
    __table_args__ = {"extend_existing": True}

    cognito_sub = Column("cognito_sub", String(128), primary_key=True)
    first_name = Column("first_name", String(255), nullable=True)
    last_name = Column("last_name", String(255), nullable=True)
    email = Column("email", String(255), nullable=True)
    job_role = Column("job_role", String(255), nullable=True)
    status = Column("status", String(255), nullable=True)
    deleted_at = Column("deleted_at", DateTime, nullable=True)

    def __repr__(self):
        return f"<AppUser(cognito_sub={self.cognito_sub!r})>"


class Assessment(Base):
    """
    Mirrors Prisma Assessment model (user_id = Cognito JWT `sub`, FK enforced in PostgreSQL only).
    """

    __tablename__ = "assessments"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column("user_id", String(128), nullable=False)
    status = Column(
        Enum(AssessmentStatus, name="AssessmentStatus", create_type=False),
        nullable=False,
        default=AssessmentStatus.in_progress,
    )
    started_at = Column("started_at", DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column("completed_at", DateTime, nullable=True)

    def __repr__(self):
        return (
            f"<Assessment(id={self.id}, user_id={self.user_id}, status={self.status})>"
        )


class QuestionResponse(Base):
    """
    One row per (assessment, option) with a Likert-style value (1–10 validated in API).
    Mirrors Prisma QuestionResponse.
    """

    __tablename__ = "question_responses"
    __table_args__ = (
        UniqueConstraint(
            "assessment_id",
            "option_id",
            name="question_responses_assessment_id_option_id_key",
        ),
        {"extend_existing": True},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(
        "assessment_id",
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
    )
    option_id = Column(
        "option_id",
        UUID(as_uuid=True),
        ForeignKey("options.id", ondelete="RESTRICT"),
        nullable=False,
    )
    value = Column(SmallInteger, nullable=False)
    created_at = Column("created_at", DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self):
        return f"<QuestionResponse(id={self.id}, assessment_id={self.assessment_id}, value={self.value})>"


class AssessmentScore(Base):
    """
    Mirrors Prisma AssessmentScore model.
    Stores computed score breakdown JSON for an assessment.
    """

    __tablename__ = "assessment_scores"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(
        "assessment_id",
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    score_breakdown = Column("score_breakdown", JSON, nullable=False)
    created_at = Column("created_at", DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self):
        return f"<AssessmentScore(id={self.id}, assessment_id={self.assessment_id})>"


class AssessmentReport(Base):
    """
    Mirrors Prisma AssessmentReport. Column ``report`` holds the S3 object key
    for the generated PDF (exposed as ``report_key`` on the model).
    """

    __tablename__ = "assessment_reports"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(
        "assessment_id",
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    assessment_score_id = Column(
        "assessment_score_id",
        UUID(as_uuid=True),
        ForeignKey("assessment_scores.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    report_key = Column("report", Text, nullable=False)
    created_at = Column("created_at", DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self):
        return (
            f"<AssessmentReport(assessment_id={self.assessment_id}, "
            f"report_key={self.report_key!r})>"
        )


class AssessmentScoreStyleContext(str, enum.Enum):
    professional_typical = "professional_typical"
    professional_stressful = "professional_stressful"
    personal_typical = "personal_typical"
    personal_stressful = "personal_stressful"
    overall = "overall"


class AssessmentScoreStyleType(str, enum.Enum):
    basic = "basic"
    plural = "plural"
    split = "split"


class AssessmentScoreStyle(Base):
    """
    Mirrors Prisma AssessmentScoreStyle model.
    One row per assessment score and context (overall + 4 quadrants).
    """

    __tablename__ = "assessment_score_styles"
    __table_args__ = (
        UniqueConstraint(
            "assessment_score_id",
            "context",
            name="assessment_score_styles_assessment_score_id_context_key",
        ),
        {"extend_existing": True},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_score_id = Column(
        "assessment_score_id",
        UUID(as_uuid=True),
        ForeignKey("assessment_scores.id", ondelete="CASCADE"),
        nullable=False,
    )
    bsp_style_id = Column("bsp_style_id", String(36), nullable=False)
    context = Column(
        Enum(
            AssessmentScoreStyleContext,
            name="AssessmentScoreStyleContext",
            create_type=False,
        ),
        nullable=False,
    )
    type = Column(
        Enum(
            AssessmentScoreStyleType, name="AssessmentScoreStyleType", create_type=False
        ),
        nullable=False,
    )

    def __repr__(self):
        return (
            f"<AssessmentScoreStyle(id={self.id}, assessment_score_id={self.assessment_score_id}, "
            f"context={self.context}, type={self.type}, bsp_style_id={self.bsp_style_id})>"
        )


class AuditLog(Base):
    """
    Mirrors Prisma AuditLog; append-only events from the assessment API (and future domains).
    """

    __tablename__ = "audit_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    domain = Column(String(100), nullable=False)
    event_type = Column("event_type", String(100), nullable=False)
    entity_id = Column("entity_id", String(255), nullable=True)
    user_id = Column("user_id", String(255), nullable=True)
    ip_address = Column("ip_address", String(45), nullable=True)
    audit_metadata = Column("metadata", JSON, nullable=True)
    created_at = Column("created_at", DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<AuditLog(id={self.id}, domain={self.domain}, event_type={self.event_type})>"


class ReportContent(Base):
    """
    Mirrors Prisma ReportContent model.
    Shared report template sections (static copy keyed by section).
    """

    __tablename__ = "report_content"
    __table_args__ = {"extend_existing": True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_key = Column("section_key", String(255), unique=True, nullable=False)
    content = Column(JSON, nullable=False)
    is_active = Column("is_active", Boolean, default=True, nullable=False)
    created_at = Column("created_at", DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        "updated_at",
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self):
        return f"<ReportContent(id={self.id}, section_key={self.section_key}, is_active={self.is_active})>"
