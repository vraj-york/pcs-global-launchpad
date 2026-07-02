import asyncio
from unittest.mock import AsyncMock, MagicMock

from app.observability.context_strategy import ContextStrategy
from app.observability.pipeline_telemetry import PipelineTimer, bind_request_context
from app.observability.query_router import QueryPath
from app.models.schema import ChatRequest
from app.services.chat_preparation import prepare_chat_context
from app.services.context_profile_service import ContextProfileService


def test_prepare_chat_context_fast_path_skips_warm_http():
    request_id, trace_id = bind_request_context()
    timer = PipelineTimer(request_id=request_id, trace_id=trace_id)

    chat_service = MagicMock()
    chat_service.get_system_prompt.return_value = "Foundation prompt"
    chat_service.get_coach_persona_prompt.return_value = None

    bsp = MagicMock()
    bsp.get_user_personalization_for_turn = AsyncMock()
    context_profile = ContextProfileService(bsp_injector=bsp, peer_mention_injector=None)

    request = ChatRequest(
        message="Hello!",
        chat_mode="quick",
        user_type="employee",
    )

    prepared = asyncio.run(
        prepare_chat_context(
            request=request,
            access_token="token",
            chat_service=chat_service,
            context_profile=context_profile,
            conv_window=None,
            thread_service=None,
            timer=timer,
            interaction_meta={},
            memory_retriever=None,
        )
    )

    assert prepared.query_path == QueryPath.FAST
    assert prepared.enable_tools is False
    assert prepared.context_strategy == ContextStrategy.NONE
    bsp.get_user_personalization_for_turn.assert_not_called()


def test_prepare_chat_context_deep_path_resolves_warm_context():
    request_id, trace_id = bind_request_context()
    timer = PipelineTimer(request_id=request_id, trace_id=trace_id)

    chat_service = MagicMock()
    chat_service.get_system_prompt.return_value = "Foundation prompt"
    chat_service.get_coach_persona_prompt.return_value = None

    bsp = MagicMock()
    bsp.get_user_personalization_for_turn = AsyncMock(
        return_value=(
            None,
            "Style: Pioneer — Moves quickly.",
            {"profile_available": True, "degraded": False, "cache_hit": False},
        )
    )
    context_profile = ContextProfileService(bsp_injector=bsp, peer_mention_injector=None)

    request = ChatRequest(
        message="What is my BSP style?",
        chat_mode="quick",
        user_type="employee",
    )

    prepared = asyncio.run(
        prepare_chat_context(
            request=request,
            access_token="token",
            chat_service=chat_service,
            context_profile=context_profile,
            conv_window=None,
            thread_service=None,
            timer=timer,
            interaction_meta={},
            memory_retriever=None,
        )
    )

    assert prepared.query_path == QueryPath.DEEP
    assert prepared.enable_tools is True
    assert prepared.user_personalization_prefix.startswith("Style: Pioneer")
    bsp.get_user_personalization_for_turn.assert_awaited_once()
