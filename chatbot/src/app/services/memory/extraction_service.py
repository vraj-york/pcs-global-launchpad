"""Post-stream Haiku extraction into candidate memories."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from app.config import settings
from app.domain.memory_prompts import build_extraction_system_prompt
from app.domain.memory_registry import (
    MANUAL_ONLY_KINDS,
    kind_allowed_for_role,
    normalize_bsp_dimension_for_kind,
    normalize_scope_type,
    normalize_sensitivity,
    validate_memory_kind,
)
from app.services.memory.user_dek_crypto import UserDekCrypto
from app.repositories.memory_consent_repository import MemoryConsentRepository
from app.repositories.memory_repository import MemoryRepository
from app.services.memory.audit import write_memory_audit_log
from app.services.memory.embedding_service import MemoryEmbeddingService
from app.services.memory.entity_normalizer import normalize_entities
from app.services.memory.memory_policy import should_extract
from app.observability.query_router import QueryPath

logger = logging.getLogger(__name__)

_IMPORTANCE_MIN = 0.3

_MEDICAL_PATTERNS = re.compile(
    r"\b(diagnos|prescri|medication|therapy|depression|anxiety disorder|bipolar|"
    r"ssn|social security)\b",
    re.IGNORECASE,
)


class MemoryExtractionService:
    def __init__(
        self,
        *,
        memory_repo: MemoryRepository,
        consent_repo: MemoryConsentRepository,
        embedding_service: MemoryEmbeddingService,
        user_dek_crypto: UserDekCrypto,
        bedrock_client: Any,
    ) -> None:
        self._repo = memory_repo
        self._consent = consent_repo
        self._embed = embedding_service
        self._dek = user_dek_crypto
        self._bedrock = bedrock_client

    def extract_if_eligible(
        self,
        *,
        user_id_hash: str,
        actor_role: str,
        persona: str,
        chat_mode: str,
        query_path: QueryPath,
        user_message: str,
        assistant_message: str,
        assistant_message_id: Optional[str],
        thread_id: Optional[str],
        client_id: Optional[str] = None,
        existing_bsp_summary: Optional[str] = None,
    ) -> int:
        if user_id_hash == "unknown":
            logger.warning("memory_extract_skipped reason=unknown_user")
            return 0
        if not assistant_message_id:
            logger.warning(
                "memory_extract_skipped reason=no_assistant_message_id thread_id=%s",
                thread_id,
            )
            return 0

        consent_granted = self._consent.is_granted(user_id_hash)
        if not should_extract(
            chat_mode=chat_mode,
            query_path=query_path,
            consent_granted=consent_granted,
            enable_extraction=settings.ENABLE_MEMORY_EXTRACTION,
            user_message=user_message,
        ):
            logger.info(
                "memory_extract_skipped reason=not_eligible chat_mode=%s query_path=%s",
                chat_mode,
                query_path.value,
            )
            return 0

        try:
            return self._extract_sync(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                persona=persona,
                user_message=user_message,
                assistant_message=assistant_message,
                assistant_message_id=assistant_message_id,
                thread_id=thread_id,
                client_id=client_id,
                existing_bsp_summary=existing_bsp_summary,
            )
        except Exception as exc:
            logger.error("memory_extract_failed error=%s", exc, exc_info=True)
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="extract",
                metadata={"status": "error", "error": str(exc)},
            )
            return 0

    def _extract_sync(
        self,
        *,
        user_id_hash: str,
        actor_role: str,
        persona: str,
        user_message: str,
        assistant_message: str,
        assistant_message_id: str,
        thread_id: Optional[str],
        client_id: Optional[str],
        existing_bsp_summary: Optional[str],
    ) -> int:
        existing_lines: list[str] = []
        for row in self._repo.list_summaries_for_dedup(user_id_hash, limit=10):
            try:
                text = self._dek.decrypt_for_user(user_id_hash, row["content_ciphertext"])
                existing_lines.append(f"- [{row['kind']}] {text[:200]}")
            except Exception:
                continue

        user_content = (
            f"<existing_memories>\n"
            + ("\n".join(existing_lines) if existing_lines else "(none)")
            + f"\n</existing_memories>\n\n"
            f"<bsp_profile_summary>\n{existing_bsp_summary or '(not provided)'}\n</bsp_profile_summary>\n\n"
            f"User: {user_message[:2000]}\n\nAssistant: {assistant_message[:2000]}"
        )

        try:
            result = self._bedrock.generate_chat_response(
                messages=[{"role": "user", "content": user_content}],
                system_prompt=build_extraction_system_prompt(),
                max_tokens=600,
                temperature=0.2,
                tools=None,
                model_id=settings.MEMORY_EXTRACT_MODEL_ID or settings.BEDROCK_SUMMARY_MODEL,
            )
        except Exception as exc:
            logger.error("memory_extract_bedrock_failed error=%s", exc, exc_info=True)
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="extract",
                metadata={"status": "bedrock_error", "error": str(exc)},
            )
            return 0

        raw_text = self._extract_text_from_bedrock(result)
        candidates = self._parse_candidates(raw_text)
        created = 0

        for index, item in enumerate(candidates):
            try:
                created += self._persist_candidate(
                    item=item,
                    index=index,
                    user_id_hash=user_id_hash,
                    actor_role=actor_role,
                    persona=persona,
                    assistant_message_id=assistant_message_id,
                    thread_id=thread_id,
                    client_id=client_id,
                )
            except Exception as exc:
                logger.warning(
                    "memory_extract_candidate_skipped index=%s error=%s",
                    index,
                    exc,
                    exc_info=True,
                )
                write_memory_audit_log(
                    user_id_hash=user_id_hash,
                    actor_role=actor_role,
                    action="extract_skipped",
                    metadata={"index": index, "error": str(exc)},
                )

        write_memory_audit_log(
            user_id_hash=user_id_hash,
            actor_role=actor_role,
            action="extract",
            metadata={"created_count": created, "candidate_count": len(candidates)},
        )
        return created

    @staticmethod
    def _parse_importance(value: object) -> float:
        try:
            score = float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 0.5
        return score

    def _persist_candidate(
        self,
        *,
        item: dict,
        index: int,
        user_id_hash: str,
        actor_role: str,
        persona: str,
        assistant_message_id: str,
        thread_id: Optional[str],
        client_id: Optional[str],
    ) -> int:
        idempotency_key = f"{user_id_hash}:{assistant_message_id}:{index}"
        if self._repo.find_by_idempotency_key(idempotency_key):
            return 0

        if not self._validate_candidate(item, persona):
            return 0

        kind = item["kind"]
        text = item["text"]
        importance = self._parse_importance(item.get("importance", 0.5))
        if importance < settings.MEMORY_IMPORTANCE_MIN:
            return 0

        if _MEDICAL_PATTERNS.search(text):
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="extract_blocked",
                metadata={"reason": "prohibited_content", "kind": kind},
            )
            return 0

        display_entities, normalized_entities = normalize_entities(
            item.get("entities") or []
        )

        scope_type = normalize_scope_type(kind, item.get("scope_type"))
        scope_ref = item.get("scope_ref")
        if persona == "coach" and client_id and kind in {"observation", "coaching_history"}:
            scope_type = "coachee"
            scope_ref = scope_ref or client_id

        raw_dimension = item.get("bsp_dimension")
        bsp_dimension = normalize_bsp_dimension_for_kind(kind, raw_dimension)
        sensitivity = normalize_sensitivity(item.get("sensitivity"))
        if raw_dimension not in (None, "", "null") and bsp_dimension is None:
            logger.warning(
                "memory_extract_bsp_dimension_coerced kind=%s raw=%s",
                kind,
                raw_dimension,
            )
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="extract_coerced",
                metadata={
                    "kind": kind,
                    "raw_bsp_dimension": raw_dimension,
                    "coerced_to": None,
                },
            )

        validate_memory_kind(kind)

        conflicts = self._repo.find_conflicts(user_id_hash, kind, normalized_entities)
        row = self._repo.insert(
            user_id_hash=user_id_hash,
            kind=kind,
            content_ciphertext=self._dek.encrypt_for_user(user_id_hash, text),
            embedding=self._embed.embed_text(text),
            entities=display_entities,
            entities_normalized=normalized_entities,
            status=settings.MEMORY_DEFAULT_STATUS,
            bsp_dimension=bsp_dimension,
            scope_type=scope_type,
            scope_ref=scope_ref,
            sensitivity=sensitivity,
            importance=importance,
            source_message_id=assistant_message_id,
            source_conversation_id=thread_id,
            extraction_idempotency_key=idempotency_key,
        )

        for conflict in conflicts:
            self._repo.supersede(str(conflict["id"]), str(row["id"]), user_id_hash)
            write_memory_audit_log(
                user_id_hash=user_id_hash,
                actor_role=actor_role,
                action="supersede",
                memory_id=str(conflict["id"]),
                metadata={"superseded_by": str(row["id"])},
            )

        write_memory_audit_log(
            user_id_hash=user_id_hash,
            actor_role=actor_role,
            action="create",
            memory_id=str(row["id"]),
            metadata={"status": row["status"], "kind": kind},
        )
        return 1

    @staticmethod
    def _extract_text_from_bedrock(result: dict) -> str:
        for block in result.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text":
                return block.get("text", "")
        return ""

    @staticmethod
    def _parse_candidates(raw_text: str) -> list[dict]:
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return []
        memories = payload.get("memories") if isinstance(payload, dict) else None
        if not isinstance(memories, list):
            return []
        return [m for m in memories if isinstance(m, dict)]

    @staticmethod
    def _validate_candidate(item: dict, persona: str) -> bool:
        kind = item.get("kind")
        text = (item.get("text") or "").strip()
        if not kind or not text or kind in MANUAL_ONLY_KINDS:
            return False
        try:
            validate_memory_kind(kind)
        except Exception:
            return False
        if not kind_allowed_for_role(kind, persona):
            return False
        return True
