"""
Contract test: the chatbot's submodule keys must stay in sync with the backend
RBAC registry (the authorization owner).

The chatbot keeps a deliberately *minimal* mirror of the canonical submodule keys
in ``app.utils.permissions.SUBMODULE_KEYS`` and gates tools on them in
``app.domain.tools._TOOL_REQUIRED_SUBMODULES``. If the backend renames or removes
one of these keys, the chatbot would silently stop gating those tools correctly.
This test catches that drift at review/CI time (where the monorepo is checked out)
instead of in production.

When the backend registry isn't present (e.g. the chatbot is built/tested in
isolation without the ``backend/`` folder), the test skips rather than fails.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import pytest

from app.domain.tools import _TOOL_REQUIRED_SUBMODULES
from app.utils.permissions import SUBMODULE_KEYS

_REGISTRY_RELATIVE = Path("backend/src/auth/rbac/submodule.registry.ts")

# Matches the canonical key string in both the catalog (``key: 'module.sub'``)
# and the ``SUBMODULE_KEYS`` map (``NAME: 'module.sub'``). Import paths use
# ``from '...'`` and human-readable ``name: '...'`` values do not match.
_KEY_VALUE_RE = re.compile(r":\s*'([a-z0-9_]+\.[a-z0-9_]+)'")


def _find_backend_registry() -> Optional[Path]:
    """Walk up from this file to locate the backend submodule registry."""
    for parent in Path(__file__).resolve().parents:
        candidate = parent / _REGISTRY_RELATIVE
        if candidate.is_file():
            return candidate
    return None


def _backend_submodule_keys(registry: Path) -> frozenset[str]:
    """Parse every canonical submodule key string from the registry file."""
    return frozenset(_KEY_VALUE_RE.findall(registry.read_text(encoding="utf-8")))


def _chatbot_required_keys() -> frozenset[str]:
    """Every submodule key the chatbot depends on (mirror + tool gating)."""
    keys: set[str] = set(SUBMODULE_KEYS.values())
    for required in _TOOL_REQUIRED_SUBMODULES.values():
        keys.update(required)
    return frozenset(keys)


def test_chatbot_submodule_keys_exist_in_backend_registry() -> None:
    registry = _find_backend_registry()
    if registry is None:
        pytest.skip("backend submodule registry not present in this checkout")

    backend_keys = _backend_submodule_keys(registry)
    assert backend_keys, (
        f"failed to parse any submodule keys from {_REGISTRY_RELATIVE}; "
        "the registry format may have changed"
    )

    missing = sorted(_chatbot_required_keys() - backend_keys)
    assert not missing, (
        "chatbot submodule keys are missing from the backend registry "
        f"({_REGISTRY_RELATIVE}): {missing}. Update app/utils/permissions.py "
        "(and app/domain/tools.py) to match the renamed/removed backend keys."
    )


def test_tool_gating_keys_are_declared_in_permissions() -> None:
    """Every key a tool gates on must come from the SUBMODULE_KEYS mirror."""
    declared = set(SUBMODULE_KEYS.values())
    gated: set[str] = set()
    for required in _TOOL_REQUIRED_SUBMODULES.values():
        gated.update(required)

    undeclared = sorted(gated - declared)
    assert not undeclared, (
        "tools gate on submodule keys not declared in SUBMODULE_KEYS: "
        f"{undeclared}. Add them to app/utils/permissions.py."
    )
