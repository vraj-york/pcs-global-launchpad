from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum
from uuid import UUID

class OptionColor(str, Enum):
    """Option color types"""
    RED = "red"
    GREEN = "green"
    BLUE = "blue"
    GREY = "grey"

class OptionCreate(BaseModel):
    """Create payload: option_key is generated from the parent question."""
    model_config = ConfigDict(extra="forbid")

    question_id: UUID = Field(..., description="ID of the question this option belongs to")
    color: OptionColor = Field(..., description="Option color (red/green/blue/grey)")
    option_text: str = Field(..., min_length=1, max_length=300, description="Option text")
    display_order: int = Field(..., ge=1, le=4, description="Display order (1-4)")

    @validator('option_text')
    def text_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Option text cannot be empty or only whitespace')
        return v.strip()


class OptionResponse(BaseModel):
    """Option as returned by the API (includes server-generated option_key)."""
    id: UUID
    question_id: UUID
    option_key: str = Field(..., min_length=1, max_length=50, description="Auto-generated slug (e.g., prt-1-red)")
    color: OptionColor = Field(..., description="Option color (red/green/blue/grey)")
    option_text: str = Field(..., min_length=1, max_length=300, description="Option text")
    display_order: int = Field(..., ge=1, le=4, description="Display order (1-4)")
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "question_id": "123e4567-e89b-12d3-a456-426614174001",
                "option_key": "prt-1-red",
                "color": "red",
                "option_text": "Organized yet flexible",
                "display_order": 1,
                "created_at": "2024-03-18T10:00:00",
            }
        }


class OptionUpdate(BaseModel):
    """Schema for updating an option (all fields optional); option_key is never accepted."""
    model_config = ConfigDict(extra="forbid")

    question_id: Optional[UUID] = None
    color: Optional[OptionColor] = None
    option_text: Optional[str] = Field(None, min_length=1, max_length=300)
    display_order: Optional[int] = Field(None, ge=1, le=4)

    @validator('option_text')
    def text_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Option text cannot be empty or only whitespace')
        return v.strip() if v else v


class OptionWithQuestion(OptionResponse):
    """Option with question details"""
    question_text: Optional[str] = None