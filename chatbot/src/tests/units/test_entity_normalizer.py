from app.services.memory.entity_normalizer import (
    extract_query_entities,
    normalize_entities,
    normalize_entity,
)


def test_normalize_entity_strips_honorific_and_lowercases():
    assert normalize_entity("Dr. Jane Smith") == "jane smith"


def test_normalize_entity_strips_at_mention():
    assert normalize_entity("@Alice") == "alice"


def test_normalize_entities_dedupes_case_insensitive():
    display, normalized = normalize_entities(["Alice", "alice", "ALICE"])
    assert display == ["Alice"]
    assert normalized == ["alice"]


def test_extract_query_entities_from_message_and_mentions():
    keys = extract_query_entities(
        "Ask @Bob about Project Alpha with Carol",
        mentions=["Dave"],
    )
    assert "bob" in keys
    assert "dave" in keys
    assert "project alpha" in keys or "carol" in keys
