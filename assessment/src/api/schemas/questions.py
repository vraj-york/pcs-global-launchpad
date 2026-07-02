from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID

from api.schemas.options import OptionColor, OptionResponse


class QuestionType(str, Enum):
    """Question types"""
    ENVIRONMENTAL_PREFERENCES = "environmental_preferences"
    INTERACTION_PREFERENCES = "interaction_preferences"
    CHARACTER_STRENGTHS_DISTRESSORS = "character_strengths_distressors"


class SituationType(str, Enum):
    """Situation types"""
    TYPICAL = "typical"
    STRESSFUL = "stressful"


class LifeContextType(str, Enum):
    """Life context types"""
    PROFESSIONAL = "professional"
    PERSONAL = "personal"


_REQUIRED_OPTION_COLORS = frozenset({"red", "green", "blue", "grey"})


class QuestionOptionInput(BaseModel):
    """One color option for a question (no question_id or option_key — set server-side)."""
    model_config = ConfigDict(extra="forbid")

    color: OptionColor = Field(..., description="Must be one of red, green, blue, grey (each once per question)")
    option_text: str = Field(..., min_length=1, max_length=300, description="Option label text")
    display_order: int = Field(..., ge=1, le=4, description="Display order 1–4, unique per question")

    @field_validator("option_text")
    @classmethod
    def strip_option_text(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Option text cannot be empty or only whitespace")
        return s


def _validate_four_options(options: List[QuestionOptionInput]) -> None:
    if len(options) != 4:
        raise ValueError("Exactly 4 options are required (one per color: red, green, blue, grey)")

    color_values = [o.color.value for o in options]
    if len(set(color_values)) != 4:
        raise ValueError("Each option must use a distinct color; all of red, green, blue, and grey must appear exactly once")

    if set(color_values) != _REQUIRED_OPTION_COLORS:
        raise ValueError("Colors must be exactly red, green, blue, and grey (one of each)")

    orders = [o.display_order for o in options]
    if sorted(orders) != [1, 2, 3, 4]:
        raise ValueError("display_order must be 1, 2, 3, and 4, each used exactly once")


# Base schema with common fields
class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=10, max_length=500, description="Question text")
    type: QuestionType = Field(..., description="Question type")
    situation: SituationType = Field(..., description="Situation type")
    life_context: LifeContextType = Field(..., description="Life context")
    question_order: int = Field(..., ge=1, le=60, description="Question order (1-60)")
    version: int = Field(1, ge=1, description="Question version")
    is_active: bool = Field(True, description="Whether question is active")

    @field_validator("question_text")
    @classmethod
    def text_must_not_be_empty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Question text cannot be empty or only whitespace")
        return s


class QuestionCreate(QuestionBase):
    """Create a question together with exactly four options (one per color)."""
    model_config = ConfigDict(extra="forbid")

    options: List[QuestionOptionInput] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Exactly four options: red, green, blue, grey",
    )

    @model_validator(mode="after")
    def validate_options(self) -> "QuestionCreate":
        _validate_four_options(self.options)
        return self


class QuestionUpdate(BaseModel):
    """Update question fields and/or replace all four options."""
    model_config = ConfigDict(extra="forbid")

    question_text: Optional[str] = Field(None, min_length=10, max_length=500)
    type: Optional[QuestionType] = None
    situation: Optional[SituationType] = None
    life_context: Optional[LifeContextType] = None
    question_order: Optional[int] = Field(None, ge=1, le=60)
    version: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    options: Optional[List[QuestionOptionInput]] = Field(
        None,
        min_length=4,
        max_length=4,
        description="When set, must be exactly four options (full replace)",
    )

    @field_validator("question_text")
    @classmethod
    def text_must_not_be_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        s = v.strip()
        if not s:
            raise ValueError("Question text cannot be empty or only whitespace")
        return s

    @model_validator(mode="after")
    def validate_options_when_present(self) -> "QuestionUpdate":
        if self.options is not None:
            _validate_four_options(self.options)
        return self


class QuestionResponse(QuestionBase):
    """Schema for question response"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "question_order": 1,
            "question_text": "I want my workspace to be",
            "type": "environmental_preferences",
            "situation": "typical",
            "life_context": "professional",
            "version": 1,
            "is_active": True,
            "created_at": "2024-03-18T10:00:00",
            "updated_at": "2024-03-18T10:00:00",
        }
    })


class QuestionWithOptions(QuestionResponse):
    """Question with its four options (sorted by display_order)."""
    options: List[OptionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
