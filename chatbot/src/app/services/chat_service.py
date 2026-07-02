"""
Chat Service

Orchestrates the agentic Bedrock loop after context-plane turn assembly.
All prompt construction flows through ``prepare_chat_context`` + ``assemble_turn``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, AsyncGenerator, Optional, Dict, List
import asyncio
import logging
from app.models.schema import ChatRequest, ChatResponse
from app.infrastructure import BedrockClient
from app.domain.tools import get_tools_for_user
from app.services.tool_calling import ToolCallingService
from app.services.turn_assembly import assemble_turn

if TYPE_CHECKING:
    from app.observability.pipeline_telemetry import PipelineTimer
    from app.services.bsp_context_injector import BspContextInjector
    from app.services.chat_preparation import PreparedChatContext
    from app.services.peer_mention_context_injector import PeerMentionContextInjector

logger = logging.getLogger(__name__)


class ChatService:
    """
    Agentic chat loop — tool calling, streaming, and Bedrock invocation.

    Prompt / context assembly is delegated to the context plane pipeline
    (``chat_preparation`` + ``turn_assembly``).
    """

    def __init__(
        self,
        bedrock_client      : Optional[BedrockClient]       = None,
        tool_calling_service: Optional[ToolCallingService]  = None,
        bsp_injector         : Optional["BspContextInjector"] = None,
        peer_mention_injector: Optional["PeerMentionContextInjector"] = None,
    ):
        self.bedrock      = bedrock_client or BedrockClient()
        self.tool_service = tool_calling_service or ToolCallingService()
        self.bsp_injector = bsp_injector
        self.peer_mention_injector = peer_mention_injector
        self.max_iterations = 5

    async def handle_chat(
        self,
        request       : ChatRequest,
        prepared      : "PreparedChatContext",
        *,
        access_token  : Optional[str]  = None,
        interaction_meta: Optional[dict] = None,
        pipeline_timer: Optional["PipelineTimer"] = None,
    ) -> ChatResponse:
        self._validate_request(request)
        turn = await assemble_turn(
            request=request,
            prepared=prepared,
            access_token=access_token,
            bsp_injector=self.bsp_injector,
            interaction_meta=interaction_meta,
            pipeline_timer=pipeline_timer,
        )
        messages = turn["messages"]
        bedrock_system = turn["bedrock_system"]
        persona = turn["persona"]
        enable_tools = turn["enable_tools"]
        authorization = turn.get("authorization")

        iteration   = 0
        total_usage = {"input_tokens": 0, "output_tokens": 0}
        persona_tools = get_tools_for_user(persona, authorization) if enable_tools else []

        while iteration < self.max_iterations:
            iteration += 1

            result = self.bedrock.generate_chat_response(
                messages=messages,
                system_prompt=bedrock_system,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                tools=persona_tools,
            )

            usage = result.get("usage", {})
            total_usage["input_tokens"]  += usage.get("input_tokens", 0)
            total_usage["output_tokens"] += usage.get("output_tokens", 0)

            if interaction_meta is not None:
                self._accumulate_usage(interaction_meta, usage)
                if result.get("model"):
                    interaction_meta["model_id"] = result["model"]
                if result.get("correlation_id"):
                    interaction_meta["correlation_id"] = result["correlation_id"]

            messages.append({"role": "assistant", "content": result["content"]})
            stop_reason = result.get("stop_reason")

            if stop_reason == "end_turn":
                final_text = self._extract_text_from_content(result["content"])
                return ChatResponse(answer=final_text, model=result["model"], usage=total_usage)

            if stop_reason == "tool_use":
                tool_uses = self._extract_tool_uses(result["content"])

                if not tool_uses:
                    final_text = self._extract_text_from_content(result["content"])
                    return ChatResponse(
                        answer=final_text or "I encountered an issue processing your request.",
                        model=result["model"],
                        usage=total_usage,
                    )

                if interaction_meta is not None:
                    interaction_meta["tool_calls_count"] += len(tool_uses)

                tool_results = []
                for tool_use in tool_uses:
                    tool_name = tool_use.get("name")
                    tool_input = tool_use.get("input", {})
                    tool_use_id = tool_use.get("id")

                    logger.info(f"Executing tool: {tool_name} with input: {tool_input}")

                    tool_result = await self.tool_service.execute_tool(
                        tool_name        = tool_name,
                        tool_input       = tool_input,
                        access_token     = access_token,
                        user_role        = persona,
                        interaction_meta = interaction_meta,
                        authorization    = authorization,
                    )

                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": tool_use_id, "content": tool_result}
                    )

                messages.append({"role": "user", "content": tool_results})
            else:
                final_text = self._extract_text_from_content(result["content"])
                return ChatResponse(
                    answer=final_text or "I couldn't complete the request.",
                    model=result["model"],
                    usage=total_usage,
                )

        return ChatResponse(
            answer="I apologize, but I couldn't complete your request after multiple attempts.",
            model=self.bedrock.chat_model_id,
            usage=total_usage,
        )

    _TOOL_ACTIVITY_LABELS: Dict[str, str] = {
        "search_knowledge_base"    : "Searching knowledge base...",
        "get_client_snapshot"      : "Fetching client profile...",
        "get_session_notes_history": "Loading session history...",
        "get_corporations_list"    : "Fetching corporations...",
        "get_corporation_details"  : "Loading corporation details...",
    }

    async def handle_chat_stream(
        self,
        request        : ChatRequest,
        prepared       : "PreparedChatContext",
        *,
        access_token   : Optional[str]  = None,
        interaction_meta: Optional[dict] = None,
        pipeline_timer : Optional["PipelineTimer"] = None,
    ) -> AsyncGenerator:
        from app.utils.sse import TokenEvent, ToolActivityEvent, DoneEvent

        self._validate_request(request)
        turn = await assemble_turn(
            request=request,
            prepared=prepared,
            access_token=access_token,
            bsp_injector=self.bsp_injector,
            interaction_meta=interaction_meta,
            pipeline_timer=pipeline_timer,
        )
        messages = turn["messages"]
        bedrock_system = turn["bedrock_system"]
        persona = turn["persona"]
        enable_tools = turn["enable_tools"]
        authorization = turn.get("authorization")
        first_token_recorded = False

        total_usage: Dict[str, int] = {"input_tokens": 0, "output_tokens": 0}
        persona_tools = get_tools_for_user(persona, authorization) if enable_tools else []

        for iteration in range(1, self.max_iterations + 1):
            text_yielded = False
            tool_activity_yielded = False

            if pipeline_timer is not None:
                pipeline_timer.start("bedrock_ttft")

            stream = self.bedrock.generate_chat_stream(
                messages      = messages,
                system_prompt = bedrock_system,
                max_tokens    = request.max_tokens,
                temperature   = request.temperature,
                tools         = persona_tools,
            )

            complete_event: Optional[Dict] = None
            stream_iter = iter(stream)

            while True:
                chunk = await asyncio.to_thread(_next_stream_chunk, stream_iter)
                if chunk is None:
                    break

                if chunk["type"] == "text_delta":
                    if pipeline_timer is not None and not first_token_recorded:
                        pipeline_timer.end("bedrock_ttft")
                        ttft_ms = pipeline_timer.record_ttft_first_token()
                        if interaction_meta is not None:
                            interaction_meta["ttft_first_token_ms"] = ttft_ms
                        first_token_recorded = True
                    text_yielded = True
                    yield TokenEvent(text=chunk["text"])
                    await asyncio.sleep(0)

                elif chunk["type"] == "tool_use_start":
                    reset = text_yielded and not tool_activity_yielded
                    yield ToolActivityEvent(
                        action       = self._TOOL_ACTIVITY_LABELS.get(
                            chunk["name"], f"Using {chunk['name']}..."
                        ),
                        tool_name    = chunk["name"],
                        reset_stream = reset,
                    )
                    text_yielded = False
                    tool_activity_yielded = True
                    await asyncio.sleep(0)

                elif chunk["type"] == "complete":
                    if pipeline_timer is not None and not first_token_recorded:
                        pipeline_timer.end("bedrock_ttft", status="no_text_delta")
                    complete_event = chunk
                    break

            if complete_event is None:
                logger.error("[Stream] Bedrock stream ended without a complete event")
                yield DoneEvent(model=self.bedrock.chat_model_id, usage=total_usage)
                return

            usage = complete_event.get("usage", {})
            total_usage["input_tokens"]  += usage.get("input_tokens", 0)
            total_usage["output_tokens"] += usage.get("output_tokens", 0)

            if interaction_meta is not None:
                self._accumulate_usage(interaction_meta, usage)
                interaction_meta["model_id"] = self.bedrock.chat_model_id
                if complete_event.get("correlation_id"):
                    interaction_meta["correlation_id"] = complete_event["correlation_id"]

            content     = complete_event.get("content", [])
            stop_reason = complete_event.get("stop_reason")

            messages.append({"role": "assistant", "content": content})

            if stop_reason == "end_turn":
                yield DoneEvent(model=self.bedrock.chat_model_id, usage=total_usage)
                return

            if stop_reason == "tool_use":
                tool_uses = self._extract_tool_uses(content)

                if not tool_uses:
                    yield DoneEvent(model=self.bedrock.chat_model_id, usage=total_usage)
                    return

                if interaction_meta is not None:
                    interaction_meta["tool_calls_count"] = (
                        interaction_meta.get("tool_calls_count", 0) + len(tool_uses)
                    )

                tool_results: List[Dict] = []

                for tool_use in tool_uses:
                    tool_name    = tool_use.get("name")
                    tool_input   = tool_use.get("input", {})
                    tool_use_id  = tool_use.get("id")

                    logger.info(f"[Stream] Executing tool: {tool_name} | input: {tool_input}")

                    if not tool_activity_yielded:
                        yield ToolActivityEvent(
                            action    = self._TOOL_ACTIVITY_LABELS.get(
                                tool_name, f"Using {tool_name}..."
                            ),
                            tool_name = tool_name,
                        )
                        tool_activity_yielded = True

                    tool_result = await self.tool_service.execute_tool(
                        tool_name        = tool_name,
                        tool_input       = tool_input,
                        access_token     = access_token,
                        user_role        = persona,
                        interaction_meta = interaction_meta,
                        authorization    = authorization,
                    )
                    tool_results.append({
                        "type"       : "tool_result",
                        "tool_use_id": tool_use_id,
                        "content"    : tool_result,
                    })

                messages.append({"role": "user", "content": tool_results})
            else:
                if not text_yielded:
                    leftover = self._extract_text_from_content(content)
                    if leftover:
                        yield TokenEvent(text=leftover)
                        await asyncio.sleep(0)
                yield DoneEvent(model=self.bedrock.chat_model_id, usage=total_usage)
                return

        logger.warning("[Stream] Max iterations reached without end_turn")
        yield DoneEvent(model=self.bedrock.chat_model_id, usage=total_usage)

    @staticmethod
    def _accumulate_usage(interaction_meta: dict, usage: Dict) -> None:
        interaction_meta["input_tokens"] = (
            interaction_meta.get("input_tokens", 0) + usage.get("input_tokens", 0)
        )
        interaction_meta["output_tokens"] = (
            interaction_meta.get("output_tokens", 0) + usage.get("output_tokens", 0)
        )
        interaction_meta["cache_read_tokens"] = (
            interaction_meta.get("cache_read_tokens", 0)
            + usage.get("cache_read_input_tokens", 0)
        )
        interaction_meta["cache_creation_tokens"] = (
            interaction_meta.get("cache_creation_tokens", 0)
            + usage.get("cache_creation_input_tokens", 0)
        )

    def get_system_prompt(self) -> str:
        return self._get_system_prompt()

    def get_coach_persona_prompt(self) -> Optional[str]:
        """Return Bedrock-managed coach persona (required for coach turns)."""
        return self.bedrock.get_coach_persona_from_bedrock()

    def _extract_text_from_content(self, content: List[Dict]) -> str:
        text_parts = []
        for block in content:
            if block.get("type") == "text":
                text_parts.append(block.get("text", ""))
        return "\n".join(text_parts).strip()

    def _extract_tool_uses(self, content: List[Dict]) -> List[Dict]:
        return [block for block in content if block.get("type") == "tool_use"]

    def _validate_request(self, request: ChatRequest) -> None:
        valid_modes = ["quick", "deep_dive"]
        if request.chat_mode.lower() not in valid_modes:
            raise ValueError(f"Invalid chat_mode. Must be one of: {valid_modes}")

        valid_types = [
            "employee", "coach", "company_admin", "corporation_admin", "superadmin",
        ]
        if request.user_type and request.user_type.lower() not in valid_types:
            raise ValueError(f"Invalid user_type. Must be one of: {valid_types}")

    def _get_system_prompt(self) -> str:
        try:
            prompt = self.bedrock.get_prompt_from_bedrock()
            if prompt:
                return prompt
            logger.warning("Using fallback system prompt")
            return "You are a helpful AI assistant for Bispy Bot."
        except Exception as e:
            logger.error(f"Could not fetch system prompt from Bedrock: {e}")
            return "You are a helpful AI assistant."


def _next_stream_chunk(stream_iter):
    try:
        return next(stream_iter)
    except StopIteration:
        return None
