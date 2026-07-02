"""Shared helpers for chat route handlers."""

from __future__ import annotations

from typing import Optional

from fastapi import Request

from app.utils.subscription_access import require_chatbot_subscription


def extract_bearer_token(fastapi_request: Request) -> Optional[str]:
    auth_header = fastapi_request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return None


def require_chatbot_access(fastapi_request: Request) -> str:
    """Extract bearer token and enforce monthly-plan chatbot subscription."""
    access_token = extract_bearer_token(fastapi_request)
    require_chatbot_subscription(access_token)
    return access_token
