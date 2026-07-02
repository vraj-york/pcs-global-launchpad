"""
Monthly-plan enforcement for BiSPy Bot (chatbot) routes.

Delegates subscription state to the NestJS backend (GET /users/me/subscription-access).
SuperAdmin bypasses checks, matching MonthlyPlanGuard on the backend.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx
from fastapi import HTTPException, status

from app.config import settings
from app.utils.jwt_verify import decode_jwt_claims
from app.utils.subscription_constants import (
    CHATBOT_AUTH_REQUIRED_MSG,
    SUBSCRIPTION_ACCESS_DENIED_MSG,
    SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
    SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG,
    SUPER_ADMIN_COGNITO_GROUP,
)

logger = logging.getLogger(__name__)

SUBSCRIPTION_VERIFICATION_UNAVAILABLE_MSG = (
    "Subscription verification is unavailable."
)


def _normalize_backend_base_url(raw: Optional[str]) -> str:
    """Strip whitespace and trailing slashes so path joins never produce `//`."""
    return (raw or "").strip().rstrip("/")


def _normalize_group_name(group: str) -> str:
    return group.strip().lower().replace("-", "")


def token_has_super_admin_cognito_group(access_token: str) -> bool:
    """True when JWT cognito:groups includes SuperAdmin."""
    decoded = decode_jwt_claims(access_token)
    if not decoded:
        return False
    groups = decoded.get("cognito:groups", [])
    if not isinstance(groups, list):
        return False
    normalized = {_normalize_group_name(g) for g in groups if isinstance(g, str) and g.strip()}
    return SUPER_ADMIN_COGNITO_GROUP in normalized


def _subscription_access_http_error(
    exc: httpx.HTTPStatusError,
    *,
    url: str,
) -> HTTPException:
    upstream_status = exc.response.status_code
    logger.warning(
        "subscription_access_http_error status=%s url=%s",
        upstream_status,
        url,
    )
    if upstream_status in (401, 403):
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=CHATBOT_AUTH_REQUIRED_MSG,
        )
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=SUBSCRIPTION_VERIFICATION_UNAVAILABLE_MSG,
    )


def _fetch_subscription_access(access_token: str) -> dict[str, Any]:
    base_url = _normalize_backend_base_url(settings.BACKEND_API_URL)
    if not base_url:
        logger.error("BACKEND_API_URL is not configured for subscription checks")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SUBSCRIPTION_VERIFICATION_UNAVAILABLE_MSG,
        )

    url = f"{base_url}/users/me/subscription-access"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }
    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as exc:
        raise _subscription_access_http_error(exc, url=url) from exc
    except Exception as exc:
        logger.warning("subscription_access_failed url=%s error=%s", url, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SUBSCRIPTION_VERIFICATION_UNAVAILABLE_MSG,
        ) from exc

    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict):
        logger.warning(
            "subscription_access_invalid_response url=%s payload_type=%s",
            url,
            type(payload).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SUBSCRIPTION_VERIFICATION_UNAVAILABLE_MSG,
        )
    return data


def require_chatbot_subscription(access_token: Optional[str]) -> None:
    """
    Raise HTTP 401/403 when the bearer token is missing or chatbot access is denied.

    Mirrors backend MonthlyPlanGuard + SubscriptionAccessService.canAccessChatbot.
    """
    if not access_token or not access_token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=CHATBOT_AUTH_REQUIRED_MSG,
        )

    token = access_token.strip()
    if token_has_super_admin_cognito_group(token):
        return

    ctx = _fetch_subscription_access(token)

    if ctx.get("employeeLimitExceeded"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
        )

    is_blocked = bool(ctx.get("isBlocked"))
    subscription_status = ctx.get("subscriptionStatus")
    is_active = bool(ctx.get("isActive"))
    if is_blocked or (subscription_status is not None and not is_active):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SUBSCRIPTION_ACCESS_DENIED_MSG,
        )

    if not ctx.get("canAccessChatbot"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG,
        )
