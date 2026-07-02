from pydantic import BaseModel, ConfigDict
from datetime import datetime
from enum import Enum
from uuid import UUID
from typing import Optional


class AssessmentStatusEnum(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    scored = "scored"
    report_generated = "report_generated"


class AssessmentCreate(BaseModel):
    """Create assessment as in_progress only; user_id comes from JWT `sub`. No fields accepted."""

    model_config = ConfigDict(extra="forbid")


class AssessmentUpdate(BaseModel):
    """Status transitions: in_progress <-> completed (reopen to edit), then completed -> scored -> report_generated."""

    model_config = ConfigDict(extra="forbid")

    status: AssessmentStatusEnum


class AssessmentResponse(BaseModel):
    """GET/PUT/LIST assessment row; ``report_key`` is set on GET when joined report exists."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str
    status: AssessmentStatusEnum
    started_at: datetime
    completed_at: Optional[datetime] = None
    report_key: Optional[str] = None


class UploadPrintHtmlRequest(BaseModel):
    """POST /assessments/{id}/report-print-html — browser-rendered print document."""

    model_config = ConfigDict(extra="forbid")

    html: str


class UploadPrintHtmlResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    print_html_s3_key: str


class EnqueueScoringRequest(BaseModel):
    """Optional client HTML staging key (upload via report-print-html first)."""

    model_config = ConfigDict(extra="forbid")

    print_html_s3_key: Optional[str] = None


class EnqueueScoringResponse(BaseModel):
    """POST /assessments/{id}/enqueue-scoring — SQS message to score + report pipeline."""

    model_config = ConfigDict(extra="forbid")

    enqueued: bool
    message: Optional[str] = None


class EnqueueReportRequest(BaseModel):
    """POST /assessments/{id}/enqueue-report — after print HTML upload (status must be scored)."""

    model_config = ConfigDict(extra="forbid")

    print_html_s3_key: str


class EnqueueReportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enqueued: bool
    message: Optional[str] = None
