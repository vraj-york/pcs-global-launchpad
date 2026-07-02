"""
Authorization Resolver

Resolves the authenticated user's read-only RBAC context (enabled submodules +
super-admin parity) from the backend and caches it per request token.

Design (context engineering):
  - Backend owns authorization; this service only reads ``GET /users/me/profile``.
  - Failures degrade gracefully to a least-privilege context derived from the
    JWT persona, so the chat pipeline never hard-fails on an RBAC lookup.
  - 15-minute in-process cache per Lambda container, keyed by token fingerprint.
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from app.infrastructure.backend_client import BackendAPIClient
from app.utils.auth_context import HIGHEST_PRIVILEGE_ROLE
from app.utils.cache_keys import personalization_cache_key
from app.utils.permissions import (
    SUPER_ADMIN_CATEGORY_NAME,
    ChatAuthorizationContext,
    build_enabled_submodules,
)

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS: int = 15 * 60


class AuthorizationResolver:
    """Fetches and caches the user's enabled submodule set for tool gating."""

    def __init__(self, backend_client: Optional[BackendAPIClient] = None) -> None:
        self._backend: BackendAPIClient = backend_client or BackendAPIClient()
        self._cache: dict[str, tuple[ChatAuthorizationContext, float]] = {}

    async def resolve(
        self,
        access_token: Optional[str],
        persona: str,
    ) -> ChatAuthorizationContext:
        """
        Return the read-only authorization context for the current request.

        ``persona`` is the JWT-resolved persona and is the authoritative source
        for super-admin parity even when the profile fetch degrades.
        """
        persona_super_admin = persona == HIGHEST_PRIVILEGE_ROLE

        if not access_token:
            return ChatAuthorizationContext(
                persona=persona,
                is_super_admin=persona_super_admin,
                degraded=True,
            )

        cache_key = personalization_cache_key(access_token)
        if cache_key:
            cached = self._cache.get(cache_key)
            if cached:
                ctx, expiry = cached
                if time.monotonic() < expiry:
                    return ctx

        result = await self._backend.get_my_authorization(access_token=access_token)
        if "error" in result:
            logger.warning(
                "authorization_resolve_degraded",
                extra={"persona": persona, "error": result["error"]},
            )
            return ChatAuthorizationContext(
                persona=persona,
                is_super_admin=persona_super_admin,
                degraded=True,
            )

        payload = result.get("data", {})
        if not isinstance(payload, dict):
            payload = {}

        category = payload.get("category")
        enabled = build_enabled_submodules(payload.get("submodules"))
        is_super_admin = persona_super_admin or category == SUPER_ADMIN_CATEGORY_NAME

        ctx = ChatAuthorizationContext(
            persona=persona,
            is_super_admin=is_super_admin,
            enabled_submodules=enabled,
            role_name=payload.get("roleName"),
            category=category,
            degraded=False,
        )

        if cache_key:
            self._cache[cache_key] = (ctx, time.monotonic() + CACHE_TTL_SECONDS)

        return ctx

    def invalidate(self, access_token: Optional[str]) -> None:
        cache_key = personalization_cache_key(access_token)
        if cache_key:
            self._cache.pop(cache_key, None)
