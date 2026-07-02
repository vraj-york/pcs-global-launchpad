"""
Chatbot RBAC permission model.

Mirrors the backend submodule registry (``backend/src/auth/rbac/submodule.registry.ts``)
and the authorization context returned by ``GET /users/me/profile`` → ``data.submodules``.

The chatbot is a *read-only* consumer of RBAC: it never writes or mutates system
data. Permissions are used to decide which read/data tools the LLM may call and to
shape the answer scope. The backend remains the authorization owner — every tool
call still hits a guarded backend endpoint, so this layer is defence-in-depth that
also prevents the model from attempting actions the user is not entitled to.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Optional

# Canonical submodule keys the chatbot actually gates on.
#
# This is a deliberately *minimal* mirror of the backend registry
# (``backend/src/auth/rbac/submodule.registry.ts`` → ``SUBMODULE_KEYS``): we only
# duplicate the keys the chatbot references when gating tools, not the whole
# catalog (that would silently rot). Each string value must match the backend's
# ``data.submodules[].key`` exactly — the contract is pinned by
# ``tests/units/test_submodule_contract.py``, which fails if a key here drifts
# from the backend registry. Add a key here only when a chatbot tool gates on it.
SUBMODULE_KEYS: dict[str, str] = {
    "CORPORATION_DIRECTORY_VIEW": "corporation_directory.view_corporation",
}

# Role categories whose presence implies "see everything" (super admin parity).
SUPER_ADMIN_CATEGORY_NAME: str = "Super Admin"


@dataclass(frozen=True)
class ChatAuthorizationContext:
    """
    Resolved, read-only authorization snapshot for the current request.

    Attributes:
        persona:            App-layer persona resolved from the JWT (tone + base tools).
        is_super_admin:     True when the user has full submodule access (wildcard).
        enabled_submodules: Set of enabled submodule keys for the user.
        role_name:          Backend role name, when available (for prompt context).
        category:           Backend role category name, when available.
        degraded:           True when permissions could not be resolved and a
                            least-privilege fallback was applied.
    """

    persona: str = "employee"
    is_super_admin: bool = False
    enabled_submodules: frozenset[str] = field(default_factory=frozenset)
    role_name: Optional[str] = None
    category: Optional[str] = None
    degraded: bool = False

    def can(self, submodule_key: str) -> bool:
        """Return True when the user may read the given submodule's data."""
        return self.is_super_admin or submodule_key in self.enabled_submodules

    def can_any(self, submodule_keys: Iterable[str]) -> bool:
        """Return True when the user may read at least one of the submodules."""
        if self.is_super_admin:
            return True
        return any(key in self.enabled_submodules for key in submodule_keys)


def build_enabled_submodules(submodules: Optional[Iterable[dict]]) -> frozenset[str]:
    """Build the set of enabled submodule keys from the profile ``submodules`` list."""
    if not submodules:
        return frozenset()
    enabled: set[str] = set()
    for entry in submodules:
        if not isinstance(entry, dict):
            continue
        key = entry.get("key")
        if key and entry.get("enabled"):
            enabled.add(str(key))
    return frozenset(enabled)
