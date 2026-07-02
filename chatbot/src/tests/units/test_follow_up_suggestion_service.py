"""Unit tests for follow-up chip parsing and RBAC filtering."""

from app.services.follow_up_suggestion_service import (
    FollowUpChipPayload,
    _filter_chip_pairs,
    _raw_suggestions_to_pairs,
)


class TestRawSuggestionsToPairs:
    def test_dict_objects(self) -> None:
        raw = [
            {"display": "Short label", "submit": "A" * 30},
            {"label": "Alt", "message": "B" * 30},
        ]
        pairs = _raw_suggestions_to_pairs(raw)
        assert len(pairs) == 2
        assert pairs[0] == ("Short label", "A" * 30)
        assert pairs[1] == ("Alt", "B" * 30)

    def test_string_fallback(self) -> None:
        raw = ["x" * 40]
        pairs = _raw_suggestions_to_pairs(raw)
        assert len(pairs) == 1
        assert pairs[0][1] == "x" * 40


class TestFilterChipPairs:
    def test_drops_question_display(self) -> None:
        out = _filter_chip_pairs(
            [("What is BSP?", "x" * 30)],
            ["search_knowledge_base"],
        )
        assert out == []

    def test_keeps_valid_pair(self) -> None:
        submit = (
            "Please walk me through BSP methodology documents relevant to onboarding."
        )
        out = _filter_chip_pairs(
            [("Review BSP onboarding docs", submit)],
            ["search_knowledge_base"],
        )
        assert len(out) == 1
        assert isinstance(out[0], FollowUpChipPayload)
        assert out[0].display == "Review BSP onboarding docs"
        assert out[0].submit == submit

    def test_max_two(self) -> None:
        s = "y" * 40
        out = _filter_chip_pairs(
            [
                ("First step label one", s),
                ("Second step label two", s),
                ("Third ignored", s),
            ],
            ["search_knowledge_base"],
        )
        assert len(out) == 2
