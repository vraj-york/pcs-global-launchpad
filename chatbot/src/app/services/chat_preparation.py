"""
Parallel pre-Bedrock context preparation (Phase 1–3).

Overlaps foundation prompt fetch, conversation window load, routing, and
warm-tier resolution so they do not stack sequentially on the critical path.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

from app.models.schema import ChatRequest
from app.observability.context_strategy import ContextStrategy, resolve_context_strategy
from app.observability.query_router import QueryPath, route_query
from app.utils.permissions import ChatAuthorizationContext

if TYPE_CHECKING:
    from app.observability.pipeline_telemetry import PipelineTimer
    from app.services.chat_service import ChatService
    from app.services.context_profile_service import ContextProfileService
    from app.services.conversation_window import ConversationWindowService
    from app.services.memory.retriever import MemoryRetriever
    from app.services.thread_service import ThreadService

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class PreparedChatContext:
    foundation_prompt: str
    coach_persona_override: Optional[str]
    conversation_history: Optional[list]
    user_personalization_block: Optional[str]
    user_personalization_prefix: Optional[str]
    peer_mentions_block: Optional[str]
    extracted_memories_block: Optional[str]
    memory_citations: list[dict]
    memories_retrieval_degraded: bool
    context_strategy: ContextStrategy
    warm_cache_hit: bool
    query_path: QueryPath
    enable_tools: bool
    route_reasons: list[str] = field(default_factory=list)
    speculative_warm_task: Optional[asyncio.Task] = None
    authorization: Optional["ChatAuthorizationContext"] = None


async def _load_conversation_window(
    request: ChatRequest,
    conv_window: Optional["ConversationWindowService"],
    thread_service: Optional["ThreadService"],
) -> Optional[list]:
    if not request.thread_id:
        return request.conversation_history

    if conv_window:
        return await asyncio.to_thread(
            conv_window.load,
            str(request.thread_id),
            request.chat_mode,
        )

    if thread_service:
        return await asyncio.to_thread(
            thread_service.load_history_for_thread,
            str(request.thread_id),
        )

    return request.conversation_history


async def prepare_chat_context(
    *,
    request: ChatRequest,
    access_token: Optional[str],
    chat_service: "ChatService",
    context_profile: Optional["ContextProfileService"],
    conv_window: Optional["ConversationWindowService"],
    thread_service: Optional["ThreadService"],
    memory_retriever: Optional["MemoryRetriever"],
    timer: "PipelineTimer",
    interaction_meta: Optional[dict],
    authorization: Optional[ChatAuthorizationContext] = None,
) -> PreparedChatContext:
    persona = request.user_type or "employee"

    timer.start("route_query")
    route = route_query(
        persona=persona,
        chat_mode=request.chat_mode,
        message=request.message,
        mentions_present=bool(request.mentions),
        client_id=request.client_id,
        has_client_snapshot=bool(request.client_snapshot),
    )
    timer.end("route_query")

    if route.path == QueryPath.FAST:
        strategy = ContextStrategy.NONE
        enable_tools = False
    else:
        strategy = resolve_context_strategy(
            persona=persona,
            chat_mode=request.chat_mode,
            mentions_present=bool(request.mentions),
        )
        enable_tools = True

    if interaction_meta is not None:
        interaction_meta["context_strategy"] = strategy.value
        interaction_meta["query_path"] = route.path.value
        interaction_meta["route_reasons"] = route.reasons
        interaction_meta["route_confidence"] = route.confidence

    timer.start("prepare_context")

    foundation_task = asyncio.create_task(
        asyncio.to_thread(chat_service.get_system_prompt)
    )
    history_task = asyncio.create_task(
        _load_conversation_window(request, conv_window, thread_service)
    )
    coach_persona_task = (
        asyncio.create_task(asyncio.to_thread(chat_service.get_coach_persona_prompt))
        if persona == "coach"
        else None
    )

    warm_task = None
    if route.path == QueryPath.DEEP and context_profile is not None:
        warm_task = asyncio.create_task(
            context_profile.resolve_for_turn(
                request=request,
                persona=persona,
                access_token=access_token,
                strategy=strategy,
                interaction_meta=interaction_meta,
            )
        )

    gather_args: list = [foundation_task, history_task]
    if coach_persona_task is not None:
        gather_args.append(coach_persona_task)
    if warm_task is not None:
        gather_args.append(warm_task)

    mention_labels = [m.label for m in (request.mentions or []) if m.label]
    memory_task = None
    if memory_retriever is not None:
        timer.start("memory_retrieve")
        memory_task = asyncio.create_task(
            memory_retriever.retrieve_for_turn(
                user_id_hash=(
                    interaction_meta.get("_user_id_hash")
                    if interaction_meta
                    else "unknown"
                ),
                message=request.message,
                persona=persona,
                chat_mode=request.chat_mode,
                query_path=route.path,
                mention_labels=mention_labels,
            )
        )
        gather_args.append(memory_task)

    gathered = await asyncio.gather(*gather_args)

    foundation_prompt = gathered[0]
    history = gathered[1]
    index = 2
    coach_persona_override = None
    if coach_persona_task is not None:
        coach_persona_override = gathered[index]
        index += 1

    user_block: Optional[str] = None
    user_prefix: Optional[str] = None
    peer_block: Optional[str] = None
    warm_cache_hit = False
    if warm_task is not None:
        user_block, user_prefix, peer_block, warm_cache_hit = gathered[index]
        index += 1

    extracted_memories_block: Optional[str] = None
    memory_citations: list[dict] = []
    memories_retrieval_degraded = False
    if memory_task is not None:
        memory_result = gathered[index]
        extracted_memories_block = memory_result.xml_block or None
        memory_citations = memory_result.citations
        memories_retrieval_degraded = memory_result.degraded
        retrieve_status = "degraded" if memory_result.degraded else "ok"
        if memory_result.retrieved_count <= 0:
            retrieve_status = "empty"
            logger.info(
                "memory_retrieve_empty user_id_hash=%s query_path=%s chat_mode=%s",
                interaction_meta.get("_user_id_hash") if interaction_meta else "unknown",
                route.path.value,
                request.chat_mode,
            )
        timer.end(
            "memory_retrieve",
            status=retrieve_status,
        )
        if interaction_meta is not None:
            interaction_meta["memory_citations"] = memory_citations
            interaction_meta["memories_retrieved_count"] = memory_result.retrieved_count
            interaction_meta["memory_degraded"] = memory_result.degraded
        index += 1

    speculative_task: Optional[asyncio.Task] = None
    if route.speculative_warm and context_profile is not None and access_token:
        speculative_user_id = (
            interaction_meta.get("_user_id_hash") if interaction_meta else None
        )
        speculative_task = asyncio.create_task(
            context_profile.prefetch_self(access_token, speculative_user_id)
        )
        if interaction_meta is not None:
            interaction_meta["speculative_warm_prefetch"] = True

    timer.end("prepare_context")

    return PreparedChatContext(
        foundation_prompt=foundation_prompt,
        coach_persona_override=coach_persona_override,
        conversation_history=history or request.conversation_history,
        user_personalization_block=user_block,
        user_personalization_prefix=user_prefix,
        peer_mentions_block=peer_block,
        extracted_memories_block=extracted_memories_block,
        memory_citations=memory_citations,
        memories_retrieval_degraded=memories_retrieval_degraded,
        context_strategy=strategy,
        warm_cache_hit=warm_cache_hit,
        query_path=route.path,
        enable_tools=enable_tools,
        route_reasons=route.reasons,
        speculative_warm_task=speculative_task,
        authorization=authorization,
    )
