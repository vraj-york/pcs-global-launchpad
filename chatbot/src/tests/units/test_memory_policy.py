from app.observability.query_router import QueryPath
from app.services.memory.memory_policy import (
    is_pure_greeting_message,
    is_substantive_extraction_message,
    resolve_retrieve_policy,
    should_extract,
)


def test_resolve_retrieve_policy_fast_never_zero():
    policy = resolve_retrieve_policy(
        persona="employee",
        chat_mode="quick",
        query_path=QueryPath.FAST,
    )
    assert policy.top_k == 3


def test_resolve_retrieve_policy_quick_employee_personalizes():
    policy = resolve_retrieve_policy(
        persona="employee",
        chat_mode="quick",
        query_path=QueryPath.DEEP,
    )
    assert policy.top_k == 3
    assert "org_insight" not in policy.allowed_kinds


def test_resolve_retrieve_policy_company_admin_includes_team_insight():
    policy = resolve_retrieve_policy(
        persona="company_admin",
        chat_mode="deep_dive",
        query_path=QueryPath.DEEP,
    )
    assert policy.top_k == 5
    assert "team_insight" in policy.allowed_kinds


def test_should_extract_works_in_quick_mode_on_deep_path():
    assert should_extract(
        chat_mode="quick",
        query_path=QueryPath.DEEP,
        consent_granted=True,
        enable_extraction=True,
    )


def test_should_extract_requires_consent():
    assert not should_extract(
        chat_mode="deep_dive",
        query_path=QueryPath.DEEP,
        consent_granted=False,
        enable_extraction=True,
    )


def test_should_extract_allows_substantive_quick_fast_path():
    message = (
        "I've realized I work best in the morning and I hate back-to-back meetings, "
        "as my energy is high in the morning."
    )
    assert should_extract(
        chat_mode="quick",
        query_path=QueryPath.FAST,
        consent_granted=True,
        enable_extraction=True,
        user_message=message,
    )


def test_should_extract_runs_on_short_recall_questions():
    assert should_extract(
        chat_mode="quick",
        query_path=QueryPath.FAST,
        consent_granted=True,
        enable_extraction=True,
        user_message="When do I work best?",
    )


def test_should_extract_skips_pure_greeting():
    assert not should_extract(
        chat_mode="quick",
        query_path=QueryPath.FAST,
        consent_granted=True,
        enable_extraction=True,
        user_message="hello",
    )


def test_is_pure_greeting_message():
    assert is_pure_greeting_message("hello")
    assert not is_pure_greeting_message("When do I work best?")


def test_is_substantive_extraction_message():
    assert not is_substantive_extraction_message("hello")
    assert is_substantive_extraction_message(
        "I've realized I work best in the morning and I hate back-to-back meetings, "
        "as my energy is high in the morning and it dozes off as the evening comes."
    )
