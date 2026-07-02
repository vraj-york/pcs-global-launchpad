from app.observability.context_strategy import ContextStrategy
from app.services.turn_assembly import compose_user_message


def test_compose_user_message_prefix_strategy():
    content = compose_user_message(
        message="What is my style?",
        date_awareness="[Temporal context — today's date is 2026-05-27]",
        prefix="Style: Pioneer — Moves quickly.",
        strategy=ContextStrategy.USER_MESSAGE_PREFIX,
    )
    assert content.startswith("[Temporal context")
    assert "Style: Pioneer" in content
    assert content.endswith("What is my style?")


def test_compose_user_message_system_append_leaves_message_unmodified():
    content = compose_user_message(
        message="What is my style?",
        date_awareness="[Temporal context — today's date is 2026-05-27]",
        prefix="Style: Pioneer — Moves quickly.",
        strategy=ContextStrategy.SYSTEM_APPEND,
    )
    assert content.endswith("What is my style?")
    assert "Style: Pioneer" not in content
