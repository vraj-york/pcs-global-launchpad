"""
Assessment-triggered coaching session bootstrap.

Creates a new employee thread with an assistant-first opening message after
the user completes their assessment journey.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.domain.assessment_trigger_prompts import (
    ASSESSMENT_TRIGGER_FOLLOW_UP_USER_STUB,
    ASSESSMENT_TRIGGER_OPENING_SYSTEM,
    ASSESSMENT_TRIGGER_THREAD_TITLE,
    build_template_opening_message,
)
from app.infrastructure import BedrockClient
from app.services.follow_up_suggestion_service import (
    FollowUpChipPayload,
    generate_follow_up_dynamic_queries,
)
from app.services.thread_service import ThreadService

logger = logging.getLogger(__name__)

_MAX_NAME_LEN = 80
_MAX_CATEGORY_LEN = 120
_MAX_SCORE_LEN = 80


def _extract_response_text(result: Dict[str, Any]) -> str:
    parts: List[str] = []
    for block in result.get("content", []) or []:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n".join(parts).strip()


def _sanitize_field(value: Optional[str], max_len: int) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:max_len]


class AssessmentTriggerService:
    """Bootstrap a coaching thread with a personalized assistant opener."""

    def __init__(
        self,
        thread_service: ThreadService,
        bedrock: BedrockClient,
    ) -> None:
        self.thread_service = thread_service
        self.bedrock = bedrock

    def create_session(
        self,
        user_id_hash: str,
        assessment_id: str,
        display_name: Optional[str] = None,
        category: Optional[str] = None,
        score: Optional[str] = None,
        persona: str = "employee",
        chat_mode: str = "quick",
    ) -> dict:
        name = _sanitize_field(display_name, _MAX_NAME_LEN)
        category_clean = _sanitize_field(category, _MAX_CATEGORY_LEN)
        score_clean = _sanitize_field(score, _MAX_SCORE_LEN)

        thread = self.thread_service.get_or_create_thread(
            user_id_hash=user_id_hash,
            thread_id=None,
            persona=persona,
            chat_mode=chat_mode,
            coach_client_id=None,
        )
        thread_id = str(thread["id"])

        opening_text = self._generate_opening(name, category_clean, score_clean)
        asst_row = self.thread_service.persist_assistant_message(
            thread_id=thread_id,
            assistant_text=opening_text,
        )

        chips = self._generate_follow_up_chips(opening_text, persona)
        if chips:
            self.thread_service.update_follow_up_chips(
                str(asst_row["id"]),
                [{"display": c.display, "submit": c.submit} for c in chips],
            )

        self.thread_service.rename_thread(
            thread_id,
            user_id_hash,
            ASSESSMENT_TRIGGER_THREAD_TITLE,
        )

        updated = self.thread_service.get_thread(thread_id, user_id_hash) or thread

        return {
            "assessment_id": assessment_id,
            "thread": updated,
            "opening_message": {
                "id": str(asst_row["id"]),
                "content": opening_text,
                "created_at": asst_row["created_at"],
                "follow_up_chips": (
                    [{"display": c.display, "submit": c.submit} for c in chips]
                    if chips
                    else None
                ),
            },
        }

    def _generate_opening(
        self,
        display_name: Optional[str],
        category: Optional[str],
        score: Optional[str],
    ) -> str:
        prompt_lines = [
            "Write the opening coaching message for this user.",
            f"Name: {display_name or 'Unknown'}",
            f"Behavioral style (category): {category or 'Not available'}",
            f"Dominant stress mind-state (score label): {score or 'Not available'}",
        ]
        user_prompt = "\n".join(prompt_lines)

        try:
            result = self.bedrock.generate_chat_response(
                messages=[{"role": "user", "content": user_prompt}],
                system_prompt=ASSESSMENT_TRIGGER_OPENING_SYSTEM,
                max_tokens=600,
                temperature=0.55,
                tools=None,
                model_id=settings.BEDROCK_SUMMARY_MODEL,
            )
            text = _extract_response_text(result)
            if text:
                return text
        except Exception as exc:
            logger.warning(
                "assessment_trigger_llm_failed",
                extra={"error": str(exc)},
            )

        return build_template_opening_message(display_name, category, score)

    def _generate_follow_up_chips(
        self,
        opening_text: str,
        persona: str,
    ) -> List[FollowUpChipPayload]:
        try:
            result = generate_follow_up_dynamic_queries(
                self.bedrock,
                persona=persona,
                last_user_message=ASSESSMENT_TRIGGER_FOLLOW_UP_USER_STUB,
                assistant_final_text=opening_text,
            )
            return result.chips
        except Exception as exc:
            logger.warning(
                "assessment_trigger_follow_up_failed",
                extra={"error": str(exc)},
            )
            return []
