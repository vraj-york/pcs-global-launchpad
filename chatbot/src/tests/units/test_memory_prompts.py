from app.domain.memory_prompts import format_memories_xml


def test_format_memories_xml_includes_precedence_and_memories():
    xml = format_memories_xml(
        [
            {
                "kind": "preference",
                "text": "User prefers bullet answers",
                "bsp_dimension": "interaction_preferences",
            }
        ]
    )
    assert "<extracted_memories>" in xml
    assert "<precedence>" in xml
    assert "<usage>" in xml
    assert 'kind="preference"' in xml
    assert "User prefers bullet answers" in xml


def test_format_memories_xml_empty_returns_blank():
    assert format_memories_xml([]) == ""
