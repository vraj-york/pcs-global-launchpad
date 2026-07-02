"""Unit tests for chatbot read-only RBAC: submodule resolution + tool gating."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

from app.domain.tools import (
    allowed_tool_names_for_user,
    get_tools_for_user,
    is_tool_allowed_for_user,
)
from app.services.authorization_service import AuthorizationResolver
from app.utils.permissions import (
    SUBMODULE_KEYS,
    ChatAuthorizationContext,
    build_enabled_submodules,
)

CORP_VIEW = SUBMODULE_KEYS["CORPORATION_DIRECTORY_VIEW"]


class TestBuildEnabledSubmodules:
    def test_only_enabled_keys_are_kept(self):
        submodules = [
            {"key": "a.view", "enabled": True},
            {"key": "b.view", "enabled": False},
            {"key": "c.view", "enabled": True},
        ]
        assert build_enabled_submodules(submodules) == frozenset({"a.view", "c.view"})

    def test_handles_none_and_malformed(self):
        assert build_enabled_submodules(None) == frozenset()
        assert build_enabled_submodules([{"enabled": True}, "nope", 5]) == frozenset()


class TestChatAuthorizationContext:
    def test_can_respects_enabled_set(self):
        ctx = ChatAuthorizationContext(enabled_submodules=frozenset({CORP_VIEW}))
        assert ctx.can(CORP_VIEW)
        assert not ctx.can("user_directory.view_users_contacts")

    def test_super_admin_is_wildcard(self):
        ctx = ChatAuthorizationContext(is_super_admin=True)
        assert ctx.can(CORP_VIEW)
        assert ctx.can_any(["anything.at.all"])


class TestToolGating:
    def test_employee_gets_only_knowledge_base(self):
        ctx = ChatAuthorizationContext(persona="employee")
        names = allowed_tool_names_for_user("employee", ctx)
        assert names == {"search_knowledge_base"}
        assert not is_tool_allowed_for_user("get_corporations_list", "employee", ctx)

    def test_coach_gets_coach_tools_and_kb(self):
        ctx = ChatAuthorizationContext(persona="coach")
        names = allowed_tool_names_for_user("coach", ctx)
        assert names == {
            "search_knowledge_base",
            "get_client_snapshot",
            "get_session_notes_history",
        }

    def test_super_admin_gets_corporation_tools(self):
        ctx = ChatAuthorizationContext(persona="superadmin", is_super_admin=True)
        names = allowed_tool_names_for_user("superadmin", ctx)
        assert "get_corporations_list" in names
        assert "get_corporation_details" in names
        assert is_tool_allowed_for_user("get_corporation_details", "superadmin", ctx)

    def test_submodule_grant_enables_data_tool_without_super_admin(self):
        ctx = ChatAuthorizationContext(
            persona="company_admin",
            enabled_submodules=frozenset({CORP_VIEW}),
        )
        assert "get_corporations_list" in allowed_tool_names_for_user("company_admin", ctx)

    def test_no_authorization_denies_data_tools(self):
        names = allowed_tool_names_for_user("employee", None)
        assert names == {"search_knowledge_base"}

    def test_get_tools_for_user_returns_definitions(self):
        ctx = ChatAuthorizationContext(persona="superadmin", is_super_admin=True)
        tool_names = {t["name"] for t in get_tools_for_user("superadmin", ctx)}
        assert "get_corporations_list" in tool_names
        assert "search_knowledge_base" in tool_names


class TestAuthorizationResolver:
    def test_no_token_degrades_to_persona(self):
        resolver = AuthorizationResolver(backend_client=MagicMock())
        ctx = asyncio.run(resolver.resolve(access_token=None, persona="superadmin"))
        assert ctx.degraded is True
        assert ctx.is_super_admin is True
        assert ctx.enabled_submodules == frozenset()

    def test_backend_error_degrades_gracefully(self):
        backend = MagicMock()
        backend.get_my_authorization = AsyncMock(return_value={"error": "boom"})
        resolver = AuthorizationResolver(backend_client=backend)
        ctx = asyncio.run(resolver.resolve(access_token="tok", persona="employee"))
        assert ctx.degraded is True
        assert ctx.is_super_admin is False

    def test_resolves_submodules_from_profile(self):
        backend = MagicMock()
        backend.get_my_authorization = AsyncMock(
            return_value={
                "data": {
                    "roleName": "Company Admin",
                    "category": "Company Admin",
                    "submodules": [
                        {"key": CORP_VIEW, "enabled": True},
                        {"key": "billing_management.view_billing", "enabled": False},
                    ],
                }
            }
        )
        resolver = AuthorizationResolver(backend_client=backend)
        ctx = asyncio.run(resolver.resolve(access_token="tok", persona="company_admin"))
        assert ctx.degraded is False
        assert ctx.is_super_admin is False
        assert ctx.can(CORP_VIEW)
        assert not ctx.can("billing_management.view_billing")

    def test_super_admin_category_grants_wildcard(self):
        backend = MagicMock()
        backend.get_my_authorization = AsyncMock(
            return_value={"data": {"category": "Super Admin", "submodules": []}}
        )
        resolver = AuthorizationResolver(backend_client=backend)
        ctx = asyncio.run(resolver.resolve(access_token="tok2", persona="employee"))
        assert ctx.is_super_admin is True
