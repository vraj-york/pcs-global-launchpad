"""
Turn assembly — single context-plane path for every chat mode.

All routes (unified, stream, legacy aliases) prepare context via
``prepare_chat_context`` then assemble the Bedrock payload here.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from app.config import settings
from app.domain.context_plane import ContextPlaneResult, build_context_plane
from app.models.schema import ChatRequest
from app.observability.context_strategy import ContextStrategy
from app.utils.context import trim_to_window

if TYPE_CHECKING:
    from app.observability.pipeline_telemetry import PipelineTimer
    from app.services.bsp_context_injector import BspContextInjector
    from app.services.chat_preparation import PreparedChatContext


def compose_user_message(
    *,
    message: str,
    date_awareness: str,
    prefix: Optional[str],
    strategy: ContextStrategy,
) -> str:
    parts = [date_awareness]
    if strategy == ContextStrategy.USER_MESSAGE_PREFIX and prefix:
        parts.append(prefix)
    parts.append(message)
    return "\n\n---\n\n".join(parts)


async def assemble_turn(
    *,
    request: ChatRequest,
    prepared: "PreparedChatContext",
    access_token: Optional[str],
    bsp_injector: Optional["BspContextInjector"],
    interaction_meta: Optional[dict],
    pipeline_timer: Optional["PipelineTimer"],
) -> dict:
    """
    Build Bedrock messages + cached system payload from prepared context.

    Returns dict with persona, bedrock_system, messages, enable_tools, plane.
    """
    persona = request.user_type or "employee"
    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if pipeline_timer is not None:
        pipeline_timer.start("prompt_build")

    foundation_prompt = request.system_prompt or prepared.foundation_prompt
    enable_tools = prepared.enable_tools

    bsp_profile_block = None
    if (
        enable_tools
        and bsp_injector
        and persona == "coach"
        and request.client_id
    ):
        bsp_profile_block = await bsp_injector.get_behavioral_profile_block(
            client_id=request.client_id,
            access_token=access_token,
        )

    plane = build_context_plane(
        foundation_prompt=foundation_prompt,
        chat_mode=request.chat_mode,
        user_type=persona,
        coach_persona_override=prepared.coach_persona_override,
        use_coach_shell=settings.USE_COACH_PERSONA_SHELL,
        client_snapshot=request.client_snapshot,
        client_id=request.client_id if enable_tools else None,
        bsp_profile_block=bsp_profile_block,
        user_personalization_block=prepared.user_personalization_block,
        peer_mentions_block=prepared.peer_mentions_block,
        extracted_memories_block=prepared.extracted_memories_block,
        current_date=current_date,
    )

    trimmed_history = trim_to_window(
        prepared.conversation_history,
        session_id=str(request.session_id) if request.session_id else None,
    )
    user_content = compose_user_message(
        message=request.message,
        date_awareness=plane.date_awareness,
        prefix=prepared.user_personalization_prefix,
        strategy=prepared.context_strategy,
    )
    messages = list(trimmed_history or [])
    messages.append({"role": "user", "content": user_content})

    if interaction_meta is not None:
        interaction_meta["context_strategy"] = prepared.context_strategy.value
        interaction_meta["warm_cache_hit"] = prepared.warm_cache_hit
        interaction_meta["query_path"] = prepared.query_path.value
        interaction_meta["route_reasons"] = prepared.route_reasons
        interaction_meta["memories_retrieval_degraded"] = prepared.memories_retrieval_degraded
        if prepared.memory_citations:
            interaction_meta["memory_citations"] = prepared.memory_citations
        interaction_meta["system_prompt_tokens_est"] = max(
            1,
            len(plane.legacy_combined) // 4,
        )

    if pipeline_timer is not None:
        pipeline_timer.end("prompt_build")

    return {
        "persona": persona,
        "bedrock_system": plane.bedrock_system,
        "messages": messages,
        "enable_tools": enable_tools,
        "plane": plane,
        "authorization": prepared.authorization,
    }
