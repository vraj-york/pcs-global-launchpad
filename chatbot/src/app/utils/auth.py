"""
Authentication Utilities

Handles JWT token decoding and role extraction from Cognito access tokens.
"""

import jwt
import logging
from typing import Optional
from urllib.parse import unquote

from app.utils.persona_resolution import resolve_persona_from_token

logger = logging.getLogger(__name__)


def decode_access_token(access_token: str, verify: bool = False) -> Optional[str]:
    """
    Decode Cognito access token and extract chatbot persona.

    Returns:
        Persona string (employee, company_admin, corporation_admin, superadmin, coach)
        or None if token cannot be decoded or no recognized group is found.
    """
    if not access_token:
        logger.warning("No access token provided")
        return None

    try:
        token = access_token.strip()

        if '%' in token:
            token = unquote(token)
            logger.debug("Token was URL-encoded, decoded it")

        if token.startswith("Bearer "):
            token = token[7:]
            logger.debug("Removed 'Bearer ' prefix from token")

        persona = resolve_persona_from_token(token)
        if persona:
            return persona

        decoded = jwt.decode(
            token,
            options={"verify_signature": verify},
        )
        cognito_groups = decoded.get("cognito:groups", [])
        logger.info(
            "No mapped persona for cognito groups: %s",
            cognito_groups,
        )
        return None

    except jwt.DecodeError as e:
        logger.error(f"Failed to decode JWT token: {str(e)}")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid JWT token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error decoding token: {str(e)}")
        return None
