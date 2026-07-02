"""Tests for centralised JWT decoding and identity-bound cache keys."""

import jwt
import pytest

from app.config import settings
from app.utils import jwt_verify
from app.utils.cache_keys import personalization_cache_key
from app.utils.jwt_verify import decode_jwt_claims
from app.utils.persona_resolution import resolve_persona_from_token


def _make_token(payload: dict) -> str:
    return jwt.encode(payload, "test-secret-key-at-least-32-bytes-long", algorithm="HS256")


def test_decode_returns_none_for_missing_token():
    assert decode_jwt_claims(None) is None
    assert decode_jwt_claims("") is None


def test_decode_unverified_returns_claims(monkeypatch):
    monkeypatch.setattr(settings, "CHATBOT_VERIFY_JWT", False)
    token = _make_token({"sub": "abc", "cognito:groups": ["SuperAdmin"]})
    claims = decode_jwt_claims(token)
    assert claims is not None
    assert claims["sub"] == "abc"


def test_decode_strips_bearer_prefix(monkeypatch):
    monkeypatch.setattr(settings, "CHATBOT_VERIFY_JWT", False)
    token = _make_token({"sub": "abc"})
    assert decode_jwt_claims(f"Bearer {token}")["sub"] == "abc"


def test_decode_malformed_token_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "CHATBOT_VERIFY_JWT", False)
    assert decode_jwt_claims("not-a-jwt") is None


def test_verification_on_without_config_fails_closed(monkeypatch):
    monkeypatch.setattr(settings, "CHATBOT_VERIFY_JWT", True)
    monkeypatch.setattr(settings, "COGNITO_JWKS_URL", None)
    monkeypatch.setattr(settings, "COGNITO_USER_POOL_ID", None)
    monkeypatch.setattr(settings, "COGNITO_ISSUER", None)
    monkeypatch.setattr(jwt_verify, "_jwk_client", None)
    token = _make_token({"sub": "abc", "cognito:groups": ["SuperAdmin"]})
    assert decode_jwt_claims(token) is None


def test_resolve_persona_from_token_unverified(monkeypatch):
    monkeypatch.setattr(settings, "CHATBOT_VERIFY_JWT", False)
    token = _make_token({"sub": "abc", "cognito:groups": ["CompanyAdmin"]})
    assert resolve_persona_from_token(token) == "company_admin"


def test_resolve_persona_from_token_unknown_groups(monkeypatch):
    monkeypatch.setattr(settings, "CHATBOT_VERIFY_JWT", False)
    token = _make_token({"sub": "abc", "cognito:groups": ["Nope"]})
    assert resolve_persona_from_token(token) is None


def test_personalization_cache_key_identity_bound():
    token = "the-token"
    token_only = personalization_cache_key(token)
    bound = personalization_cache_key(token, "user-hash")
    assert token_only is not None
    assert bound is not None
    assert token_only != bound
    # Stable for identical inputs, distinct per identity.
    assert bound == personalization_cache_key(token, "user-hash")
    assert bound != personalization_cache_key(token, "other-user")


def test_personalization_cache_key_none_token():
    assert personalization_cache_key(None) is None
    assert personalization_cache_key(None, "user-hash") is None
