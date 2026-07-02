"""
AWS Bedrock Client

Abstracts all Bedrock API calls for LLM and embeddings.
Supports Bedrock Prompt Management for versioned prompts.
Makes it easy to swap providers or add fallback logic.
"""

import json
import logging
import boto3
from botocore.exceptions import ClientError
from typing import Generator, List, Dict, Any, Optional, Union
from functools import lru_cache
from app.config import settings
from shared.embeddings import generate_embedding, generate_embeddings_batch

logger = logging.getLogger(__name__)

SystemPromptInput = Union[str, List[Dict[str, Any]]]


def normalize_bedrock_usage(usage: Optional[Dict[str, Any]]) -> Dict[str, int]:
    """Normalize Bedrock usage dict including prompt-cache token fields."""
    payload = usage or {}
    return {
        "input_tokens": int(payload.get("input_tokens", 0) or 0),
        "output_tokens": int(payload.get("output_tokens", 0) or 0),
        "cache_read_input_tokens": int(
            payload.get("cache_read_input_tokens", 0) or 0
        ),
        "cache_creation_input_tokens": int(
            payload.get("cache_creation_input_tokens", 0) or 0
        ),
    }


class BedrockClient:
    """Client for AWS Bedrock runtime operations"""

    def __init__(self, region: Optional[str] = None):
        """
        Initialize Bedrock client

        Args:
            region: AWS region (defaults to settings.AWS_REGION)
        """
        self.region = region or settings.AWS_REGION
        self.runtime = boto3.client(service_name="bedrock-runtime", region_name=self.region)
        self.bedrock_agent = boto3.client(service_name="bedrock-agent", region_name=self.region)
        self.chat_model_id = settings.BEDROCK_CHAT_MODEL
        self.embedding_model_id = settings.BEDROCK_EMBEDDING_MODEL
        self.prompt_id = settings.BEDROCK_PROMPT_ID
        self.prompt_version = settings.BEDROCK_PROMPT_VERSION
        self.coach_prompt_id = settings.BEDROCK_COACH_PROMPT_ID
        self.coach_prompt_version = settings.BEDROCK_COACH_PROMPT_VERSION

    def generate_chat_response(
        self,
        messages     : List[Dict[str, Any]],
        system_prompt: Optional[SystemPromptInput] = None,
        max_tokens   : int                        = 4096,
        temperature  : float                      = 0.7,
        tools        : Optional[List[Dict[str, Any]]] = None,
        model_id     : Optional[str]              = None,
    ) -> Dict[str, Any]:
        """
        Generate chat response using Claude, with optional Bedrock Guardrails.

        Guardrails are applied when BEDROCK_GUARDRAIL_ID is configured in settings.
        If the guardrail blocks a request or response, ContentFilterDeniedError is raised.
        Bedrock throttling/failure maps to UpstreamTimeoutError/UpstreamFailureError.

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            tools: Optional tool definitions for tool calling

        Returns:
            Dict with 'content', 'usage', 'model', 'stop_reason', 'correlation_id' keys

        Raises:
            ContentFilterDeniedError: Bedrock Guardrail blocked the request or response
            UpstreamTimeoutError: Bedrock throttled the request
            UpstreamFailureError: Bedrock returned a non-recoverable error
        """
        from app.domain.exceptions import (
            ContentFilterDeniedError, UpstreamTimeoutError, UpstreamFailureError
        )

        request_body: Dict[str, Any] = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens"       : max_tokens,
            "temperature"      : temperature,
            "messages"         : messages,
        }

        if system_prompt:
            request_body["system"] = system_prompt

        if tools:
            request_body["tools"] = tools

        invoke_kwargs: Dict[str, Any] = {
            "modelId": model_id or self.chat_model_id,
            "body"   : json.dumps(request_body),
        }

        # Attach guardrail when configured — skipped gracefully if not set
        if settings.BEDROCK_GUARDRAIL_ID:
            invoke_kwargs["guardrailIdentifier"] = settings.BEDROCK_GUARDRAIL_ID
            invoke_kwargs["guardrailVersion"]    = settings.BEDROCK_GUARDRAIL_VERSION
            invoke_kwargs["trace"]               = "ENABLED"

        try:
            response = self.runtime.invoke_model(**invoke_kwargs)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]

            if error_code == "ThrottlingException":
                raise UpstreamTimeoutError("Bedrock throttled the request") from e

            # Guardrail violation can surface as AccessDeniedException
            if error_code == "AccessDeniedException" and "guardrail" in str(e).lower():
                raise ContentFilterDeniedError("Guardrail denied the request") from e

            if error_code in ("ServiceUnavailableException", "ModelErrorException",
                              "ModelNotReadyException", "InternalServerException"):
                raise UpstreamFailureError(f"Bedrock error: {error_code}") from e

            raise UpstreamFailureError(f"Unexpected Bedrock ClientError: {error_code}") from e

        correlation_id: Optional[str] = (
            response.get("ResponseMetadata", {}).get("RequestId")
        )

        model_response = json.loads(response["body"].read())

        # Guardrail can also intervene at the output level (stop_reason or trace header)
        if self._guardrail_blocked(response, model_response):
            raise ContentFilterDeniedError("Bedrock guardrail blocked the response")

        return {
            "content"       : model_response.get("content", []),
            "usage"         : normalize_bedrock_usage(model_response.get("usage", {})),
            "model"         : self.chat_model_id,
            "stop_reason"   : model_response.get("stop_reason"),
            "correlation_id": correlation_id,
        }

    @staticmethod
    def _guardrail_blocked(response: dict, body: dict) -> bool:
        """
        Detect guardrail intervention from two separate signals Bedrock uses:

        1. stop_reason == "guardrail_intervened" — output was blocked
        2. x-amzn-bedrock-guardrail-action: INTERVENED header — input was blocked

        Both must be checked because Bedrock signals input vs output blocking differently.
        """
        if body.get("stop_reason") == "guardrail_intervened":
            return True

        guardrail_action = (
            response
            .get("ResponseMetadata", {})
            .get("HTTPHeaders", {})
            .get("x-amzn-bedrock-guardrail-action", "")
        )
        return guardrail_action.upper() == "INTERVENED"

    def generate_chat_stream(
        self,
        messages: List[Dict[str, Any]],
        system_prompt: Optional[SystemPromptInput] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Streaming version of generate_chat_response.

        Uses invoke_model_with_response_stream so the caller receives text
        chunks as they are generated rather than waiting for the full response.

        Yields a sequence of typed dicts followed by a terminal 'complete' event:

          {"type": "text_delta",    "text": "..."}
              Incremental text token — emit to the client immediately.

          {"type": "tool_use_start", "id": "...", "name": "..."}
              A tool-use content block has started — no input yet, but the
              tool name is known.  Emit a ToolActivityEvent to the client.

          {"type": "complete",
           "content": [...],        # full accumulated content block list
           "stop_reason": "...",    # "end_turn" | "tool_use" | ...
           "usage": {...},
           "correlation_id": "..."}
              Always the last item yielded.  The caller uses this to decide
              whether to proceed with tool execution or return.

        Guardrails behave identically to generate_chat_response:
          - Input-level intervention detected from the ResponseMetadata header.
          - Output-level intervention detected from stop_reason in message_delta.

        Raises:
            ContentFilterDeniedError: Guardrail blocked input or output.
            UpstreamTimeoutError:     Bedrock throttled the request or stream.
            UpstreamFailureError:     Bedrock returned a non-recoverable error.
        """
        from app.domain.exceptions import (
            ContentFilterDeniedError, UpstreamTimeoutError, UpstreamFailureError,
        )

        request_body: Dict[str, Any] = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens"       : max_tokens,
            "temperature"      : temperature,
            "messages"         : messages,
        }
        if system_prompt:
            request_body["system"] = system_prompt
        if tools:
            request_body["tools"] = tools

        invoke_kwargs: Dict[str, Any] = {
            "modelId": self.chat_model_id,
            "body"   : json.dumps(request_body),
        }
        if settings.BEDROCK_GUARDRAIL_ID:
            invoke_kwargs["guardrailIdentifier"] = settings.BEDROCK_GUARDRAIL_ID
            invoke_kwargs["guardrailVersion"]    = settings.BEDROCK_GUARDRAIL_VERSION
            invoke_kwargs["trace"]               = "ENABLED"

        try:
            response = self.runtime.invoke_model_with_response_stream(**invoke_kwargs)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "ThrottlingException":
                raise UpstreamTimeoutError("Bedrock throttled the request") from e
            if error_code == "AccessDeniedException" and "guardrail" in str(e).lower():
                raise ContentFilterDeniedError("Guardrail denied the request") from e
            if error_code in ("ServiceUnavailableException", "ModelErrorException",
                              "ModelNotReadyException", "InternalServerException"):
                raise UpstreamFailureError(f"Bedrock error: {error_code}") from e
            raise UpstreamFailureError(f"Unexpected Bedrock ClientError: {error_code}") from e

        correlation_id: Optional[str] = (
            response.get("ResponseMetadata", {}).get("RequestId")
        )

        # Check input-level guardrail before iterating the stream
        if settings.BEDROCK_GUARDRAIL_ID:
            guardrail_action = (
                response
                .get("ResponseMetadata", {})
                .get("HTTPHeaders", {})
                .get("x-amzn-bedrock-guardrail-action", "")
            )
            if guardrail_action.upper() == "INTERVENED":
                raise ContentFilterDeniedError("Guardrail blocked the streaming request")

        # content_blocks_by_idx: keyed by Bedrock content-block index so
        # out-of-order events (uncommon but possible) are handled correctly.
        content_blocks_by_idx: Dict[int, Dict[str, Any]] = {}
        stop_reason: Optional[str] = None
        usage: Dict[str, int]      = {}

        try:
            for event in response["body"]:
                # Surface Bedrock stream-level errors
                if "internalServerException"   in event:
                    raise UpstreamFailureError("Bedrock stream internal error")
                if "modelStreamErrorException" in event:
                    raise UpstreamFailureError("Bedrock model stream error")
                if "throttlingException"        in event:
                    raise UpstreamTimeoutError("Bedrock throttled the stream")
                if "validationException"        in event:
                    raise UpstreamFailureError("Bedrock stream validation error")

                chunk = event.get("chunk")
                if not chunk:
                    continue

                data       = json.loads(chunk["bytes"].decode("utf-8"))
                event_type = data.get("type")

                #  content_block_start 
                if event_type == "content_block_start":
                    block      = data.get("content_block", {})
                    block_type = block.get("type")
                    idx        = data.get("index", 0)

                    if block_type == "text":
                        content_blocks_by_idx[idx] = {"type": "text", "text": ""}

                    elif block_type == "tool_use":
                        content_blocks_by_idx[idx] = {
                            "type" : "tool_use",
                            "id"   : block.get("id"),
                            "name" : block.get("name"),
                            "input": "",   # JSON accumulated as string, parsed at stop
                        }
                        yield {"type": "tool_use_start", "id": block.get("id"), "name": block.get("name")}

                #  content_block_delta 
                elif event_type == "content_block_delta":
                    delta      = data.get("delta", {})
                    delta_type = delta.get("type")
                    idx        = data.get("index", 0)
                    block      = content_blocks_by_idx.get(idx)

                    if delta_type == "text_delta" and block and block["type"] == "text":
                        text = delta.get("text", "")
                        block["text"] += text
                        yield {"type": "text_delta", "text": text}

                    elif delta_type == "input_json_delta" and block and block["type"] == "tool_use":
                        block["input"] += delta.get("partial_json", "")

                #  content_block_stop 
                elif event_type == "content_block_stop":
                    idx   = data.get("index", 0)
                    block = content_blocks_by_idx.get(idx)
                    if block and block["type"] == "tool_use":
                        try:
                            block["input"] = json.loads(block["input"])
                        except (json.JSONDecodeError, ValueError):
                            block["input"] = {}

                #  message_delta: stop_reason + final usage 
                elif event_type == "message_delta":
                    delta       = data.get("delta", {})
                    stop_reason = delta.get("stop_reason")
                    usage       = data.get("usage", {})

                    if stop_reason == "guardrail_intervened":
                        raise ContentFilterDeniedError("Bedrock guardrail blocked the response")

                # message_stop carries invocation metrics; nothing to extract here.

        except (ContentFilterDeniedError, UpstreamTimeoutError, UpstreamFailureError):
            raise
        except Exception as exc:
            raise UpstreamFailureError(f"Stream processing failed: {exc}") from exc

        content_blocks = [
            content_blocks_by_idx[i]
            for i in sorted(content_blocks_by_idx)
        ]

        yield {
            "type"          : "complete",
            "content"       : content_blocks,
            "stop_reason"   : stop_reason,
            "usage"         : normalize_bedrock_usage(usage),
            "correlation_id": correlation_id,
        }

    def generate_embedding(
        self, text: str, dimensions: int = 1024, normalize: bool = True
    ) -> List[float]:
        """
        Generate embedding vector for text (synchronous, uses shared utilities)
        
        Synchronous is appropriate for single query embeddings:
        - Fast enough (~200-500ms per query)
        - No async overhead needed
        - Simpler code for single requests

        Args:
            text: Input text to embed
            dimensions: Embedding dimensions (1024 for Titan v2)
            normalize: Whether to normalize the embedding

        Returns:
            List of floats representing the embedding vector
        """
        return generate_embedding(
            text=text,
            model_id=self.embedding_model_id,
            dimensions=dimensions,
            normalize=normalize,
            region=self.region
        )

    async def generate_embeddings_batch_async(
        self, texts: List[str], dimensions: int = 1024, normalize: bool = True
    ) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (async, uses shared utilities)

        Args:
            texts: List of texts to embed
            dimensions: Embedding dimensions
            normalize: Whether to normalize

        Returns:
            List of embedding vectors
        """
        return await generate_embeddings_batch(
            texts=texts,
            model_id=self.embedding_model_id,
            dimensions=dimensions,
            normalize=normalize,
            region=self.region
        )

    def _fetch_prompt_text_from_bedrock(
        self,
        prompt_id: Optional[str],
        prompt_version: Optional[str],
    ) -> Optional[str]:
        if not prompt_id or prompt_id.strip() == "":
            return None

        try:
            response = self.bedrock_agent.get_prompt(
                promptIdentifier=prompt_id,
                promptVersion=prompt_version or self.prompt_version,
            )
            variants = response.get("variants", [])
            if not variants:
                logger.error("No variants found in prompt %s", prompt_id)
                return None

            default_variant = variants[0]
            template_config = default_variant.get("templateConfiguration", {})
            text_config = template_config.get("chat", {})
            system_text = text_config.get("system", "")
            prompt_text = (
                system_text[0].get("text", "")
                if isinstance(system_text, list) and system_text
                else ""
            )

            if not prompt_text:
                logger.error("No prompt text found in prompt %s", prompt_id)
                return None

            logger.info(
                "Successfully loaded prompt from Bedrock: %s (v%s)",
                prompt_id,
                prompt_version,
            )
            return prompt_text

        except self.bedrock_agent.exceptions.ResourceNotFoundException:
            logger.error(
                "Prompt not found: %s (version: %s)",
                prompt_id,
                prompt_version,
            )
            return None
        except Exception as exc:
            logger.error("Failed to retrieve Bedrock prompt: %s", exc, exc_info=True)
            return None

    @lru_cache(maxsize=1)
    def get_prompt_from_bedrock(
        self, prompt_id: Optional[str] = None, prompt_version: Optional[str] = None
    ) -> Optional[str]:
        """Retrieve foundation system prompt from Bedrock Prompt Management."""
        resolved_id = prompt_id or self.prompt_id
        resolved_version = prompt_version or self.prompt_version
        if not resolved_id or resolved_id.strip() == "":
            logger.warning("BEDROCK_PROMPT_ID not configured. Using fallback prompt.")
            return None
        return self._fetch_prompt_text_from_bedrock(resolved_id, resolved_version)

    @lru_cache(maxsize=1)
    def get_coach_persona_from_bedrock(self) -> Optional[str]:
        """Retrieve full coach persona spec from Bedrock when configured."""
        if not self.coach_prompt_id or self.coach_prompt_id.strip() == "":
            return None
        return self._fetch_prompt_text_from_bedrock(
            self.coach_prompt_id,
            self.coach_prompt_version,
        )

    def refresh_prompt_cache(self) -> str:
        """Force refresh of cached Bedrock foundation prompt."""
        self.get_prompt_from_bedrock.cache_clear()
        return self.get_prompt_from_bedrock()

    def refresh_coach_prompt_cache(self) -> Optional[str]:
        """Force refresh of cached Bedrock coach persona prompt."""
        self.get_coach_persona_from_bedrock.cache_clear()
        return self.get_coach_persona_from_bedrock()
