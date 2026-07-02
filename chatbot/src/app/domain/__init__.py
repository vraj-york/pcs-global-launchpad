"""
Domain Layer

Core business logic that's framework-agnostic.
Contains pure business rules, algorithms, and domain models.
"""

from .prompts import (
    get_available_chat_modes,
    get_available_personas,
    get_available_user_types,
    format_session_notes_history,
    COACH_PERSONA_SHELL,
)
from .context_plane import (
    build_context_plane,
    build_bedrock_system_payload,
    ContextPlaneResult,
)
from .exceptions import (
    RBACDeniedError,
    ContentFilterDeniedError,
    UpstreamTimeoutError,
    UpstreamFailureError,
)

__all__ = [
    "get_available_chat_modes",
    "get_available_personas",
    "get_available_user_types",
    "format_session_notes_history",
    "COACH_PERSONA_SHELL",
    "build_context_plane",
    "build_bedrock_system_payload",
    "ContextPlaneResult",
    "RBACDeniedError",
    "ContentFilterDeniedError",
    "UpstreamTimeoutError",
    "UpstreamFailureError",
]
