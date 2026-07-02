from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuestionResponseItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option_id: UUID
    value: int = Field(..., ge=1, le=10)


class BulkQuestionResponseWrite(BaseModel):
    """Bulk create or bulk update payload."""

    model_config = ConfigDict(extra="forbid")

    items: List[QuestionResponseItem] = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Each option_id must appear at most once per request.",
    )


class QuestionResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    option_id: UUID
    value: int
    created_at: datetime
    updated_at: datetime
