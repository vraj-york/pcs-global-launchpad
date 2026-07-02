"""Schemas for shared report template sections (report_content table)."""

from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field


class ReportContentResponse(BaseModel):
    """Active row for a single ``section_key``."""

    model_config = ConfigDict(extra="forbid")

    section_key: str = Field(..., max_length=255)
    content: Dict[str, Any]
