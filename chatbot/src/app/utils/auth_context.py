"""
Auth Context

Builds a typed AuthContext from the request's access token.
Provides RBAC permission checks and maps application-layer role names
to the audit schema's RoleEnum values.

Role name mapping

Application layer   Audit schema (RoleEnum)   Cognito group
    
superadmin          super_admin               superadmin / super-admin
coach               manager                   coach
employee            end_user                  User
company_admin       manager                   CompanyAdmin
corporation_admin   super_admin               CorporationAdmin

Persona is resolved from JWT via resolve_persona_from_token(). fallback_role is
dev-only until CHATBOT_TRUST_REQUEST_USER_TYPE=false in production.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID, uuid4

from app.utils.jwt_verify import decode_jwt_claims
from app.utils.persona_resolution import resolve_persona_from_groups

logger = logging.getLogger(__name__)

_FALLBACK_PERSONA = "employee"

# The role used as a "see everything" sentinel in RBAC bypass checks.
# Change this if the highest-privilege role name is ever renamed.
HIGHEST_PRIVILEGE_ROLE: str = "superadmin"

# Maps app-layer role names → audit schema RoleEnum string values
ROLE_AUDIT_MAP: dict[str, str] = {
    "superadmin": "super_admin",
    "corporation_admin": "super_admin",
    "company_admin": "manager",
    "coach": "manager",
    "employee": "end_user",
}

# Maps app-layer roles → permitted actions
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "superadmin": {"query", "admin", "export"},
    "corporation_admin": {"query", "admin"},
    "company_admin": {"query", "admin"},
    "coach": {"query"},
    "employee": {"query"},
}


@dataclass
class AuthContext:
    user_id   : str    # SHA-256 of JWT sub (first 32 hex chars), or "unknown"
    role      : str    # persona: superadmin | corporation_admin | company_admin | coach | employee
    audit_role: str    # mapped to RoleEnum: super_admin | manager | end_user
    session_id: UUID


class AuthContextError(Exception):
    """Raised when auth context cannot be constructed (e.g. malformed token)."""


def _hash_sub(sub: str) -> str:
    """One-way hash of the JWT sub claim — keeps user_id opaque in audit logs."""
    return hashlib.sha256(sub.encode()).hexdigest()[:32]


def extract_auth_context(
    access_token : Optional[str],
    fallback_role: str | None = None,
    session_id   : Optional[UUID] = None,
) -> AuthContext:
    """
    Build an AuthContext for the current request.

    Args:
        access_token:  Raw JWT from the Authorization header (without "Bearer ").
                       Used to derive user_id from the 'sub' claim.
                       TEMPORARY NOTE: role is NOT decoded from the token yet —
                       it is taken from fallback_role (the frontend payload value)
                       until production JWT decoding is enabled.
        fallback_role: Role string set by the route handler (from request.user_type).
                       Replace with decoded token role once production auth is live.
        session_id:    UUID from ChatRequest.session_id. If None, a fresh UUID is
                       generated — this means each request appears as a separate
                       conversation in the audit log until the frontend sends a
                       stable session_id per conversation.

    Returns:
        AuthContext with user_id, app-layer role, audit role, and session_id.
    """
    user_id = "unknown"
    persona: str | None = None

    if access_token:
        # Single decode for both identity and persona — when CHATBOT_VERIFY_JWT
        # is on and verification fails, claims is None and we fail closed:
        # user_id stays "unknown" (per-user injection is skipped) and persona
        # falls back to the least-privileged employee role.
        claims = decode_jwt_claims(access_token)
        if claims:
            sub = claims.get("sub", "")
            if sub:
                user_id = _hash_sub(sub)
            groups = claims.get("cognito:groups", [])
            if isinstance(groups, list):
                persona = resolve_persona_from_groups(groups)
        else:
            logger.warning("auth_context_token_unresolved_or_unverified")

    if persona is None and fallback_role:
        persona = fallback_role

    if persona is None:
        persona = _FALLBACK_PERSONA
        logger.warning("persona_unresolved_using_employee_fallback")

    audit_role = ROLE_AUDIT_MAP.get(persona, "end_user")

    return AuthContext(
        user_id    = user_id,
        role       = persona,
        audit_role = audit_role,
        session_id = session_id or uuid4(),
    )


def assert_thread_owner(auth_user_id: str, stored_user_id_hash: str) -> None:
    """
    Raise ThreadOwnershipError if auth_user_id does not match the stored thread owner.

    Placeholder owner guard: compares the user_id already extracted by
    extract_auth_context() (SHA-256 of the JWT sub) against the hash written to
    conversations.user_id_hash at thread creation time.

    Upgrade path: when full Cognito JWT signature verification is enabled,
    auth_user_id will be the cryptographically-verified sub hash — this
    function's signature and all callers remain unchanged.

    Args:
        auth_user_id:       AuthContext.user_id from the current request.
        stored_user_id_hash: conversations.user_id_hash from the database row.

    Raises:
        ThreadOwnershipError: if the hashes do not match or auth_user_id is
                              "unknown" (unauthenticated request).
    """
    from app.domain.exceptions import ThreadOwnershipError

    if auth_user_id == "unknown" or auth_user_id != stored_user_id_hash:
        raise ThreadOwnershipError("Thread not found or access denied.")


def check_rbac(role: str, action: str = "query") -> None:
    """
    Raise RBACDeniedError if the given role cannot perform the action.

    Args:
        role:   App-layer persona string.
        action: The action to check (query / admin / export).

    Raises:
        RBACDeniedError: If the role lacks the required permission.
    """
    from app.domain.exceptions import RBACDeniedError

    if action not in ROLE_PERMISSIONS.get(role, set()):
        raise RBACDeniedError(
            f"Role '{role}' does not have permission for action '{action}'"
        )
