"""Cognito JWT verification — aligned with backend CognitoAuthGuard.verifyToken."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient

ALLOWED_TOKEN_USES = frozenset({"access", "id"})


class CognitoJwtConfigError(RuntimeError):
    """Raised when COGNITO_USER_POOL_ID is not configured."""


def _get_user_pool_id() -> str:
    pool_id = (os.getenv("COGNITO_USER_POOL_ID") or "").strip()
    if not pool_id:
        raise CognitoJwtConfigError(
            "COGNITO_USER_POOL_ID environment variable is not set"
        )
    return pool_id


def _get_region() -> str:
    return (os.getenv("AWS_REGION") or "us-east-1").strip()


def _expected_issuer(user_pool_id: str, region: str) -> str:
    return f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    user_pool_id = _get_user_pool_id()
    region = _get_region()
    jwks_uri = f"{_expected_issuer(user_pool_id, region)}/.well-known/jwks.json"
    return PyJWKClient(
        jwks_uri,
        cache_jwk_set=True,
        lifespan=86400,
    )


def verify_cognito_jwt(token: str) -> dict[str, Any]:
    """
    Verify Cognito JWT signature (RS256), issuer, and expiration.
    Access tokens omit audience; token_use must be access or id.
    """
    user_pool_id = _get_user_pool_id()
    region = _get_region()
    issuer = _expected_issuer(user_pool_id, region)

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},
        )
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid or expired token") from exc

    token_use = payload.get("token_use")
    if token_use not in ALLOWED_TOKEN_USES:
        raise ValueError("Invalid token use")

    return payload
