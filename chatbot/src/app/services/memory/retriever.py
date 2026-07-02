"""Hybrid memory retrieval for the chat critical path."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

from app.config import settings
from app.domain.memory_prompts import format_memories_xml
from app.services.memory.user_dek_crypto import UserDekCrypto
from app.repositories.memory_repository import MemoryRepository
from app.services.memory.embedding_service import MemoryEmbeddingService
from app.services.memory.entity_normalizer import extract_query_entities
from app.services.memory.memory_policy import resolve_retrieve_policy
from app.observability.query_router import QueryPath

logger = logging.getLogger(__name__)

RRF_K = 60


@dataclass(slots=True)
class MemoryRetrieveResult:
    xml_block: str = ""
    citations: list[dict] = field(default_factory=list)
    degraded: bool = False
    retrieved_count: int = 0


class MemoryRetriever:
    def __init__(
        self,
        *,
        memory_repo: MemoryRepository,
        embedding_service: MemoryEmbeddingService,
        user_dek_crypto: UserDekCrypto,
    ) -> None:
        self._repo = memory_repo
        self._embed = embedding_service
        self._dek = user_dek_crypto

    async def retrieve_for_turn(
        self,
        *,
        user_id_hash: str,
        message: str,
        persona: str,
        chat_mode: str,
        query_path: QueryPath,
        mention_labels: Optional[list[str]] = None,
    ) -> MemoryRetrieveResult:
        if not settings.ENABLE_MEMORY_RETRIEVAL:
            return MemoryRetrieveResult(degraded=True)

        if user_id_hash == "unknown":
            return MemoryRetrieveResult()

        policy = resolve_retrieve_policy(
            persona=persona,
            chat_mode=chat_mode,
            query_path=query_path,
        )
        if policy.top_k <= 0:
            return MemoryRetrieveResult()

        timeout_s = settings.MEMORY_RETRIEVE_TIMEOUT_MS / 1000.0
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    self._retrieve_semantic_sync,
                    user_id_hash,
                    message,
                    policy.top_k,
                    policy.allowed_kinds,
                    mention_labels or [],
                ),
                timeout=timeout_s,
            )
            if result.retrieved_count > 0:
                logger.info(
                    "memory_retrieve_ok user_id_hash=%s count=%s degraded=%s",
                    user_id_hash,
                    result.retrieved_count,
                    result.degraded,
                )
            return result
        except asyncio.TimeoutError:
            logger.warning(
                "memory_retrieve_timeout user_id_hash=%s timeout_ms=%s",
                user_id_hash,
                settings.MEMORY_RETRIEVE_TIMEOUT_MS,
            )
            fallback = await asyncio.to_thread(
                self._retrieve_recent_fallback_sync,
                user_id_hash,
                policy.top_k,
                policy.allowed_kinds,
            )
            if fallback.retrieved_count > 0:
                logger.info(
                    "memory_retrieve_fallback_ok user_id_hash=%s count=%s",
                    user_id_hash,
                    fallback.retrieved_count,
                )
            return fallback
        except Exception as exc:
            logger.warning("memory_retrieve_failed error=%s", exc, exc_info=True)
            return MemoryRetrieveResult(degraded=True)

    def _retrieve_semantic_sync(
        self,
        user_id_hash: str,
        message: str,
        top_k: int,
        allowed_kinds: frozenset[str],
        mention_labels: list[str],
    ) -> MemoryRetrieveResult:
        query_embedding = self._embed.embed_text(message)
        entity_keys = extract_query_entities(message, mention_labels)

        semantic_rows = self._repo.semantic_search(
            user_id_hash=user_id_hash,
            query_embedding=query_embedding,
            allowed_kinds=allowed_kinds,
            limit=top_k,
        )
        entity_rows: list[dict] = []
        if entity_keys:
            entity_rows = self._repo.entity_search(
                user_id_hash=user_id_hash,
                entity_keys=entity_keys,
                allowed_kinds=allowed_kinds,
                limit=top_k,
            )

        ranked_rows = self._rrf_fuse(semantic_rows, entity_rows, top_k=top_k)
        baseline_rows = self._load_baseline_rows(
            user_id_hash=user_id_hash,
            allowed_kinds=allowed_kinds,
            limit=max(top_k * 2, top_k),
        )
        merged_rows = self._merge_with_baseline(ranked_rows, baseline_rows, top_k=top_k)
        if not merged_rows:
            return MemoryRetrieveResult()

        return self._build_result_from_rows(
            user_id_hash=user_id_hash,
            rows=merged_rows,
            degraded=False,
        )

    def _load_baseline_rows(
        self,
        *,
        user_id_hash: str,
        allowed_kinds: frozenset[str],
        limit: int,
    ) -> list[dict]:
        rows = self._repo.list_for_user(
            user_id_hash,
            status="confirmed",
            limit=limit,
        )
        return [row for row in rows if row.get("kind") in allowed_kinds]

    @staticmethod
    def _merge_with_baseline(
        ranked_rows: list[dict],
        baseline_rows: list[dict],
        *,
        top_k: int,
    ) -> list[dict]:
        """Semantic ranking first; backfill with recent confirmed so recall never misses."""
        seen: set[str] = set()
        merged: list[dict] = []

        for row in ranked_rows:
            memory_id = str(row["id"])
            if memory_id in seen:
                continue
            seen.add(memory_id)
            merged.append(row)
            if len(merged) >= top_k:
                return merged

        for row in baseline_rows:
            memory_id = str(row["id"])
            if memory_id in seen:
                continue
            seen.add(memory_id)
            merged.append(row)
            if len(merged) >= top_k:
                break

        return merged

    def _retrieve_recent_fallback_sync(
        self,
        user_id_hash: str,
        top_k: int,
        allowed_kinds: frozenset[str],
    ) -> MemoryRetrieveResult:
        """Recent confirmed memories when semantic path exceeds the latency budget."""
        filtered = self._load_baseline_rows(
            user_id_hash=user_id_hash,
            allowed_kinds=allowed_kinds,
            limit=top_k,
        )
        if not filtered:
            return MemoryRetrieveResult(degraded=True)
        return self._build_result_from_rows(
            user_id_hash=user_id_hash,
            rows=filtered[:top_k],
            degraded=True,
        )

    def _build_result_from_rows(
        self,
        *,
        user_id_hash: str,
        rows: list[dict],
        degraded: bool,
    ) -> MemoryRetrieveResult:
        decrypted: list[dict] = []
        memory_ids: list[str] = []
        for row in rows:
            try:
                text = self._dek.decrypt_for_user(user_id_hash, row["content_ciphertext"])
            except Exception as exc:
                logger.warning(
                    "memory_decrypt_skip id=%s error=%s",
                    str(row.get("id")),
                    exc,
                )
                continue
            memory_ids.append(str(row["id"]))
            decrypted.append({
                "id": str(row["id"]),
                "kind": row["kind"],
                "bsp_dimension": row.get("bsp_dimension"),
                "text": text,
                "importance": row.get("importance", 0.5),
            })

        if memory_ids:
            try:
                self._repo.mark_retrieved(memory_ids)
            except Exception as exc:
                logger.warning("memory_mark_retrieved_failed error=%s", exc)

        if not decrypted:
            return MemoryRetrieveResult(degraded=degraded)

        citations = [
            {
                "id": item["id"],
                "kind": item["kind"],
                "snippet": item["text"][:120],
            }
            for item in decrypted
        ]
        xml_block = format_memories_xml(decrypted)

        return MemoryRetrieveResult(
            xml_block=xml_block,
            citations=citations,
            degraded=degraded,
            retrieved_count=len(decrypted),
        )

    @staticmethod
    def _rrf_fuse(
        semantic_rows: list[dict],
        entity_rows: list[dict],
        *,
        top_k: int,
    ) -> list[dict]:
        scores: dict[str, float] = {}
        rows_by_id: dict[str, dict] = {}

        for rank, row in enumerate(semantic_rows):
            mid = str(row["id"])
            rows_by_id[mid] = row
            scores[mid] = scores.get(mid, 0.0) + 1.0 / (RRF_K + rank + 1)

        for rank, row in enumerate(entity_rows):
            mid = str(row["id"])
            rows_by_id[mid] = row
            scores[mid] = scores.get(mid, 0.0) + 1.0 / (RRF_K + rank + 1)

        ordered_ids = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
        return [rows_by_id[mid] for mid in ordered_ids[:top_k]]
