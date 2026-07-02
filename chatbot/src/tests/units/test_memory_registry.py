import pytest

from app.domain.memory_registry import (
    MemoryRegistryError,
    kind_allowed_for_role,
    normalize_bsp_dimension_for_kind,
    normalize_scope_type,
    normalize_sensitivity,
    validate_bsp_dimension,
    validate_memory_kind,
    validate_memory_status,
)


def test_validate_memory_kind_accepts_known_kind():
    validate_memory_kind("preference")


def test_validate_memory_kind_rejects_unknown():
    with pytest.raises(MemoryRegistryError, match="Invalid memory kind"):
        validate_memory_kind("unknown_kind")


def test_validate_bsp_dimension_for_preference():
    validate_bsp_dimension("preference", "interaction_preferences")
    validate_bsp_dimension("preference", None)


def test_validate_bsp_dimension_rejects_wrong_kind_pairing():
    with pytest.raises(MemoryRegistryError, match="not allowed"):
        validate_bsp_dimension("fact", "strengths_observed")


def test_normalize_bsp_dimension_coerces_invalid_kind_pairing():
    assert normalize_bsp_dimension_for_kind("goal", "environmental_preferences") is None


def test_normalize_bsp_dimension_keeps_valid_pairing():
    assert (
        normalize_bsp_dimension_for_kind("preference", "environmental_preferences")
        == "environmental_preferences"
    )


def test_normalize_bsp_dimension_rejects_unknown_dimension():
    assert normalize_bsp_dimension_for_kind("preference", "not_a_dimension") is None


def test_normalize_scope_type_falls_back_to_kind_default():
    assert normalize_scope_type("preference", "not_a_scope") == "personal"


def test_normalize_sensitivity_defaults_to_normal():
    assert normalize_sensitivity("not_a_sensitivity") == "normal"


def test_validate_memory_status_accepts_candidate():
    validate_memory_status("candidate")


def test_kind_allowed_for_role_employee():
    assert kind_allowed_for_role("preference", "employee")
    assert not kind_allowed_for_role("org_insight", "employee")
