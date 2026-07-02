"""Unit tests for assessment-trigger coaching session bootstrap."""

from unittest.mock import MagicMock

from app.domain.assessment_trigger_prompts import build_template_opening_message
from app.services.assessment_trigger_service import AssessmentTriggerService
from app.services.follow_up_suggestion_service import FollowUpChipPayload


class TestBuildTemplateOpeningMessage:
    def test_personalized_with_category_and_score(self):
        text = build_template_opening_message("Alex", "Collaborator", "Control")
        assert "Alex" in text
        assert "Collaborator" in text
        assert "Control" in text

    def test_category_only(self):
        text = build_template_opening_message("Alex", "Collaborator", None)
        assert "Collaborator" in text
        assert "Control" not in text

    def test_generic_fallback(self):
        text = build_template_opening_message(None, None, None)
        assert "there" in text
        assert "completed your assessment" in text


class TestAssessmentTriggerService:
    def _make_service(
        self,
        opening_text: str = "LLM opener",
        follow_up_chips: list | None = None,
    ):
        thread_service = MagicMock()
        thread_service.get_or_create_thread.return_value = {
            "id": "thread-1",
            "title": "New conversation",
            "pinned": False,
            "persona": "employee",
            "chat_mode": "quick",
            "coach_client_id": None,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "last_message_at": None,
        }
        thread_service.persist_assistant_message.return_value = {
            "id": "msg-1",
            "created_at": "2026-01-01T00:00:01Z",
        }
        thread_service.get_thread.return_value = {
            "id": "thread-1",
            "title": "Assessment coaching",
            "pinned": False,
            "persona": "employee",
            "chat_mode": "quick",
            "coach_client_id": None,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:01Z",
            "last_message_at": "2026-01-01T00:00:01Z",
        }

        bedrock = MagicMock()
        bedrock.generate_chat_response.return_value = {
            "content": [{"type": "text", "text": opening_text}],
        }

        service = AssessmentTriggerService(
            thread_service=thread_service,
            bedrock=bedrock,
        )

        if follow_up_chips is None:
            follow_up_chips = [
                FollowUpChipPayload(
                    display="Explain my style",
                    submit="Explain what my overall behavioral style means for my work.",
                )
            ]

        service._generate_follow_up_chips = MagicMock(return_value=follow_up_chips)
        return service, thread_service

    def test_create_session_uses_llm_opener(self):
        service, thread_service = self._make_service("Welcome Alex!")
        result = service.create_session(
            user_id_hash="hash-1",
            assessment_id="assessment-1",
            display_name="Alex",
            category="Collaborator",
            score="Control",
        )

        assert result["opening_message"]["content"] == "Welcome Alex!"
        thread_service.persist_assistant_message.assert_called_once()
        thread_service.rename_thread.assert_called_once()

    def test_create_session_falls_back_to_template_when_llm_empty(self):
        service, _thread_service = self._make_service("")
        service.bedrock.generate_chat_response.return_value = {
            "content": [{"type": "text", "text": ""}],
        }

        result = service.create_session(
            user_id_hash="hash-1",
            assessment_id="assessment-1",
            display_name="Alex",
            category="Collaborator",
            score="Control",
        )

        assert "Collaborator" in result["opening_message"]["content"]
        assert "Control" in result["opening_message"]["content"]

    def test_create_session_attaches_follow_up_chips(self):
        service, thread_service = self._make_service()
        result = service.create_session(
            user_id_hash="hash-1",
            assessment_id="assessment-1",
            display_name="Alex",
            category="Collaborator",
            score="Control",
        )

        assert result["opening_message"]["follow_up_chips"]
        thread_service.update_follow_up_chips.assert_called_once()
