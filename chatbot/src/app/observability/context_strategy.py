from enum import Enum
from typing import Optional


class ContextStrategy(str, Enum):
    NONE = "none"
    USER_MESSAGE_PREFIX = "user_message_prefix"
    SYSTEM_APPEND = "system_append"


def resolve_context_strategy(
    persona: str,
    chat_mode: str,
    mentions_present: bool,
) -> ContextStrategy:
    """
    Decide how warm-tier user personalization enters the model.

    Employee quick chat defaults to a compact user-message prefix so the
    system prompt stays byte-stable for future Bedrock prefix caching.
    Deep dive, peer @mentions, and superadmin keep full system blocks.
    """
    if persona not in {"employee", "superadmin", "company_admin", "corporation_admin"}:
        return ContextStrategy.NONE

    if persona == "employee" and mentions_present:
        return ContextStrategy.SYSTEM_APPEND

    if chat_mode == "deep_dive":
        return ContextStrategy.SYSTEM_APPEND

    if persona == "employee" and chat_mode == "quick":
        return ContextStrategy.USER_MESSAGE_PREFIX

    return ContextStrategy.SYSTEM_APPEND
