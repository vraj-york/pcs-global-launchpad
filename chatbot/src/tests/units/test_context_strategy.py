from app.observability.context_strategy import ContextStrategy, resolve_context_strategy


def test_employee_quick_uses_user_message_prefix():
    assert resolve_context_strategy("employee", "quick", False) == (
        ContextStrategy.USER_MESSAGE_PREFIX
    )


def test_employee_quick_with_mentions_uses_system_append():
    assert resolve_context_strategy("employee", "quick", True) == (
        ContextStrategy.SYSTEM_APPEND
    )


def test_employee_deep_dive_uses_system_append():
    assert resolve_context_strategy("employee", "deep_dive", False) == (
        ContextStrategy.SYSTEM_APPEND
    )


def test_coach_uses_none():
    assert resolve_context_strategy("coach", "quick", False) == ContextStrategy.NONE
