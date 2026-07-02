"""Unit tests for proactive employee backend payload."""

from app.services.proactive_employee_service import ProactiveEmployeeService


class TestProactiveEmployeeService:
    def test_returns_full_payload_with_all_three_phases(self):
        service = ProactiveEmployeeService()
        payload = service.get_payload()

        assert payload.mock_data is True
        assert payload.context.display_name == "John"
        assert payload.nudge.first_idle_ms == 4500
        assert payload.nudge.second_idle_ms == 2500
        assert [stage.phase for stage in payload.stages] == [0, 1, 2]

    def test_can_filter_single_phase(self):
        service = ProactiveEmployeeService()
        payload = service.get_payload(phase=2)

        assert len(payload.stages) == 1
        assert payload.stages[0].phase == 2
        assert len(payload.stages[0].assistant_messages) == 2

    def test_can_override_display_name(self):
        service = ProactiveEmployeeService()
        payload = service.get_payload(display_name="Aisha")

        assert payload.context.display_name == "Aisha"
        assert payload.stages[0].title == "Welcome, Aisha!"
        assert payload.stages[1].assistant_messages[0].lines[0] == "Hello, Aisha!"
