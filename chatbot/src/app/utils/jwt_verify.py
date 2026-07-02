"""
Centralised Cognito JWT decoding.

A single decode path for the whole chatbot so identity (sub), persona
(cognito:groups), and RBAC all rest on the same trust decision.

Behaviour is governed by ``settings.CHATBOT_VERIFY_JWT``:

  - False (default): claims are decoded WITHOUT signature verification. This is
    the historical behaviour and is only safe when an upstream API Gateway
    Cognito authorizer has already validated the token. Keeps local/dev and
    tests working with unsigned fixture tokens.
  - True: the signature, issuer, and expiry are verified against the Cognito
    JWKS before any claim is trusted. Any failure returns ``None`` so callers
    fail closed to the least-privileged, unauthenticated path.
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from urllib.parse import unquote

import jwt

from app.config import settings

logger = logging.getLogger(__name__)

# PyJWKClient caches signing keys internally; reuse one instance per container.
_jwk_client: Optional["jwt.PyJWKClient"] = None


def _normalize(access_token: str) -> str:
    """Strip URL-encoding and a leading ``Bearer `` prefix from a raw token."""
    token = access_token.strip()
    if "%" in token:
        token = unquote(token)
    if token.startswith("Bearer "):
        token = token[7:]
    return token


def cognito_issuer() -> Optional[str]:
    """Resolve the expected Cognito issuer URL, or None if not configured."""
    if settings.COGNITO_ISSUER:
        return settings.COGNITO_ISSUER
    if settings.COGNITO_USER_POOL_ID:
        return (
            f"https://cognito-idp.{settings.COGNITO_REGION}"
            f".amazonaws.com/{settings.COGNITO_USER_POOL_ID}"
        )
    return None


def _jwks_url() -> Optional[str]:
    if settings.COGNITO_JWKS_URL:
        return settings.COGNITO_JWKS_URL
    issuer = cognito_issuer()
    return f"{issuer}/.well-known/jwks.json" if issuer else None


def _get_jwk_client() -> Optional["jwt.PyJWKClient"]:
    global _jwk_client
    if _jwk_client is not None:
        return _jwk_client
    url = _jwks_url()
    if not url:
        logger.error(
            "jwt_verify_misconfigured: CHATBOT_VERIFY_JWT is enabled but no "
            "COGNITO_JWKS_URL / COGNITO_USER_POOL_ID is configured"
        )
        return None
    _jwk_client = jwt.PyJWKClient(url, cache_keys=True)
    return _jwk_client


def decode_jwt_claims(access_token: Optional[str]) -> Optional[dict[str, Any]]:
    """
    Decode a Cognito JWT into its claims, honouring ``CHATBOT_VERIFY_JWT``.

    Returns the claims dict, or ``None`` when the token is missing, malformed,
    or (when verification is enabled) fails signature / issuer / expiry checks.
    Callers must treat ``None`` as unauthenticated and degrade to least
    privilege.
    """
    if not access_token:
        return None

    token = _normalize(access_token)

    if not settings.CHATBOT_VERIFY_JWT:
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except jwt.InvalidTokenError as exc:
            logger.warning("jwt_decode_unverified_failed: %s", exc)
            return None

    client = _get_jwk_client()
    if client is None:
        # Misconfiguration with verification on — fail closed.
        return None

    try:
        signing_key = client.get_signing_key_from_jwt(token)
        # Cognito access tokens carry ``client_id`` rather than ``aud``; verify
        # the issuer explicitly and require exp/iss to be present.
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=cognito_issuer(),
            options={"verify_aud": False, "require": ["exp", "iss"]},
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("jwt_verify_failed: %s", exc)
        return None
    except Exception as exc:  # JWKS fetch / network / key errors — fail closed
        logger.error("jwt_verify_error: %s", exc)
        return None
