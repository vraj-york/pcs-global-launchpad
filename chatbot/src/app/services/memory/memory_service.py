"""High-level memory operations for API routes."""

from __future__ import annotations

import logging
from typing import Optional

from app.config import settings
from app.domain.memory_registry import (
    KIND_TO_DEFAULT_SCOPE,
    validate_bsp_dimension,
    validate_memory_kind,
    validate_memory_status,
    validate_scope_type,
    validate_sensitivity,
)
from app.services.memory.user_dek_crypto import UserDekCrypto
from app.repositories.memory_consent_repository import MemoryConsentRepository
from app.repositories.memory_repository import MemoryRepository
from app.services.memory.audit import write_memory_audit_log
from app.services.memory.embedding_service import MemoryEmbeddingService
from app.services.memory.entity_normalizer import normalize_entities

logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(
        self,
        *,
        memory_repo: MemoryRepository,
        consent_repo: MemoryConsentRepository,
        embedding_service: MemoryEmbeddingService,
        user_dek_crypto: UserDekCrypto,
    ) -> None:
        self._repo = memory_repo
        self._consent = consent_repo
        self._embed = embedding_service
        self._dek = user_dek_crypto

    def _decrypt_row(self, user_id_hash: str, row: dict) -> dict:
        text = self._dek.decrypt_for_user(user_id_hash, row["content_ciphertext"])
        return {
            "id": str(row["id"]),
            "kind": row["kind"],
            "bsp_dimension": row.get("bsp_dimension"),
            "scope_type": row.get("scope_type"),
            "scope_ref": row.get("scope_ref"),
            "sensitivity": row.get("sensitivity"),
            "text": text,
            "entities": row.get("entities") or [],
            "importance": row.get("importance"),
            "status": row.get("status"),
            "user_edited": row.get("user_edited", False),
            "source_message_id": str(row["source_message_id"]) if row.get("source_message_id") else None,
            "source_conversation_id": str(row["source_conversation_id"]) if row.get("source_conversation_id") else None,
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        }

    def list_memories(
        self,
        user_id_hash: str,
        *,
        status: Optional[str] = None,
    ) -> list[dict]:
        rows = self._repo.list_for_user(user_id_hash, status=status)
        return [self._decrypt_row(user_id_hash, r) for r in rows]

    def create_memory(
        self,
        *,
        user_id_hash: str,
        actor_role: str,
        kind: str,
        text: str,
        bsp_dimension: Optional[str] = None,
        scope_type: Optional[str] = None,
        entities: Optional[list[str]] = None,
    ) -> dict:
        validate_memory_kind(kind)
        validate_bsp_dimension(kind, bsp_dimension)
        scope = scope_type or KIND_TO_DEFAULT_SCOPE.get(kind, "personal")
        validate_scope_type(scope)
        validate_sensitivity("normal")

        display, normalized = normalize_entities(entities or [])
        row = self._repo.insert(
            user_id_hash=user_id_hash,
            kind=kind,
            content_ciphertext=self._dek.encrypt_for_user(user_id_hash, text.strip()),
            embedding=self._embed.embed_text(text),
            entities=display,
            entities_normalized=normalized,
            status="confirmed",
            bsp_dimension=bsp_dimension,
            scope_type=scope,
            sensitivity="normal",
            importance=0.8,
            user_edited=True,
        )
        write_memory_audit_log(
            user_id_hash=user_id_hash,
            actor_role=actor_role,
            action="create",
            memory_id=str(row["id"]),
            metadata={"status": "confirmed", "manual": True},
        )
        full = self._repo.get_owned(str(row["id"]), user_id_hash)
        return self._decrypt_row(user_id_hash, full) if full else self._decrypt_row(user_id_hash, row)

    def update_memory(
        self,
        *,
        memory_id: str,
        user_id_hash: str,
        actor_role: str,
        text: str,
    ) -> Optional[dict]:
        row = self._repo.get_owned(memory_id, user_id_hash)
        if not row:
            return None
        display, normalized = normalize_entities(row.get("entities") or [])
        ok = self._repo.update_content(
            memory_id,
            user_id_hash,
            content_ciphertext=self._dek.encrypt_for_user(user_id_hash, text.strip()),
            embedding=self._embed.embed_text(text),
            entities=display,
            entities_normalized=normalized,
            user_edited=True,
        )
        if not ok:
            return None
        write_memory_audit_log(
            user_id_hash=user_id_hash,
            actor_role=actor_role,
            action="update",
            memory_id=memory_id,
        )
        updated = self._repo.get_owned(memory_id, user_id_hash)
        return self._decrypt_row(user_id_hash, updated) if updated else None

    def confirm_memory(
        self,
        memory_id: str,
        user_id_hash: str,
        actor_role: str,
    ) -> bool:
        ok = self._repo.set_status(memory_id, user_id_hash, "confirmed")
        if ok:
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="confirm",
                memory_id=memory_id,
            )
        return ok

    def reject_memory(
        self,
        memory_id: str,
        user_id_hash: str,
        actor_role: str,
    ) -> bool:
        ok = self._repo.set_status(memory_id, user_id_hash, "rejected")
        if ok:
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="reject",
                memory_id=memory_id,
            )
        return ok

    def delete_memory(
        self,
        memory_id: str,
        user_id_hash: str,
        actor_role: str,
    ) -> bool:
        ok = self._repo.soft_delete(memory_id, user_id_hash)
        if ok:
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="delete",
                memory_id=memory_id,
            )
        return ok

    def get_consent(self, user_id_hash: str) -> dict:
        row = self._consent.get(user_id_hash)
        if not row:
            return {
                "granted": settings.MEMORY_CONSENT_DEFAULT_GRANTED,
                "scope": "memory_extraction",
                "source": "default",
            }
        return {
            "granted": bool(row.get("granted")),
            "scope": row.get("scope"),
            "source": row.get("source"),
            "granted_at": row["granted_at"].isoformat() if row.get("granted_at") else None,
            "revoked_at": row["revoked_at"].isoformat() if row.get("revoked_at") else None,
        }

    def set_consent(
        self,
        user_id_hash: str,
        *,
        granted: bool,
        source: str = "ui",
    ) -> dict:
        row = self._consent.upsert(user_id_hash, granted=granted, source=source)
        return {
            "granted": bool(row.get("granted")),
            "scope": row.get("scope"),
            "source": row.get("source"),
            "granted_at": row["granted_at"].isoformat() if row.get("granted_at") else None,
            "revoked_at": row["revoked_at"].isoformat() if row.get("revoked_at") else None,
        }

    def pending_candidate_count(self, user_id_hash: str) -> int:
        return self._repo.count_candidates(user_id_hash)
