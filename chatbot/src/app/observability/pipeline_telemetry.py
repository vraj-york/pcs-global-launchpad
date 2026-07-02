"""
Pipeline performance telemetry (Phase 0).

Distinct from the compliance audit log:
  - Audit: one RDS row per interaction (outcome, tokens, total latency_ms).
  - Pipeline telemetry: per-step durations and TTFT metrics in CloudWatch only.

Logs are emitted as single-line JSON so CloudWatch Logs Insights can parse fields.
"""

from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

_request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
_trace_id_var: ContextVar[Optional[str]] = ContextVar("trace_id", default=None)
_company_id_var: ContextVar[Optional[str]] = ContextVar("company_id", default=None)


def _new_correlation_id() -> str:
    uuid7 = getattr(uuid, "uuid7", None)
    if uuid7 is not None:
        return str(uuid7())
    return str(uuid.uuid4())


def _emit_json(payload: dict[str, Any]) -> None:
    """Write one JSON object per line — CloudWatch Insights auto-parses @message."""
    _pipeline_logger.info(json.dumps(payload, default=str))


def _get_pipeline_logger() -> logging.Logger:
    """Logger that emits raw JSON lines (no level/name prefix) for CloudWatch."""
    pipeline_logger = logging.getLogger("bispybot.pipeline")
    if pipeline_logger.handlers:
        return pipeline_logger

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    pipeline_logger.addHandler(handler)
    pipeline_logger.propagate = False
    pipeline_logger.setLevel(logging.INFO)
    return pipeline_logger


_pipeline_logger = _get_pipeline_logger()


def bind_request_context(
    *,
    request_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    company_id: Optional[str] = None,
) -> tuple[str, str]:
    """Bind request-scoped identifiers for the current async task."""
    rid = request_id or _new_correlation_id()
    tid = trace_id or rid
    _request_id_var.set(rid)
    _trace_id_var.set(tid)
    if company_id:
        _company_id_var.set(company_id)
    return rid, tid


def get_request_id() -> Optional[str]:
    return _request_id_var.get()


def get_trace_id() -> Optional[str]:
    return _trace_id_var.get()


@dataclass(slots=True)
class PipelineStepRecord:
    event: str
    status: str
    duration_ms: int
    error_type: Optional[str] = None


@dataclass
class PipelineTimer:
    """
    Records per-step durations for the chat critical path.

    Steps emit immediately on completion so slow paths are visible even when
    the request times out before the audit finally block runs.
    """

    request_id: str
    trace_id: str
    company_id: Optional[str] = None
    _started_at: float = field(default_factory=time.monotonic, repr=False)
    _open_steps: dict[str, float] = field(default_factory=dict, repr=False)
    steps: list[PipelineStepRecord] = field(default_factory=list)
    ttft_sse_ms: Optional[int] = None
    ttft_first_token_ms: Optional[int] = None
    ttft_post_tool_ms: Optional[int] = None

    def start(self, event: str) -> None:
        self._open_steps[event] = time.monotonic()

    def end(self, event: str, *, status: str = "ok", error_type: Optional[str] = None) -> int:
        started = self._open_steps.pop(event, None)
        duration_ms = int((time.monotonic() - started) * 1000) if started else 0
        record = PipelineStepRecord(
            event=event,
            status=status,
            duration_ms=duration_ms,
            error_type=error_type,
        )
        self.steps.append(record)
        self._emit_step(record)
        return duration_ms

    def record_ttft_first_token(self) -> int:
        elapsed = int((time.monotonic() - self._started_at) * 1000)
        self.ttft_first_token_ms = elapsed
        return elapsed

    def record_ttft_sse(self) -> int:
        elapsed = int((time.monotonic() - self._started_at) * 1000)
        self.ttft_sse_ms = elapsed
        return elapsed

    def to_interaction_meta(self) -> dict[str, Any]:
        return {
            "pipeline_request_id": self.request_id,
            "pipeline_trace_id": self.trace_id,
            "pipeline_steps": [
                {
                    "event": step.event,
                    "status": step.status,
                    "duration_ms": step.duration_ms,
                    **({"error_type": step.error_type} if step.error_type else {}),
                }
                for step in self.steps
            ],
            "ttft_sse_ms": self.ttft_sse_ms,
            "ttft_first_token_ms": self.ttft_first_token_ms,
            "ttft_post_tool_ms": self.ttft_post_tool_ms,
            "pipeline_total_ms": int((time.monotonic() - self._started_at) * 1000),
        }

    def _emit_step(self, record: PipelineStepRecord) -> None:
        payload: dict[str, Any] = {
            "record_type": "pipeline_step",
            "step": record.event,
            "status": record.status,
            "duration_ms": record.duration_ms,
            "request_id": self.request_id,
            "trace_id": self.trace_id,
        }
        if self.company_id:
            payload["company_id"] = self.company_id
        if record.error_type:
            payload["error_type"] = record.error_type
        _emit_json(payload)


def emit_pipeline_telemetry(
    timer: PipelineTimer,
    *,
    interaction_meta: Optional[dict] = None,
    persona: Optional[str] = None,
    chat_mode: Optional[str] = None,
    context_strategy: Optional[str] = None,
    query_path: Optional[str] = None,
    warm_cache_hit: Optional[bool] = None,
    session_id: Optional[str] = None,
    thread_id: Optional[str] = None,
) -> None:
    """Emit a single summary log for the request pipeline."""
    summary = timer.to_interaction_meta()
    if interaction_meta is not None:
        interaction_meta.update(summary)

    payload: dict[str, Any] = {
        "record_type": "pipeline_summary",
        "status": "ok",
        "request_id": timer.request_id,
        "trace_id": timer.trace_id,
        "duration_ms": summary["pipeline_total_ms"],
        "pipeline_steps": summary["pipeline_steps"],
        "ttft_sse_ms": summary["ttft_sse_ms"],
        "ttft_first_token_ms": summary["ttft_first_token_ms"],
        "ttft_post_tool_ms": summary["ttft_post_tool_ms"],
    }
    if timer.company_id:
        payload["company_id"] = timer.company_id
    if persona:
        payload["persona"] = persona
    if chat_mode:
        payload["chat_mode"] = chat_mode
    if context_strategy:
        payload["context_strategy"] = context_strategy
    if query_path:
        payload["query_path"] = query_path
    if warm_cache_hit is not None:
        payload["warm_cache_hit"] = warm_cache_hit
    if session_id:
        payload["session_id"] = session_id
    if thread_id:
        payload["thread_id"] = thread_id
    if interaction_meta:
        payload["input_tokens"] = interaction_meta.get("input_tokens")
        payload["cache_read_tokens"] = interaction_meta.get("cache_read_tokens", 0)
        payload["cache_creation_tokens"] = interaction_meta.get("cache_creation_tokens", 0)
        payload["route_reasons"] = interaction_meta.get("route_reasons")

    _emit_json(payload)
