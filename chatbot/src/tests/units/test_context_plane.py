from app.domain.context_plane import build_context_plane
from app.domain.prompts import COACH_PERSONA_SHELL


def test_coach_shell_is_slimmer_than_bedrock_asset_reference():
    shell_len = len(COACH_PERSONA_SHELL)
    assert shell_len < 2000


def test_build_context_plane_splits_static_and_dynamic():
    plane = build_context_plane(
        foundation_prompt="Foundation",
        chat_mode="quick",
        user_type="employee",
        current_date="2026-05-27",
        user_personalization_block="<user_personalization>data</user_personalization>",
    )
    assert "Foundation" in plane.static_text
    assert "user_personalization" in plane.dynamic_text
    assert plane.date_awareness.startswith("[Temporal context")
    assert isinstance(plane.bedrock_system, list)


def test_coach_bedrock_override_in_static_tier():
    override = "AUDIENCE: Coach\n\nFull Bedrock persona text here."
    plane = build_context_plane(
        foundation_prompt="Foundation",
        chat_mode="quick",
        user_type="coach",
        coach_persona_override=override,
        use_coach_shell=False,
        current_date="2026-05-27",
    )
    assert override in plane.static_text
    assert COACH_PERSONA_SHELL not in plane.static_text


def test_extracted_memories_block_in_dynamic_tier():
    memories_block = (
        "<extracted_memories>"
        '<memory kind="preference">User prefers bullet answers</memory>'
        "</extracted_memories>"
    )
    plane = build_context_plane(
        foundation_prompt="Foundation",
        chat_mode="deep_dive",
        user_type="employee",
        current_date="2026-05-27",
        extracted_memories_block=memories_block,
    )
    assert memories_block in plane.dynamic_text
