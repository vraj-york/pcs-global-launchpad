"""
Controlled vocabulary for distilled memories.

Mirrors chatbot/docs/memory-kind-registry.md — update both when changing enums.
"""

from __future__ import annotations

MEMORY_KINDS: frozenset[str] = frozenset({
    "preference",
    "goal",
    "behavioural_insight",
    "coaching_history",
    "fact",
    "relationship",
    "observation",
    "team_insight",
    "org_insight",
})

BSP_DIMENSIONS: frozenset[str] = frozenset({
    "strengths_observed",
    "stress_triggers_observed",
    "growth_edges_observed",
    "environmental_preferences",
    "interaction_preferences",
})

MEMORY_STATUSES: frozenset[str] = frozenset({
    "candidate",
    "confirmed",
    "rejected",
})

MEMORY_SCOPE_TYPES: frozenset[str] = frozenset({
    "personal",
    "coachee",
    "team",
    "organization",
})

MEMORY_SENSITIVITIES: frozenset[str] = frozenset({
    "normal",
    "restricted",
    "team",
})

KIND_TO_DEFAULT_SCOPE: dict[str, str] = {
    "preference": "personal",
    "goal": "personal",
    "behavioural_insight": "personal",
    "coaching_history": "coachee",
    "fact": "personal",
    "relationship": "personal",
    "observation": "coachee",
    "team_insight": "team",
    "org_insight": "organization",
}

KIND_ALLOWED_BSP_DIMENSIONS: dict[str, frozenset[str | None]] = {
    "preference": frozenset({"environmental_preferences", "interaction_preferences", None}),
    "goal": frozenset({"growth_edges_observed", None}),
    "behavioural_insight": frozenset(BSP_DIMENSIONS | {None}),
    "coaching_history": frozenset({None}),
    "fact": frozenset({None}),
    "relationship": frozenset({None}),
    "observation": frozenset(BSP_DIMENSIONS | {None}),
    "team_insight": frozenset({None}),
    "org_insight": frozenset({None}),
}

MANUAL_ONLY_KINDS: frozenset[str] = frozenset({"org_insight"})

PERSONAL_MEMORY_KINDS: frozenset[str] = frozenset({
    "preference",
    "goal",
    "behavioural_insight",
    "fact",
    "relationship",
})

_EMPLOYEE_EXTRACTABLE = PERSONAL_MEMORY_KINDS

# Story "manager" maps to platform Company Admin — no separate team-lead persona.
KINDS_EXTRACTABLE_BY_ROLE: dict[str, frozenset[str]] = {
    "employee": _EMPLOYEE_EXTRACTABLE,
    "coach": PERSONAL_MEMORY_KINDS | frozenset({"coaching_history", "observation"}),
    "company_admin": PERSONAL_MEMORY_KINDS | frozenset({"team_insight"}),
    "corporation_admin": PERSONAL_MEMORY_KINDS | frozenset({"team_insight"}),
    "superadmin": PERSONAL_MEMORY_KINDS,
}


class MemoryRegistryError(ValueError):
    pass


def validate_memory_kind(kind: str) -> None:
    if kind not in MEMORY_KINDS:
        raise MemoryRegistryError(f"Invalid memory kind: {kind}")


def validate_bsp_dimension(kind: str, dimension: str | None) -> None:
    validate_memory_kind(kind)
    allowed = KIND_ALLOWED_BSP_DIMENSIONS.get(kind, frozenset({None}))
    if dimension not in allowed:
        raise MemoryRegistryError(
            f"bsp_dimension '{dimension}' not allowed for kind '{kind}'"
        )
    if dimension is not None and dimension not in BSP_DIMENSIONS:
        raise MemoryRegistryError(f"Invalid bsp_dimension: {dimension}")


def normalize_bsp_dimension_for_kind(kind: str, dimension: str | None) -> str | None:
    """
    Coerce extraction output to a valid (kind, dimension) pair.

    Manual API writes still call validate_bsp_dimension() and fail closed.
    Auto-extraction uses this helper per memory-kind-registry.md §1:
    invalid or unknown pairings become NULL rather than aborting the batch.
    """
    validate_memory_kind(kind)
    if dimension in ("null", "", None):
        return None
    if dimension not in BSP_DIMENSIONS:
        return None
    allowed = KIND_ALLOWED_BSP_DIMENSIONS.get(kind, frozenset({None}))
    if dimension not in allowed:
        return None
    return dimension


def bsp_dimension_rules_for_prompt() -> str:
    """Human-readable kind → dimension rules for the extraction prompt."""
    lines: list[str] = []
    for kind in sorted(MEMORY_KINDS):
        allowed = KIND_ALLOWED_BSP_DIMENSIONS.get(kind, frozenset({None}))
        dims = sorted(d for d in allowed if d is not None)
        if dims:
            lines.append(f"- {kind}: {', '.join(dims)} (or null)")
        else:
            lines.append(f"- {kind}: null only")
    return "\n".join(lines)


def validate_memory_status(status: str) -> None:
    if status not in MEMORY_STATUSES:
        raise MemoryRegistryError(f"Invalid memory status: {status}")


def validate_scope_type(scope_type: str) -> None:
    if scope_type not in MEMORY_SCOPE_TYPES:
        raise MemoryRegistryError(f"Invalid scope_type: {scope_type}")


def validate_sensitivity(sensitivity: str) -> None:
    if sensitivity not in MEMORY_SENSITIVITIES:
        raise MemoryRegistryError(f"Invalid sensitivity: {sensitivity}")


def kind_allowed_for_role(kind: str, role: str) -> bool:
    validate_memory_kind(kind)
    allowed = KINDS_EXTRACTABLE_BY_ROLE.get(role, KINDS_EXTRACTABLE_BY_ROLE["employee"])
    return kind in allowed


def normalize_scope_type(kind: str, scope_type: str | None) -> str:
    validate_memory_kind(kind)
    if scope_type in MEMORY_SCOPE_TYPES:
        return scope_type
    return KIND_TO_DEFAULT_SCOPE.get(kind, "personal")


def normalize_sensitivity(sensitivity: str | None) -> str:
    if sensitivity in MEMORY_SENSITIVITIES:
        return sensitivity
    return "normal"
