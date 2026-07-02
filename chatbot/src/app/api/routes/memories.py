"""
Memory Routes — /memories

User distilled memory CRUD, confirm/reject candidates, and consent.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.api.dependencies import get_memory_service
from app.models.schema import (
    MemoryConsentResponse,
    MemoryConsentUpdateRequest,
    MemoryCreateRequest,
    MemoryListResponse,
    MemoryRecordResponse,
    MemoryUpdateRequest,
)
from app.services.memory.memory_service import MemoryService
from app.utils.auth_context import extract_auth_context
from app.utils.subscription_access import require_chatbot_subscription

router = APIRouter(prefix="/memories", tags=["Memories"])
logger = logging.getLogger(__name__)


def _extract_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    return auth_header[7:].strip() if auth_header.startswith("Bearer ") else None


def _require_user(request: Request) -> tuple[str, str]:
    token = _extract_token(request)
    require_chatbot_subscription(token)
    auth = extract_auth_context(token, fallback_role=None)
    if auth.user_id == "unknown":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return auth.user_id, auth.role


@router.get("", response_model=MemoryListResponse)
def list_memories(
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    user_id, _ = _require_user(request)
    memories = memory_service.list_memories(user_id, status=status_filter)
    pending = memory_service.pending_candidate_count(user_id)
    return MemoryListResponse(
        memories=[MemoryRecordResponse(**m) for m in memories],
        pending_candidate_count=pending,
    )


@router.get("/consent", response_model=MemoryConsentResponse)
def get_memory_consent(
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
):
    user_id, _ = _require_user(request)
    return MemoryConsentResponse(**memory_service.get_consent(user_id))


@router.post("/consent", response_model=MemoryConsentResponse)
def set_memory_consent(
    body: MemoryConsentUpdateRequest,
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
):
    user_id, _ = _require_user(request)
    result = memory_service.set_consent(
        user_id,
        granted=body.granted,
        source=body.source,
    )
    return MemoryConsentResponse(**result)


@router.post("", response_model=MemoryRecordResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    body: MemoryCreateRequest,
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
):
    user_id, role = _require_user(request)
    record = memory_service.create_memory(
        user_id_hash=user_id,
        actor_role=role,
        kind=body.kind,
        text=body.text,
        bsp_dimension=body.bsp_dimension,
        scope_type=body.scope_type,
        entities=body.entities,
    )
    return MemoryRecordResponse(**record)


@router.patch("/{memory_id}", response_model=MemoryRecordResponse)
def update_memory(
    memory_id: str,
    body: MemoryUpdateRequest,
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
):
    user_id, role = _require_user(request)
    updated = memory_service.update_memory(
        memory_id=memory_id,
        user_id_hash=user_id,
        actor_role=role,
        text=body.text,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")
    return MemoryRecordResponse(**updated)


@router.post("/{memory_id}/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_memory(
    memory_id: str,
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
):
    user_id, role = _require_user(request)
    if not memory_service.confirm_memory(memory_id, user_id, role):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")


@router.post("/{memory_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_memory(
    memory_id: str,
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
):
    user_id, role = _require_user(request)
    if not memory_service.reject_memory(memory_id, user_id, role):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(
    memory_id: str,
    request: Request,
    memory_service: MemoryService = Depends(get_memory_service),
):
    user_id, role = _require_user(request)
    if not memory_service.delete_memory(memory_id, user_id, role):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Memory not found.")
