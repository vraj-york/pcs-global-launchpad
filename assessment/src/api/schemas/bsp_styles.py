"""
Pydantic schemas for BSP Styles
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime


_ARRAY_FIELDS = (
    "environmental_preferences",
    "interaction_preferences",
    "character_strengths",
    "psychological_needs",
    "likes",
    "dislikes",
    "work_preferences",
    "warning_signs",
)


class BspStyleBase(BaseModel):
    """Base schema for BSP Style"""
    style_number: int = Field(..., ge=1, description="Unique style number (1-13)")
    title: str = Field(..., min_length=1, max_length=100, description="Style title")
    has_video: bool = Field(default=False, description="Whether style has a video")
    youtube_video_id: Optional[str] = Field(None, max_length=20, description="YouTube video ID")
    description: str = Field(..., min_length=1, description="Style description")
    display_order: int = Field(..., ge=1, description="Display order (positive integer starting from 1)")
    environmental_preferences: list[str] = Field(..., min_length=1, description="Environmental preferences")
    interaction_preferences: list[str] = Field(..., min_length=1, description="Interaction preferences")
    character_strengths: list[str] = Field(..., min_length=1, description="Character strengths")
    psychological_needs: list[str] = Field(..., min_length=1, description="Psychological needs")
    likes: list[str] = Field(..., min_length=1, description="What they like")
    dislikes: list[str] = Field(..., min_length=1, description="What they dislike")
    work_preferences: list[str] = Field(..., min_length=1, description="Work preferences")
    warning_signs: list[str] = Field(..., min_length=1, description="Stress warning signs")
    when_feeling_stressed: str = Field(..., min_length=1, description="When feeling stressed")

    @field_validator(*_ARRAY_FIELDS)
    @classmethod
    def strip_nonempty_list_items(cls, v: list[str]) -> list[str]:
        out = [s.strip() for s in v]
        if not all(s for s in out):
            raise ValueError("Each list item must be non-empty")
        return out

    @field_validator("when_feeling_stressed")
    @classmethod
    def strip_when_feeling_stressed(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("when_feeling_stressed cannot be empty or only whitespace")
        return s


class BspStyleCreate(BspStyleBase):
    """Schema for creating a new BSP Style"""
    pass


class BspStyleUpdate(BaseModel):
    """Schema for updating an existing BSP Style"""
    style_number: Optional[int] = Field(None, ge=1, description="Unique style number (1-13)")
    title: Optional[str] = Field(None, min_length=1, max_length=100, description="Style title")
    has_video: Optional[bool] = Field(None, description="Whether style has a video")
    youtube_video_id: Optional[str] = Field(None, max_length=20, description="YouTube video ID")
    description: Optional[str] = Field(None, min_length=1, description="Style description")
    display_order: Optional[int] = Field(None, ge=1, description="Display order (positive integer starting from 1)")
    environmental_preferences: Optional[list[str]] = Field(None, min_length=1)
    interaction_preferences: Optional[list[str]] = Field(None, min_length=1)
    character_strengths: Optional[list[str]] = Field(None, min_length=1)
    psychological_needs: Optional[list[str]] = Field(None, min_length=1)
    likes: Optional[list[str]] = Field(None, min_length=1)
    dislikes: Optional[list[str]] = Field(None, min_length=1)
    work_preferences: Optional[list[str]] = Field(None, min_length=1)
    warning_signs: Optional[list[str]] = Field(None, min_length=1)
    when_feeling_stressed: Optional[str] = Field(None, min_length=1)

    @field_validator(*_ARRAY_FIELDS)
    @classmethod
    def strip_nonempty_list_items(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is None:
            return v
        out = [s.strip() for s in v]
        if not all(s for s in out):
            raise ValueError("Each list item must be non-empty")
        return out

    @field_validator("when_feeling_stressed")
    @classmethod
    def strip_when_feeling_stressed(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        s = v.strip()
        if not s:
            raise ValueError("when_feeling_stressed cannot be empty or only whitespace")
        return s


class BspStyleResponse(BspStyleBase):
    """Schema for BSP Style responses"""
    model_config = ConfigDict(from_attributes=True)

    id: str  # UUID stored as string (matches Prisma String type)
    created_at: datetime
    updated_at: datetime
