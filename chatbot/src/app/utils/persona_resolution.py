"""Map Cognito JWT groups to chatbot personas."""

from __future__ import annotations

import logging
import re
from typing import Optional

from app.utils.jwt_verify import decode_jwt_claims

logger = logging.getLogger(__name__)

# Highest privilege first — first match wins.
_GROUP_TO_PERSONA: tuple[tuple[frozenset[str], str], ...] = (
    (frozenset({"superadmin", "super-admin"}), "superadmin"),
    (frozenset({"corporationadmin", "corporation_admin", "corporation-admin"}), "corporation_admin"),
    (frozenset({"companyadmin", "company_admin", "company-admin"}), "company_admin"),
    (frozenset({"coach"}), "coach"),
    (frozenset({"user", "employee"}), "employee"),
)

VALID_PERSONAS: frozenset[str] = frozenset({
    "employee",
    "coach",
    "company_admin",
    "corporation_admin",
    "superadmin",
})


def _normalize_group(name: str) -> str:
    return re.sub(r"[-_\s]", "", name.lower())


def resolve_persona_from_groups(cognito_groups: list[str]) -> Optional[str]:
    """Return persona for Cognito groups, or None if unrecognized."""
    if not cognito_groups:
        return None

    normalized = {_normalize_group(g) for g in cognito_groups}

    for keys, persona in _GROUP_TO_PERSONA:
        if normalized & { _normalize_group(k) for k in keys }:
            return persona

    return None


def resolve_persona_from_token(access_token: Optional[str]) -> Optional[str]:
    """Decode the JWT (verification governed by CHATBOT_VERIFY_JWT) and resolve persona."""
    if not access_token:
        return None

    decoded = decode_jwt_claims(access_token)
    if not decoded:
        return None

    groups = decoded.get("cognito:groups", [])
    if not isinstance(groups, list):
        return None

    persona = resolve_persona_from_groups(groups)
    if persona:
        logger.info("Resolved persona=%s from cognito groups", persona)
    return persona
