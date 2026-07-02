"""Unit tests for monthly-plan chatbot subscription enforcement."""

from unittest.mock import MagicMock, patch

import httpx
import jwt
import pytest
from fastapi import HTTPException

from app.utils.subscription_access import (
    _fetch_subscription_access,
    _normalize_backend_base_url,
    require_chatbot_subscription,
    token_has_super_admin_cognito_group,
)


def _encode_token(groups: list[str] | None = None) -> str:
    payload = {"sub": "user-123"}
    if groups is not None:
        payload["cognito:groups"] = groups
    return jwt.encode(payload, "secret", algorithm="HS256")


class TestTokenHasSuperAdminCognitoGroup:
    def test_super_admin_bypasses(self):
        token = _encode_token(["SuperAdmin"])
        assert token_has_super_admin_cognito_group(token) is True

    def test_company_admin_is_not_super_admin(self):
        token = _encode_token(["CompanyAdmin"])
        assert token_has_super_admin_cognito_group(token) is False

    def test_end_user_is_not_super_admin(self):
        token = _encode_token(["User"])
        assert token_has_super_admin_cognito_group(token) is False


class TestNormalizeBackendBaseUrl:
    def test_strips_trailing_slash(self):
        assert (
            _normalize_backend_base_url("https://staging-api.bspblueprint.com/")
            == "https://staging-api.bspblueprint.com"
        )

    def test_strips_whitespace(self):
        assert (
            _normalize_backend_base_url("  https://dev-api.bspblueprint.com  ")
            == "https://dev-api.bspblueprint.com"
        )


class TestFetchSubscriptionAccess:
    @patch("app.utils.subscription_access.settings")
    @patch("app.utils.subscription_access.httpx.Client")
    def test_upstream_401_returns_401_not_plan_denial(
        self, client_cls: MagicMock, settings_mock: MagicMock
    ):
        settings_mock.BACKEND_API_URL = "https://staging-api.bspblueprint.com/"
        request = httpx.Request(
            "GET",
            "https://staging-api.bspblueprint.com/users/me/subscription-access",
        )
        response = httpx.Response(401, request=request)
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = response
        client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc:
            _fetch_subscription_access("token")
        assert exc.value.status_code == 401
        assert "Authentication required" in str(exc.value.detail)

    @patch("app.utils.subscription_access.settings")
    @patch("app.utils.subscription_access.httpx.Client")
    def test_upstream_404_returns_503_not_plan_denial(
        self, client_cls: MagicMock, settings_mock: MagicMock
    ):
        settings_mock.BACKEND_API_URL = "https://staging-api.bspblueprint.com"
        request = httpx.Request(
            "GET",
            "https://staging-api.bspblueprint.com/users/me/subscription-access",
        )
        response = httpx.Response(404, request=request)
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = response
        client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc:
            _fetch_subscription_access("token")
        assert exc.value.status_code == 503
        assert "unavailable" in str(exc.value.detail).lower()

    @patch("app.utils.subscription_access.settings")
    @patch("app.utils.subscription_access.httpx.Client")
    def test_missing_data_payload_returns_503(
        self, client_cls: MagicMock, settings_mock: MagicMock
    ):
        settings_mock.BACKEND_API_URL = "https://staging-api.bspblueprint.com"
        request = httpx.Request(
            "GET",
            "https://staging-api.bspblueprint.com/users/me/subscription-access",
        )
        response = httpx.Response(200, request=request, json={"success": True})
        mock_client = MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.get.return_value = response
        client_cls.return_value = mock_client

        with pytest.raises(HTTPException) as exc:
            _fetch_subscription_access("token")
        assert exc.value.status_code == 503


class TestRequireChatbotSubscription:
    def test_missing_token_returns_401(self):
        with pytest.raises(HTTPException) as exc:
            require_chatbot_subscription(None)
        assert exc.value.status_code == 401

    @patch("app.utils.subscription_access._fetch_subscription_access")
    def test_annual_plan_denied(self, fetch_mock: MagicMock):
        fetch_mock.return_value = {
            "canAccessChatbot": False,
            "canAccessFullApp": False,
            "isActive": True,
            "isBlocked": False,
            "employeeLimitExceeded": False,
            "planTypeId": "annual",
        }
        with pytest.raises(HTTPException) as exc:
            require_chatbot_subscription(_encode_token(["User"]))
        assert exc.value.status_code == 403
        assert "not available on your current plan" in str(exc.value.detail)

    @patch("app.utils.subscription_access._fetch_subscription_access")
    def test_company_admin_on_annual_plan_denied(self, fetch_mock: MagicMock):
        fetch_mock.return_value = {
            "canAccessChatbot": False,
            "canAccessFullApp": False,
            "isActive": True,
            "isBlocked": False,
            "employeeLimitExceeded": False,
            "planTypeId": "annual",
        }
        with pytest.raises(HTTPException) as exc:
            require_chatbot_subscription(_encode_token(["CompanyAdmin"]))
        assert exc.value.status_code == 403
        fetch_mock.assert_called_once()

    @patch("app.utils.subscription_access._fetch_subscription_access")
    def test_monthly_plan_allowed(self, fetch_mock: MagicMock):
        fetch_mock.return_value = {
            "canAccessChatbot": True,
            "canAccessFullApp": True,
            "isActive": True,
            "isBlocked": False,
            "employeeLimitExceeded": False,
            "planTypeId": "monthly",
        }
        require_chatbot_subscription(_encode_token(["User"]))

    def test_super_admin_skips_backend_fetch(self):
        with patch("app.utils.subscription_access._fetch_subscription_access") as fetch_mock:
            require_chatbot_subscription(_encode_token(["SuperAdmin"]))
            fetch_mock.assert_not_called()
