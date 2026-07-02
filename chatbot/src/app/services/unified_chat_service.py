"""
Unified Chat Service — Pattern 1: Retrieval as a Tool

The LLM receives all tools (search_knowledge_base, get_corporations_list,
get_corporation_details) in a single call and decides which to invoke based on
the user's question. No pre-classification step is needed.

Flow per request:
  1. Auth context + RBAC check
  2. Single ChatService call (agentic loop with full tool shed)
  3. Audit log written in finally — guaranteed regardless of outcome

The search_knowledge_base tool handles RBAC-filtered vector retrieval internally.
If restricted content is detected, it raises RBACDeniedError which propagates here
and is classified as outcome=denied/rbac_policy in the audit log.
"""

import asyncio
import time
import logging
from typing import TYPE_CHECKING, AsyncGenerator, Optional

from app.infrastructure import BedrockClient
from app.services.chat_service import ChatService
from app.models.schema import ChatRequest, ChatResponse, MemoryCitationRef
from app.utils.sse import (
    DoneEvent,
    ErrorEvent,
    SuggestionsEvent,
    ThinkingStepEvent,
    TokenEvent,
    ToolActivityEvent,
    ThreadCreatedEvent,
    format_sse,
)
from app.services.follow_up_suggestion_service import (
    FollowUpSuggestionResult,
    generate_follow_up_dynamic_queries,
)
from app.domain.exceptions import (
    RBACDeniedError,
    ContentFilterDeniedError,
    UpstreamTimeoutError,
    UpstreamFailureError,
)
from app.utils.auth_context import extract_auth_context, check_rbac
from app.services.authorization_service import AuthorizationResolver
from app.services.audit import build_and_validate_log, write_audit_log
from app.observability.pipeline_telemetry import (
    PipelineTimer,
    bind_request_context,
    emit_pipeline_telemetry,
)
from app.services.chat_preparation import prepare_chat_context
from app.utils.cache_keys import personalization_cache_key

if TYPE_CHECKING:
    from app.services.context_profile_service import ContextProfileService
    from app.services.thread_service import ThreadService
    from app.services.conversation_window import ConversationWindowService
    from app.services.summary_maintainer import SummaryMaintainerService
    from app.services.memory.retriever import MemoryRetriever
    from app.services.memory.extraction_service import MemoryExtractionService

logger = logging.getLogger(__name__)

# Maps ChatRequest.chat_mode values → audit schema ChatModeEnum strings
_CHAT_MODE_AUDIT_MAP: dict[str, str] = {
    "quick"    : "quick_mode",
    "deep_dive": "deep_mode",
}


class UnifiedChatService:
    """
    Single-pipeline chat service.

    Owns the audit guarantee: every interaction writes an audit row in the
    finally block regardless of outcome.
    """

    def __init__(
        self,
        bedrock_client     : Optional[BedrockClient]               = None,
        chat_service       : Optional[ChatService]                 = None,
        thread_service     : Optional["ThreadService"]             = None,
        conv_window        : Optional["ConversationWindowService"] = None,
        summary_maintainer : Optional["SummaryMaintainerService"]  = None,
        context_profile    : Optional["ContextProfileService"]   = None,
        memory_retriever   : Optional["MemoryRetriever"]         = None,
        memory_extractor   : Optional["MemoryExtractionService"] = None,
        authorization_resolver : Optional[AuthorizationResolver] = None,
    ):
        self.bedrock            = bedrock_client or BedrockClient()
        # Read-only RBAC resolver — resolves the user's enabled submodules so the
        # agentic loop only exposes data tools the logged-in user may read.
        self.authorization_resolver = authorization_resolver or AuthorizationResolver()
        self.chat_service       = chat_service   or ChatService(bedrock_client=self.bedrock)
        self.context_profile    = context_profile
        self.memory_retriever   = memory_retriever
        self.memory_extractor   = memory_extractor
        # Sprint 2: CRUD + message persistence (still used for persist/CRUD ops)
        self.thread_service     = thread_service
        # Sprint 3: replaces thread_service.load_history_for_thread() with a
        # richer window that prepends summary context when available.
        self.conv_window        = conv_window
        # Sprint 3: called after DoneEvent to regenerate summary if thread is long.
        self.summary_maintainer = summary_maintainer

    def _schedule_personalization_prefetch(
        self,
        access_token: Optional[str],
        user_id_hash: Optional[str] = None,
    ) -> None:
        if not access_token:
            return
        if self.context_profile is not None:
            asyncio.create_task(
                self.context_profile.prefetch_self(access_token, user_id_hash)
            )
            return
        injector = self.chat_service.bsp_injector
        if injector is None:
            return
        cache_key = personalization_cache_key(access_token, user_id_hash)
        asyncio.create_task(
            injector.prefetch_user_personalization(
                access_token=access_token,
                cache_key=cache_key,
            )
        )

    async def _ensure_thread(
        self,
        request: ChatRequest,
        auth,
        access_token: Optional[str],
        *,
        emit_thread_event=None,
    ) -> ChatRequest:
        if not self.thread_service or request.thread_id:
            return request

        new_thread = await asyncio.to_thread(
            self.thread_service.get_or_create_thread,
            user_id_hash=auth.user_id,
            thread_id=None,
            persona=request.user_type or "employee",
            chat_mode=request.chat_mode,
        )
        updated = request.model_copy(update={"thread_id": new_thread["id"]})
        if emit_thread_event is not None:
            await emit_thread_event(new_thread)
        else:
            logger.info(
                "auto_thread_created",
                extra={"thread_id": str(new_thread["id"])},
            )
        self._schedule_personalization_prefetch(access_token, auth.user_id)
        return updated

    def _run_memory_extraction(
        self,
        *,
        auth,
        request: ChatRequest,
        prepared_context,
        assistant_message_id: Optional[str],
        assistant_text: str,
    ) -> None:
        if not self.memory_extractor or not assistant_message_id:
            return
        try:
            self.memory_extractor.extract_if_eligible(
                user_id_hash=auth.user_id,
                actor_role=auth.role,
                persona=request.user_type or "employee",
                chat_mode=request.chat_mode,
                query_path=prepared_context.query_path,
                user_message=request.message,
                assistant_message=assistant_text,
                assistant_message_id=assistant_message_id,
                thread_id=str(request.thread_id) if request.thread_id else None,
                client_id=request.client_id,
                existing_bsp_summary=prepared_context.user_personalization_block,
            )
        except Exception as exc:
            logger.error("memory_extraction_failed", extra={"error": str(exc)})

    @staticmethod
    def _memory_citations_from_meta(interaction_meta: dict) -> Optional[list[MemoryCitationRef]]:
        raw = interaction_meta.get("memory_citations") or []
        if not raw:
            return None
        return [
            MemoryCitationRef(
                id=item["id"],
                kind=item["kind"],
                snippet=item.get("snippet", ""),
            )
            for item in raw
            if isinstance(item, dict) and item.get("id")
        ]

    async def handle_unified_chat(
        self, request: ChatRequest, access_token: Optional[str] = None
    ) -> ChatResponse:
        """
        Handle a chat request through the single-pipeline pattern.

        The agentic loop inside ChatService drives the interaction. The LLM
        decides which tools to call (including knowledge base retrieval) based
        on the user's question — no pre-classification is performed here.

        Audit note: user_id == "unknown" when no access token is present
        (TEMPORARY phase). The audit write is skipped in that case and resumes
        automatically once production JWT decoding is enabled.
        """
        start_time = time.monotonic()
        request_id, trace_id = bind_request_context()
        pipeline_timer = PipelineTimer(request_id=request_id, trace_id=trace_id)
        prepared_context = None

        # Mutable accumulator — written by the agentic loop and tool calls,
        # read back here after the interaction completes for audit population.
        interaction_meta: dict = {
            "retrieved_source_ids" : [],
            "retrieved_chunk_count": 0,
            "tool_calls_count"     : 0,
            "input_tokens"         : 0,
            "output_tokens"        : 0,
            "model_id"             : None,
            "correlation_id"       : None,
            "user_personalization_available": False,
            "user_personalization_degraded" : False,
            "peer_mentions_requested": 0,
            "peer_mentions_resolved" : 0,
            "peer_mentions_degraded" : 0,
        }

        # Audit defaults — overwritten as the interaction progresses.
        # Starts with worst-case values so finally always has something meaningful.
        log_data: dict = {
            "user_id"              : "unknown",
            "role"                 : "end_user",
            "session_id"           : None,
            "chat_mode"            : _CHAT_MODE_AUDIT_MAP.get(request.chat_mode, "quick_mode"),
            "model_id"             : None,
            "outcome"              : "error",
            "denial_reason"        : None,
            "error_code"           : "UNKNOWN",
            "retrieved_source_ids" : [],
            "retrieved_chunk_count": 0,
            "tool_calls_count"     : 0,
            "input_tokens"         : None,
            "output_tokens"        : None,
            "latency_ms"           : None,
            "correlation_id"       : None,
        }

        try:
            pipeline_timer.start("auth")
            auth = extract_auth_context(
                access_token  = access_token,
                fallback_role = "employee",
                session_id    = request.session_id,
            )
            # Persona is authoritative from the JWT — the client-supplied user_type
            # is never trusted for authorization. Overwrite it so the whole
            # downstream pipeline derives tone, tools, and scope from real identity.
            request = request.model_copy(update={"user_type": auth.role})
            log_data["user_id"]    = auth.user_id
            log_data["role"]       = auth.audit_role
            log_data["session_id"] = str(auth.session_id)
            interaction_meta["_user_id_hash"] = auth.user_id
            pipeline_timer.end("auth")

            pipeline_timer.start("rbac")
            check_rbac(auth.role, action="query")
            authorization = await self.authorization_resolver.resolve(
                access_token=access_token,
                persona=auth.role,
            )
            interaction_meta["rbac_super_admin"] = authorization.is_super_admin
            interaction_meta["rbac_degraded"] = authorization.degraded
            pipeline_timer.end("rbac")

            pipeline_timer.start("thread_setup")
            try:
                request = await self._ensure_thread(
                    request,
                    auth,
                    access_token,
                )
                pipeline_timer.end("thread_setup")
            except Exception as thread_exc:
                pipeline_timer.end("thread_setup", status="error", error_type=type(thread_exc).__name__)
                logger.error(
                    "auto_thread_create_failed",
                    extra={"error": str(thread_exc)},
                )

            prepared_context = await prepare_chat_context(
                request=request,
                access_token=access_token,
                chat_service=self.chat_service,
                context_profile=self.context_profile,
                conv_window=self.conv_window,
                thread_service=self.thread_service,
                memory_retriever=self.memory_retriever,
                timer=pipeline_timer,
                interaction_meta=interaction_meta,
                authorization=authorization,
            )

            logger.info(f"Processing query: '{request.message[:60]}...'")
            response = await self.chat_service.handle_chat(
                request,
                prepared_context,
                access_token     = access_token,
                interaction_meta = interaction_meta,
                pipeline_timer   = pipeline_timer,
            )

            #  Step 3.5: Message persistence (Thread & Trim) 
            assistant_message_id: Optional[str] = None
            if self.thread_service and request.thread_id:
                try:
                    assistant_message_id = self.thread_service.persist_message_pair(
                        thread_id      = str(request.thread_id),
                        user_text      = request.message,
                        assistant_text = response.answer,
                        tokens_in      = interaction_meta.get("input_tokens") or None,
                        tokens_out     = interaction_meta.get("output_tokens") or None,
                    )
                except Exception as persist_exc:
                    logger.error(
                        "thread_persist_failed",
                        extra={"error": str(persist_exc), "thread_id": str(request.thread_id)},
                    )

            #  Step 3.6: Summary maintenance 
            if self.summary_maintainer and request.thread_id:
                try:
                    self.summary_maintainer.refresh_if_needed(str(request.thread_id))
                except Exception as sm_exc:
                    logger.error(
                        "summary_refresh_failed",
                        extra={"error": str(sm_exc), "thread_id": str(request.thread_id)},
                    )

            #  Step 3.7: Memory extraction (candidate rows) 
            self._run_memory_extraction(
                auth=auth,
                request=request,
                prepared_context=prepared_context,
                assistant_message_id=assistant_message_id,
                assistant_text=response.answer,
            )

            log_data["outcome"]               = "answered"
            log_data["error_code"]            = None
            log_data["retrieved_source_ids"]  = interaction_meta["retrieved_source_ids"]
            log_data["retrieved_chunk_count"] = interaction_meta["retrieved_chunk_count"]
            log_data["tool_calls_count"]      = interaction_meta["tool_calls_count"]
            log_data["input_tokens"]          = interaction_meta["input_tokens"] or None
            log_data["output_tokens"]         = interaction_meta["output_tokens"] or None
            log_data["model_id"]              = interaction_meta["model_id"]
            log_data["correlation_id"]        = interaction_meta["correlation_id"]
            citations = self._memory_citations_from_meta(interaction_meta)
            if citations:
                response.memory_citations = citations
            return response

        except RBACDeniedError as e:
            logger.warning(f"RBAC denied: {e}")
            log_data["outcome"]               = "denied"
            log_data["denial_reason"]         = "rbac_policy"
            log_data["error_code"]            = None
            log_data["retrieved_source_ids"]  = interaction_meta["retrieved_source_ids"]
            log_data["retrieved_chunk_count"] = interaction_meta["retrieved_chunk_count"]
            log_data["tool_calls_count"]      = interaction_meta["tool_calls_count"]
            log_data["input_tokens"]          = interaction_meta["input_tokens"] or None
            log_data["output_tokens"]         = interaction_meta["output_tokens"] or None
            log_data["model_id"]              = interaction_meta["model_id"]
            log_data["correlation_id"]        = interaction_meta["correlation_id"]
            return ChatResponse(
                answer="You do not have permission to access this information.",
                model ="rbac-filter",
                usage ={"input_tokens": 0, "output_tokens": 0},
            )

        except ContentFilterDeniedError as e:
            logger.warning(f"Content filter denied: {e}")
            log_data["outcome"]       = "denied"
            log_data["denial_reason"] = "content_filter"
            log_data["error_code"]    = None
            return ChatResponse(
                answer="Your request was blocked by content policy.",
                model ="guardrail",
                usage ={"input_tokens": 0, "output_tokens": 0},
            )

        except UpstreamTimeoutError as e:
            logger.error(f"Upstream timeout: {e}")
            log_data["outcome"]    = "error"
            log_data["error_code"] = "TIMEOUT"
            return ChatResponse(
                answer="The request timed out. Please try again.",
                model ="error",
                usage ={"input_tokens": 0, "output_tokens": 0},
            )

        except UpstreamFailureError as e:
            logger.error(f"Upstream failure: {e}")
            log_data["outcome"]    = "error"
            log_data["error_code"] = "UPSTREAM_FAILURE"
            return ChatResponse(
                answer="A service error occurred. Please try again later.",
                model ="error",
                usage ={"input_tokens": 0, "output_tokens": 0},
            )

        except Exception:
            logger.error("Unhandled interaction error", exc_info=True)
            log_data["outcome"]    = "error"
            log_data["error_code"] = "UNKNOWN"
            return ChatResponse(
                answer="I apologize, but I encountered an unexpected error.",
                model ="error",
                usage ={"input_tokens": 0, "output_tokens": 0},
            )

        finally:
            log_data["latency_ms"] = int((time.monotonic() - start_time) * 1000)
            emit_pipeline_telemetry(
                pipeline_timer,
                interaction_meta=interaction_meta,
                persona=request.user_type or "employee",
                chat_mode=request.chat_mode,
                context_strategy=interaction_meta.get("context_strategy"),
                query_path=interaction_meta.get("query_path"),
                warm_cache_hit=interaction_meta.get("warm_cache_hit"),
                session_id=log_data.get("session_id"),
                thread_id=str(request.thread_id) if request.thread_id else None,
            )
            if interaction_meta.get("user_personalization_degraded") or interaction_meta.get(
                "user_personalization_available"
            ):
                logger.info(
                    "user_personalization_context",
                    extra={
                        "session_id": log_data.get("session_id"),
                        "thread_id": str(request.thread_id) if request.thread_id else None,
                        "profile_available": interaction_meta.get(
                            "user_personalization_available", False
                        ),
                        "degraded": interaction_meta.get(
                            "user_personalization_degraded", False
                        ),
                    },
                )
            if interaction_meta.get("peer_mentions_requested"):
                logger.info(
                    "peer_mentions_resolution",
                    extra={
                        "session_id": log_data.get("session_id"),
                        "thread_id": str(request.thread_id) if request.thread_id else None,
                        "requested": interaction_meta.get("peer_mentions_requested", 0),
                        "resolved": interaction_meta.get("peer_mentions_resolved", 0),
                        "degraded": interaction_meta.get("peer_mentions_degraded", 0),
                    },
                )

            # Guard: skip write when user_id is unresolved (no token in TEMPORARY phase).
            # Once production JWT decoding is enabled every request will carry a token
            # and this guard will always pass.
            if log_data.get("session_id") and log_data.get("user_id") != "unknown":
                try:
                    entry = build_and_validate_log(log_data)
                    write_audit_log(entry)
                except Exception as audit_exc:
                    logger.error("audit_write_failed", extra={"error": str(audit_exc)})

    async def handle_unified_chat_stream(
        self, request: ChatRequest, access_token: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Streaming counterpart to handle_unified_chat().

        Yields formatted SSE wire-format strings (ready to be passed directly
        to a FastAPI StreamingResponse with media_type="text/event-stream").

        The audit guarantee is preserved:  the finally block fires whether
        the generator is exhausted normally, closed by the client disconnecting,
        or terminated by an unhandled exception — so every interaction still
        produces an audit log row.

        Error handling mirrors handle_unified_chat():
          - Domain exceptions are caught, an ErrorEvent SSE frame is yielded,
            and the generator exits cleanly (no HTTP 5xx from the route).
          - The audit log records outcome/error_code for every branch.
        """
        start_time = time.monotonic()
        request_id, trace_id = bind_request_context()
        pipeline_timer = PipelineTimer(request_id=request_id, trace_id=trace_id)
        prepared_context = None
        first_sse_sent = False

        interaction_meta: dict = {
            "retrieved_source_ids" : [],
            "retrieved_chunk_count": 0,
            "tool_calls_count"     : 0,
            "input_tokens"         : 0,
            "output_tokens"        : 0,
            "model_id"             : None,
            "correlation_id"       : None,
            "user_personalization_available": False,
            "user_personalization_degraded" : False,
            "peer_mentions_requested": 0,
            "peer_mentions_resolved" : 0,
            "peer_mentions_degraded" : 0,
        }

        log_data: dict = {
            "user_id"              : "unknown",
            "role"                 : "end_user",
            "session_id"           : None,
            "chat_mode"            : _CHAT_MODE_AUDIT_MAP.get(request.chat_mode, "quick_mode"),
            "model_id"             : None,
            "outcome"              : "error",
            "denial_reason"        : None,
            "error_code"           : "UNKNOWN",
            "retrieved_source_ids" : [],
            "retrieved_chunk_count": 0,
            "tool_calls_count"     : 0,
            "input_tokens"         : None,
            "output_tokens"        : None,
            "latency_ms"           : None,
            "correlation_id"       : None,
        }

        try:
            pipeline_timer.start("auth")
            auth = extract_auth_context(
                access_token  = access_token,
                fallback_role = "employee",
                session_id    = request.session_id,
            )
            # Persona is authoritative from the JWT — never trust client user_type.
            request = request.model_copy(update={"user_type": auth.role})
            log_data["user_id"]    = auth.user_id
            log_data["role"]       = auth.audit_role
            log_data["session_id"] = str(auth.session_id)
            interaction_meta["_user_id_hash"] = auth.user_id
            pipeline_timer.end("auth")

            pipeline_timer.start("rbac")
            check_rbac(auth.role, action="query")
            authorization = await self.authorization_resolver.resolve(
                access_token=access_token,
                persona=auth.role,
            )
            interaction_meta["rbac_super_admin"] = authorization.is_super_admin
            interaction_meta["rbac_degraded"] = authorization.degraded
            pipeline_timer.end("rbac")

            pipeline_timer.start("thread_setup")
            if self.thread_service and not request.thread_id:
                try:
                    new_thread = await asyncio.to_thread(
                        self.thread_service.get_or_create_thread,
                        user_id_hash=auth.user_id,
                        thread_id=None,
                        persona=request.user_type or "employee",
                        chat_mode=request.chat_mode,
                    )
                    request = request.model_copy(
                        update={"thread_id": new_thread["id"]}
                    )
                    if not first_sse_sent:
                        pipeline_timer.record_ttft_sse()
                        interaction_meta["ttft_sse_ms"] = pipeline_timer.ttft_sse_ms
                        first_sse_sent = True
                    yield format_sse(ThreadCreatedEvent(
                        thread_id=str(new_thread["id"]),
                        persona=new_thread.get("persona", request.user_type or "employee"),
                        chat_mode=new_thread.get("chat_mode", request.chat_mode),
                    ))
                    logger.info(
                        "[Stream] auto_thread_created",
                        extra={"thread_id": str(new_thread["id"])},
                    )
                    self._schedule_personalization_prefetch(access_token, auth.user_id)
                    pipeline_timer.end("thread_setup")
                except Exception as thread_exc:
                    pipeline_timer.end(
                        "thread_setup",
                        status="error",
                        error_type=type(thread_exc).__name__,
                    )
                    logger.error(
                        "[Stream] auto_thread_create_failed",
                        extra={"error": str(thread_exc)},
                    )
            else:
                pipeline_timer.end("thread_setup", status="skipped")

            # Thinking timeline — phase 1: understanding the question. Emitted
            # before context prep so the user sees immediate, truthful progress.
            if not first_sse_sent:
                pipeline_timer.record_ttft_sse()
                interaction_meta["ttft_sse_ms"] = pipeline_timer.ttft_sse_ms
                first_sse_sent = True
            yield format_sse(ThinkingStepEvent(key="parse_intent", status="active"))

            prepared_context = await prepare_chat_context(
                request=request,
                access_token=access_token,
                chat_service=self.chat_service,
                context_profile=self.context_profile,
                conv_window=self.conv_window,
                thread_service=self.thread_service,
                memory_retriever=self.memory_retriever,
                timer=pipeline_timer,
                interaction_meta=interaction_meta,
                authorization=authorization,
            )

            logger.info(f"[Stream] Processing query: '{request.message[:60]}...'")

            # Thinking timeline — phase 1 complete, phase 2 (gathering context)
            # begins as the agentic loop spins up retrieval and tool calls.
            yield format_sse(ThinkingStepEvent(key="parse_intent", status="done"))
            yield format_sse(ThinkingStepEvent(key="scan_context", status="active"))

            _full_response_text: str = ""
            _organize_started: bool = False
            _scan_closed: bool = False
            stream_ended_successfully: bool = False
            persisted_assistant_message_id: Optional[str] = None

            async for event in self.chat_service.handle_chat_stream(
                request,
                prepared_context,
                access_token     = access_token,
                interaction_meta = interaction_meta,
                pipeline_timer   = pipeline_timer,
            ):
                if isinstance(event, TokenEvent):
                    _full_response_text += event.text
                elif isinstance(event, ToolActivityEvent) and event.reset_stream:
                    _full_response_text = ""

                # Drive the thinking timeline from real stream events.
                #   • Each tool the agent invokes becomes its own dynamic step,
                #     so quick vs. deep-dive (and different tools) look different.
                #   • All phases complete the moment the model starts answering
                #     (first token) — Gemini-style: steps finish, then the
                #     response streams below the collapsed timeline.
                if isinstance(event, ToolActivityEvent):
                    if not _scan_closed:
                        _scan_closed = True
                        yield format_sse(ThinkingStepEvent(key="scan_context", status="done"))
                    yield format_sse(ThinkingStepEvent(
                        key=event.tool_name or "tool",
                        status="active",
                        label=event.action,
                    ))
                elif isinstance(event, TokenEvent) and not _organize_started:
                    _organize_started = True
                    if not _scan_closed:
                        _scan_closed = True
                        yield format_sse(ThinkingStepEvent(key="scan_context", status="done"))
                    yield format_sse(ThinkingStepEvent(key="organize_output", status="active"))
                elif isinstance(event, DoneEvent) and not _scan_closed:
                    # No text/tools produced (e.g. empty) — close the open phase
                    # so the timeline never hangs in a processing state.
                    _scan_closed = True
                    yield format_sse(ThinkingStepEvent(key="scan_context", status="done"))

                if not first_sse_sent:
                    pipeline_timer.record_ttft_sse()
                    interaction_meta["ttft_sse_ms"] = pipeline_timer.ttft_sse_ms
                    first_sse_sent = True
                yield format_sse(event)

                # When the DoneEvent is yielded the stream is complete —
                # capture final stats for the audit log before finally fires.
                if isinstance(event, DoneEvent):
                    log_data["outcome"]               = "answered"
                    log_data["error_code"]            = None
                    log_data["retrieved_source_ids"]  = interaction_meta["retrieved_source_ids"]
                    log_data["retrieved_chunk_count"] = interaction_meta["retrieved_chunk_count"]
                    log_data["tool_calls_count"]      = interaction_meta["tool_calls_count"]
                    log_data["input_tokens"]          = interaction_meta["input_tokens"] or None
                    log_data["output_tokens"]         = interaction_meta["output_tokens"] or None
                    log_data["model_id"]              = interaction_meta["model_id"]
                    log_data["correlation_id"]        = interaction_meta["correlation_id"]

                    #  Step 3.5: Message persistence (Thread & Trim) 
                    if self.thread_service and request.thread_id and _full_response_text:
                        try:
                            persisted_assistant_message_id = (
                                self.thread_service.persist_message_pair(
                                    thread_id      = str(request.thread_id),
                                    user_text      = request.message,
                                    assistant_text = _full_response_text,
                                    tokens_in      = interaction_meta.get("input_tokens") or None,
                                    tokens_out     = interaction_meta.get("output_tokens") or None,
                                )
                            )
                        except Exception as persist_exc:
                            logger.error(
                                "[Stream] thread_persist_failed",
                                extra={
                                    "error"    : str(persist_exc),
                                    "thread_id": str(request.thread_id),
                                },
                            )

                    #  Step 3.6: Summary maintenance 
                    # Called synchronously after DoneEvent — the client has already
                    # received the complete response so the extra Haiku call latency
                    # is invisible.  No-op when thread is still short.
                    if self.summary_maintainer and request.thread_id:
                        try:
                            self.summary_maintainer.refresh_if_needed(
                                str(request.thread_id)
                            )
                        except Exception as sm_exc:
                            logger.error(
                                "[Stream] summary_refresh_failed",
                                extra={
                                    "error"    : str(sm_exc),
                                    "thread_id": str(request.thread_id),
                                },
                            )

                    if prepared_context is not None:
                        self._run_memory_extraction(
                            auth=auth,
                            request=request,
                            prepared_context=prepared_context,
                            assistant_message_id=persisted_assistant_message_id,
                            assistant_text=_full_response_text,
                        )

                    stream_ended_successfully = True

            if stream_ended_successfully:
                outcome: FollowUpSuggestionResult = FollowUpSuggestionResult(chips=[])
                latency_ms = 0
                if _full_response_text.strip():
                    t0 = time.monotonic()
                    try:
                        outcome = await asyncio.to_thread(
                            generate_follow_up_dynamic_queries,
                            self.bedrock,
                            request.user_type or "employee",
                            request.message,
                            _full_response_text,
                        )
                    except Exception as sug_exc:
                        logger.warning(
                            "follow_up_suggestions_failed",
                            extra={"error": str(sug_exc)},
                        )
                        outcome = FollowUpSuggestionResult(chips=[])
                    latency_ms = int((time.monotonic() - t0) * 1000)

                chip_payload = [
                    {"display": c.display, "submit": c.submit}
                    for c in outcome.chips[:2]
                ]
                logger.info(
                    "follow_up_suggestion_telemetry",
                    extra={
                        "suggestion_call_latency_ms": latency_ms,
                        "user_role": request.user_type or "employee",
                        "intent_tag": outcome.intent_tag,
                        "cache_hit": outcome.cache_hit,
                        "suggestion_count": len(outcome.chips),
                        "correlation_id": interaction_meta.get("correlation_id"),
                        "session_id": str(request.session_id)
                        if request.session_id
                        else None,
                        "thread_id": str(request.thread_id)
                        if request.thread_id
                        else None,
                        "suggestion_chips": chip_payload,
                    },
                )
                if (
                    chip_payload
                    and self.thread_service
                    and persisted_assistant_message_id
                ):
                    try:
                        self.thread_service.update_follow_up_chips(
                            persisted_assistant_message_id,
                            chip_payload,
                        )
                    except Exception as chip_persist_exc:
                        logger.warning(
                            "follow_up_chips_persist_failed",
                            extra={
                                "error"    : str(chip_persist_exc),
                                "message_id": persisted_assistant_message_id,
                            },
                        )
                yield format_sse(SuggestionsEvent(chips=chip_payload))

        except RBACDeniedError as e:
            logger.warning(f"[Stream] RBAC denied: {e}")
            log_data["outcome"]               = "denied"
            log_data["denial_reason"]         = "rbac_policy"
            log_data["error_code"]            = None
            log_data["retrieved_source_ids"]  = interaction_meta["retrieved_source_ids"]
            log_data["retrieved_chunk_count"] = interaction_meta["retrieved_chunk_count"]
            log_data["tool_calls_count"]      = interaction_meta["tool_calls_count"]
            log_data["input_tokens"]          = interaction_meta["input_tokens"] or None
            log_data["output_tokens"]         = interaction_meta["output_tokens"] or None
            log_data["model_id"]              = interaction_meta["model_id"]
            log_data["correlation_id"]        = interaction_meta["correlation_id"]
            yield format_sse(ErrorEvent(
                message = "You do not have permission to access this information.",
                code    = "RBAC_DENIED",
            ))

        except ContentFilterDeniedError as e:
            logger.warning(f"[Stream] Content filter denied: {e}")
            log_data["outcome"]       = "denied"
            log_data["denial_reason"] = "content_filter"
            log_data["error_code"]    = None
            yield format_sse(ErrorEvent(
                message = "Your request was blocked by content policy.",
                code    = "CONTENT_FILTER",
            ))

        except UpstreamTimeoutError as e:
            logger.error(f"[Stream] Upstream timeout: {e}")
            log_data["outcome"]    = "error"
            log_data["error_code"] = "TIMEOUT"
            yield format_sse(ErrorEvent(
                message = "The request timed out. Please try again.",
                code    = "TIMEOUT",
            ))

        except UpstreamFailureError as e:
            logger.error(f"[Stream] Upstream failure: {e}")
            log_data["outcome"]    = "error"
            log_data["error_code"] = "UPSTREAM_FAILURE"
            yield format_sse(ErrorEvent(
                message = "A service error occurred. Please try again later.",
                code    = "UPSTREAM_FAILURE",
            ))

        except Exception:
            logger.error("[Stream] Unhandled interaction error", exc_info=True)
            log_data["outcome"]    = "error"
            log_data["error_code"] = "UNKNOWN"
            yield format_sse(ErrorEvent(
                message = "I apologize, but I encountered an unexpected error.",
                code    = "UNKNOWN",
            ))

        finally:
            log_data["latency_ms"] = int((time.monotonic() - start_time) * 1000)
            emit_pipeline_telemetry(
                pipeline_timer,
                interaction_meta=interaction_meta,
                persona=request.user_type or "employee",
                chat_mode=request.chat_mode,
                context_strategy=interaction_meta.get("context_strategy"),
                query_path=interaction_meta.get("query_path"),
                warm_cache_hit=interaction_meta.get("warm_cache_hit"),
                session_id=log_data.get("session_id"),
                thread_id=str(request.thread_id) if request.thread_id else None,
            )
            if interaction_meta.get("user_personalization_degraded") or interaction_meta.get(
                "user_personalization_available"
            ):
                logger.info(
                    "user_personalization_context",
                    extra={
                        "session_id": log_data.get("session_id"),
                        "thread_id": str(request.thread_id) if request.thread_id else None,
                        "profile_available": interaction_meta.get(
                            "user_personalization_available", False
                        ),
                        "degraded": interaction_meta.get(
                            "user_personalization_degraded", False
                        ),
                    },
                )
            if interaction_meta.get("peer_mentions_requested"):
                logger.info(
                    "peer_mentions_resolution",
                    extra={
                        "session_id": log_data.get("session_id"),
                        "thread_id": str(request.thread_id) if request.thread_id else None,
                        "requested": interaction_meta.get("peer_mentions_requested", 0),
                        "resolved": interaction_meta.get("peer_mentions_resolved", 0),
                        "degraded": interaction_meta.get("peer_mentions_degraded", 0),
                    },
                )

            if log_data.get("session_id") and log_data.get("user_id") != "unknown":
                try:
                    entry = build_and_validate_log(log_data)
                    write_audit_log(entry)
                except Exception as audit_exc:
                    logger.error("audit_write_failed", extra={"error": str(audit_exc)})
