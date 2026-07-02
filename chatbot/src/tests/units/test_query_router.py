from app.observability.query_router import QueryPath, route_query


def test_employee_greeting_routes_fast():
    decision = route_query(
        persona="employee",
        chat_mode="quick",
        message="Hello!",
        mentions_present=False,
    )
    assert decision.path == QueryPath.FAST


def test_employee_profile_question_routes_deep():
    decision = route_query(
        persona="employee",
        chat_mode="quick",
        message="What is my BSP style?",
        mentions_present=False,
    )
    assert decision.path == QueryPath.DEEP


def test_coach_always_routes_deep():
    decision = route_query(
        persona="coach",
        chat_mode="quick",
        message="Hi",
        mentions_present=False,
    )
    assert decision.path == QueryPath.DEEP


def test_mentions_force_deep_path():
    decision = route_query(
        persona="employee",
        chat_mode="quick",
        message="Hello",
        mentions_present=True,
    )
    assert decision.path == QueryPath.DEEP
