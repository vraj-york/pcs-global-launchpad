"""
Hardening Tests — 5a + 5b

5a: Sensitive content guardrail (content_guardrail.py) — direct unit tests
5b: Failed interaction logging — UnifiedChatService exception → audit outcome mapping
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.audit.content_guardrail import (
    assert_no_sensitive_content,
    check_for_free_text,
    check_for_pii,
    SensitiveContentViolation,
)
from app.models.schema import ChatRequest


#  Helpers 

def base_audit_data(**overrides) -> dict:
    """Minimal valid audit data dict that passes all guardrail checks."""
    data = {
        "log_id"               : str(uuid4()),
        "timestamp"            : "2026-02-25T10:00:00+00:00",
        "user_id"              : "a3f1c2b4d5e6f7a8b9c0d1e2f3a4b5c6",
        "role"                 : "end_user",
        "session_id"           : str(uuid4()),
        "chat_mode"            : "quick_mode",
        "model_id"             : None,
        "outcome"              : "answered",
        "denial_reason"        : None,
        "error_code"           : None,
        "retrieved_source_ids" : ["doc-001.pdf", "policy-v2.pdf"],
        "retrieved_chunk_count": 2,
        "tool_calls_count"     : 1,
        "input_tokens"         : 512,
        "output_tokens"        : 128,
        "latency_ms"           : 320,
        "correlation_id"       : str(uuid4()),
    }
    data.update(overrides)
    return data


def _make_auth_context(user_id: str = "a3f1c2b4d5e6f7a8", role: str = "employee"):
    from app.utils.auth_context import AuthContext
    from app.utils.auth_context import ROLE_AUDIT_MAP
    return AuthContext(
        user_id    = user_id,
        role       = role,
        audit_role = ROLE_AUDIT_MAP.get(role, "end_user"),
        session_id = uuid4(),
    )


def _make_chat_request(**overrides) -> ChatRequest:
    defaults = {"message": "test query", "chat_mode": "quick", "user_type": "employee"}
    defaults.update(overrides)
    return ChatRequest(**defaults)


def _mock_prepared_context():
    from app.observability.context_strategy import ContextStrategy
    from app.observability.query_router import QueryPath
    from app.services.chat_preparation import PreparedChatContext

    return PreparedChatContext(
        foundation_prompt="",
        coach_persona_override=None,
        conversation_history=None,
        user_personalization_block=None,
        user_personalization_prefix=None,
        peer_mentions_block=None,
        extracted_memories_block=None,
        memory_citations=[],
        memories_retrieval_degraded=False,
        context_strategy=ContextStrategy.NONE,
        warm_cache_hit=False,
        query_path=QueryPath.FAST,
        enable_tools=False,
    )


#  5a: Sensitive Content Guardrail 

class TestPIIDetection:
    def test_email_blocked(self):
        with pytest.raises(SensitiveContentViolation) as exc:
            check_for_pii("user_id", "john.doe@company.com")
        assert "email" in str(exc.value)

    def test_us_phone_blocked(self):
        with pytest.raises(SensitiveContentViolation) as exc:
            check_for_pii("correlation_id", "ref-555-867-5309")
        assert "phone" in str(exc.value)

    def test_ssn_blocked(self):
        with pytest.raises(SensitiveContentViolation):
            check_for_pii("correlation_id", "SSN: 123-45-6789")

    def test_aws_key_blocked(self):
        with pytest.raises(SensitiveContentViolation):
            check_for_pii("correlation_id", "AKIAIOSFODNN7EXAMPLE")

    def test_credit_card_blocked(self):
        with pytest.raises(SensitiveContentViolation):
            check_for_pii("correlation_id", "4111 1111 1111 1111")

    def test_hashed_user_id_passes(self):
        # SHA-256 hex (first 32 chars) should not trigger any PII pattern
        check_for_pii("user_id", "a3f1c2b4d5e6f7a8b9c0d1e2f3a4b5c6")

    def test_uuid_correlation_id_passes(self):
        check_for_pii("correlation_id", "40be21c0-9617-4f74-89c0-80dd59d909e9")


class TestFreeTextDetection:
    def test_sentence_in_retrieved_source_ids_blocked(self):
        with pytest.raises(SensitiveContentViolation) as exc:
            check_for_free_text(
                "retrieved_source_ids",
                "This is the full text of the retrieved document chunk content here",
            )
        assert "words" in str(exc.value)

    def test_filename_in_retrieved_source_ids_passes(self):
        # Filenames like "bsp-methodology-v2.pdf" are a single token
        check_for_free_text("retrieved_source_ids", "bsp-methodology-v2.pdf")

    def test_non_id_field_not_checked_for_word_count(self):
        # model_id is not in ID_ONLY_FIELDS — word count check should not apply
        check_for_free_text("model_id", "us anthropic claude sonnet four five twenty")

    def test_uuid_in_session_id_passes(self):
        check_for_free_text("session_id", str(uuid4()))


class TestFullGuardrail:
    def test_clean_log_passes(self):
        assert_no_sensitive_content(base_audit_data())

    def test_email_in_user_id_blocked(self):
        with pytest.raises(SensitiveContentViolation) as exc:
            assert_no_sensitive_content(base_audit_data(user_id="john.doe@company.com"))
        assert exc.value.field == "user_id"
        assert "violation" in exc.value.reason

    def test_free_text_in_source_ids_list_blocked(self):
        data = base_audit_data(
            retrieved_source_ids=["This is free text content that should not be here at all"]
        )
        with pytest.raises(SensitiveContentViolation) as exc:
            assert_no_sensitive_content(data)
        assert exc.value.field == "retrieved_source_ids"
        assert "violation" in exc.value.reason

    def test_multiple_violations_reported_together(self):
        data = base_audit_data(
            user_id="john@example.com",
            correlation_id="AKIAIOSFODNN7EXAMPLE",
        )
        with pytest.raises(SensitiveContentViolation) as exc:
            assert_no_sensitive_content(data)
        assert "2" in str(exc.value) or "multiple" in exc.value.field

    def test_none_values_skipped(self):
        # None fields (model_id, denial_reason, etc.) should not cause errors
        data = base_audit_data(model_id=None, denial_reason=None, correlation_id=None)
        assert_no_sensitive_content(data)


#  5b: Failed Interaction Logging Validation 

class TestUnifiedChatServiceAuditOutcomes:
    """
    Verifies that UnifiedChatService.handle_unified_chat correctly classifies
    each exception type into the right audit outcome/error_code, and that the
    audit write always fires in the finally block.

    All DB and AWS dependencies are mocked. write_audit_log is replaced with
    a MagicMock so we can inspect what log_data was passed to build_and_validate_log.
    """

    def _make_service(self):
        from app.services.unified_chat_service import UnifiedChatService
        from app.utils.permissions import ChatAuthorizationContext
        service = UnifiedChatService.__new__(UnifiedChatService)
        service.chat_service = MagicMock()
        service.thread_service = None
        service.context_profile = None
        service.conv_window = None
        service.summary_maintainer = None
        service.memory_retriever = None
        service.memory_extractor = None
        service.authorization_resolver = MagicMock()
        service.authorization_resolver.resolve = AsyncMock(
            return_value=ChatAuthorizationContext(persona="employee")
        )
        return service

    def test_timeout_logged_with_correct_error_code(self):
        from app.domain.exceptions import UpstreamTimeoutError

        service = self._make_service()
        service.chat_service.handle_chat = AsyncMock(side_effect=UpstreamTimeoutError("timed out"))

        with patch("app.services.unified_chat_service.extract_auth_context",
                   return_value=_make_auth_context()), \
             patch("app.services.unified_chat_service.check_rbac"), \
             patch("app.services.unified_chat_service.prepare_chat_context",
                   new=AsyncMock(return_value=_mock_prepared_context())), \
             patch("app.services.unified_chat_service.build_and_validate_log") as mock_build, \
             patch("app.services.unified_chat_service.write_audit_log"):

            mock_build.return_value = MagicMock()
            response = asyncio.run(service.handle_unified_chat(_make_chat_request()))

        assert response.answer is not None
        mock_build.assert_called_once()
        log_data = mock_build.call_args[0][0]
        assert log_data["outcome"]    == "error"
        assert log_data["error_code"] == "TIMEOUT"
        assert log_data["latency_ms"] is not None

    def test_upstream_failure_logged(self):
        from app.domain.exceptions import UpstreamFailureError

        service = self._make_service()
        service.chat_service.handle_chat = AsyncMock(side_effect=UpstreamFailureError("down"))

        with patch("app.services.unified_chat_service.extract_auth_context",
                   return_value=_make_auth_context()), \
             patch("app.services.unified_chat_service.check_rbac"), \
             patch("app.services.unified_chat_service.prepare_chat_context",
                   new=AsyncMock(return_value=_mock_prepared_context())), \
             patch("app.services.unified_chat_service.build_and_validate_log") as mock_build, \
             patch("app.services.unified_chat_service.write_audit_log"):

            mock_build.return_value = MagicMock()
            asyncio.run(service.handle_unified_chat(_make_chat_request()))

        log_data = mock_build.call_args[0][0]
        assert log_data["outcome"]    == "error"
        assert log_data["error_code"] == "UPSTREAM_FAILURE"

    def test_rbac_denied_logged(self):
        from app.domain.exceptions import RBACDeniedError

        service = self._make_service()

        with patch("app.services.unified_chat_service.extract_auth_context",
                   return_value=_make_auth_context()), \
             patch("app.services.unified_chat_service.check_rbac",
                   side_effect=RBACDeniedError("no permission")), \
             patch("app.services.unified_chat_service.prepare_chat_context",
                   new=AsyncMock(return_value=_mock_prepared_context())), \
             patch("app.services.unified_chat_service.build_and_validate_log") as mock_build, \
             patch("app.services.unified_chat_service.write_audit_log"):

            mock_build.return_value = MagicMock()
            response = asyncio.run(service.handle_unified_chat(_make_chat_request()))

        assert "permission" in response.answer.lower() or response.answer is not None
        log_data = mock_build.call_args[0][0]
        assert log_data["outcome"]       == "denied"
        assert log_data["denial_reason"] == "rbac_policy"

    def test_latency_always_captured_on_failure(self):
        from app.domain.exceptions import UpstreamTimeoutError

        service = self._make_service()
        service.chat_service.handle_chat = AsyncMock(side_effect=UpstreamTimeoutError("timeout"))

        with patch("app.services.unified_chat_service.extract_auth_context",
                   return_value=_make_auth_context()), \
             patch("app.services.unified_chat_service.check_rbac"), \
             patch("app.services.unified_chat_service.prepare_chat_context",
                   new=AsyncMock(return_value=_mock_prepared_context())), \
             patch("app.services.unified_chat_service.build_and_validate_log") as mock_build, \
             patch("app.services.unified_chat_service.write_audit_log"):

            mock_build.return_value = MagicMock()
            asyncio.run(service.handle_unified_chat(_make_chat_request()))

        log_data = mock_build.call_args[0][0]
        assert log_data["latency_ms"] is not None
        assert log_data["latency_ms"] >= 0

    def test_unknown_user_skips_audit_write(self):
        """
        When user_id='unknown' (no valid JWT), the audit write is skipped.
        This documents the known edge case: requests without a token in the
        TEMPORARY phase produce no audit row.
        """
        from app.utils.auth_context import AuthContext
        from app.models.schema import ChatResponse

        service = self._make_service()
        service.chat_service.handle_chat = AsyncMock(
            return_value=ChatResponse(answer="ok", model="test", usage={})
        )

        unknown_ctx = AuthContext(
            user_id    = "unknown",
            role       = "employee",
            audit_role = "end_user",
            session_id = uuid4(),
        )

        with patch("app.services.unified_chat_service.extract_auth_context",
                   return_value=unknown_ctx), \
             patch("app.services.unified_chat_service.check_rbac"), \
             patch("app.services.unified_chat_service.prepare_chat_context",
                   new=AsyncMock(return_value=_mock_prepared_context())), \
             patch("app.services.unified_chat_service.write_audit_log") as mock_write:

            asyncio.run(service.handle_unified_chat(_make_chat_request()))

        mock_write.assert_not_called()

    def test_rds_write_failure_does_not_affect_user_response(self):
        """
        A failure in write_audit_log must never propagate to the caller.
        The user still receives a valid ChatResponse.
        """
        from app.models.schema import ChatResponse

        service = self._make_service()
        service.chat_service.handle_chat = AsyncMock(
            return_value=ChatResponse(answer="Here is the answer.", model="test", usage={})
        )

        with patch("app.services.unified_chat_service.extract_auth_context",
                   return_value=_make_auth_context()), \
             patch("app.services.unified_chat_service.check_rbac"), \
             patch("app.services.unified_chat_service.prepare_chat_context",
                   new=AsyncMock(return_value=_mock_prepared_context())), \
             patch("app.services.unified_chat_service.build_and_validate_log",
                   return_value=MagicMock()), \
             patch("app.services.unified_chat_service.write_audit_log",
                   side_effect=Exception("RDS unavailable")):

            response = asyncio.run(service.handle_unified_chat(_make_chat_request()))

        assert response.answer == "Here is the answer."

    def test_answered_outcome_populates_interaction_meta(self):
        """
        On a successful interaction, retrieved_source_ids, retrieved_chunk_count,
        tool_calls_count, and input/output tokens from interaction_meta
        are reflected in the audit log_data.
        """
        from app.models.schema import ChatResponse

        service = self._make_service()

        async def fake_handle_chat(request, prepared, access_token=None, interaction_meta=None, pipeline_timer=None):
            if interaction_meta is not None:
                interaction_meta["retrieved_source_ids"]  = ["policy.pdf"]
                interaction_meta["retrieved_chunk_count"] = 3
                interaction_meta["tool_calls_count"]      = 2
                interaction_meta["input_tokens"]          = 800
                interaction_meta["output_tokens"]         = 200
                interaction_meta["model_id"]              = "claude-test"
            return ChatResponse(answer="answer", model="claude-test", usage={})

        service.chat_service.handle_chat = fake_handle_chat

        with patch("app.services.unified_chat_service.extract_auth_context",
                   return_value=_make_auth_context()), \
             patch("app.services.unified_chat_service.check_rbac"), \
             patch("app.services.unified_chat_service.prepare_chat_context",
                   new=AsyncMock(return_value=_mock_prepared_context())), \
             patch("app.services.unified_chat_service.build_and_validate_log") as mock_build, \
             patch("app.services.unified_chat_service.write_audit_log"):

            mock_build.return_value = MagicMock()
            asyncio.run(service.handle_unified_chat(_make_chat_request()))

        log_data = mock_build.call_args[0][0]
        assert log_data["outcome"]                == "answered"
        assert log_data["retrieved_source_ids"]   == ["policy.pdf"]
        assert log_data["retrieved_chunk_count"]  == 3
        assert log_data["tool_calls_count"]       == 2
        assert log_data["input_tokens"]           == 800
        assert log_data["output_tokens"]          == 200
        assert log_data["model_id"]               == "claude-test"
