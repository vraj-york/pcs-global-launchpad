"""
ProactiveEmployeeService

Mock-backed backend contract for the employee chatbot proactive empty-state.

Why this exists:
  - Frontend currently needs personalised proactive prompts.
  - Team entities and assessment APIs are not yet available.
  - This service provides a stable response shape now, so frontend can switch
    from local constants to backend data without another contract redesign.
"""

from copy import deepcopy
from typing import Optional

from app.models.schema import (
    ProactiveAssistantMessage,
    ProactiveEmployeeContext,
    ProactiveEmployeeNudgeConfig,
    ProactiveEmployeePeer,
    ProactiveEmployeeResponse,
    ProactiveEmployeeStage,
    ProactiveOption,
)


class ProactiveEmployeeService:
    """Builds proactive payload for employee role using mock data."""

    _VERSION = "2026-05-08"
    _FIRST_IDLE_MS = 4500
    _SECOND_IDLE_MS = 2500

    _DEFAULT_DISPLAY_NAME = "John"
    _ROLE_SCOPE = "all_company_peers_as_teammates"

    _PEERS = [
        ProactiveEmployeePeer(
            employee_id="emp-002",
            display_name="Priya Shah",
            mock_assessment_summary=(
                "High collaboration and structure preference; responds best to concise "
                "decision framing."
            ),
        ),
        ProactiveEmployeePeer(
            employee_id="emp-003",
            display_name="Marcus Lee",
            mock_assessment_summary=(
                "Strong execution bias and direct communication style; prefers clear "
                "ownership boundaries."
            ),
        ),
        ProactiveEmployeePeer(
            employee_id="emp-004",
            display_name="Elena Rossi",
            mock_assessment_summary=(
                "High empathy and reflective style; benefits from context before action."
            ),
        ),
    ]

    _STAGE_0_CARDS = [
        ProactiveOption(
            id="team_dynamics",
            label="Check Team Dynamics",
            description="Know where your team resides on the BSP wheel",
            submit=(
                "Help me understand team dynamics and where we sit on the BSP wheel "
                "based on assessments."
            ),
            icon="trending-up",
            tone="info",
        ),
        ProactiveOption(
            id="explore_assessment_to_coaching",
            label="Explore how this works",
            description="See how assessments turn into insights and coaching",
            submit=(
                "How do BSP assessments turn into insights and coaching for me and my peers?"
            ),
            icon="compass",
            tone="info",
        ),
    ]

    _STAGE_0_BISPY_CHOICES = [
        ProactiveOption(
            id="platform_intro",
            label="Get familiar with platform",
            submit="Give me a quick tour of key platform features I should know.",
            icon="layout-dashboard",
            tone="success",
        ),
        ProactiveOption(
            id="assessment_how_it_works",
            label="How Assessment works",
            submit="Explain how BSP assessments work and what my results mean.",
            icon="sparkles",
            tone="info",
        ),
        ProactiveOption(
            id="stress_profile",
            label="See how you handle stress",
            submit="Based on my assessment profile, how do I tend to handle stress at work?",
            icon="heart-pulse",
            tone="error",
        ),
    ]

    _STAGE_1_MESSAGE = ProactiveAssistantMessage(
        id="nudge_primary",
        lines=["Hello, {display_name}!", "How can I help you today?"],
        options=[
            ProactiveOption(
                id="teammate_pattern_help",
                label="Help me work better with a team member",
                description="Discover patterns in your team member's behavioral analysis",
                submit=(
                    "I want to work better with a teammate. Help me interpret behavioral "
                    "patterns from our assessments."
                ),
                icon="user-cog",
            ),
            ProactiveOption(
                id="communication_challenge_help",
                label="I'm dealing with a communication challenge",
                description=(
                    "Examine past communication challenges and how you overcame them"
                ),
                submit=(
                    "I'm facing a communication challenge. Help me reflect on similar "
                    "situations and what worked before."
                ),
                icon="lightbulb",
            ),
        ],
        show_waiting_hint=True,
        waiting_hint="Waiting for your input",
    )

    _STAGE_2_MESSAGE_1 = ProactiveAssistantMessage(
        id="nudge_primary_repeat",
        lines=["Hello, {display_name}!", "How can I help you today?"],
        options=_STAGE_1_MESSAGE.options,
    )

    _STAGE_2_MESSAGE_2 = ProactiveAssistantMessage(
        id="nudge_secondary",
        lines=[
            "I can also help you navigate conversations, connect with a live coach or "
            "talk to support specialist.",
            "What would you like to start with?",
        ],
        options=[
            ProactiveOption(
                id="connect_live_coach",
                label="Connect with a live coach",
                submit=(
                    "I'd like to connect with a live coach for guidance on how I work "
                    "with others."
                ),
                icon="headphones",
                tone="success",
            ),
            ProactiveOption(
                id="talk_support_specialist",
                label="Talk to Support Specialist",
                submit=(
                    "I'd like to speak with a support specialist about using the platform."
                ),
                icon="user-cog",
                tone="info",
            ),
        ],
    )

    def get_payload(
        self,
        *,
        display_name: Optional[str] = None,
        phase: Optional[int] = None,
    ) -> ProactiveEmployeeResponse:
        """
        Return backend payload used by employee proactive empty-state.

        Args:
            display_name: Optional override for preview/testing.
            phase: Optional phase filter (0, 1, 2). When set, payload includes
                only that stage while preserving full context and timing config.
        """
        resolved_name = (display_name or self._DEFAULT_DISPLAY_NAME).strip() or self._DEFAULT_DISPLAY_NAME
        stages = self._build_stages(resolved_name)

        if phase is not None:
            stages = [s for s in stages if s.phase == phase]

        return ProactiveEmployeeResponse(
            version=self._VERSION,
            mock_data=True,
            context=ProactiveEmployeeContext(
                display_name=resolved_name,
                role_scope=self._ROLE_SCOPE,
                mock_data=True,
                peers=deepcopy(self._PEERS),
            ),
            nudge=ProactiveEmployeeNudgeConfig(
                first_idle_ms=self._FIRST_IDLE_MS,
                second_idle_ms=self._SECOND_IDLE_MS,
            ),
            stages=stages,
        )

    def _build_stages(self, display_name: str) -> list[ProactiveEmployeeStage]:
        stage_1_message = self._render_display_name(self._STAGE_1_MESSAGE, display_name)
        stage_2_message_1 = self._render_display_name(self._STAGE_2_MESSAGE_1, display_name)

        return [
            ProactiveEmployeeStage(
                phase=0,
                title=f"Welcome, {display_name}!",
                subtitle="Ready to understand how you really work?",
                cards=deepcopy(self._STAGE_0_CARDS),
                bispy_choices=deepcopy(self._STAGE_0_BISPY_CHOICES),
                assistant_messages=[],
            ),
            ProactiveEmployeeStage(
                phase=1,
                assistant_messages=[stage_1_message],
            ),
            ProactiveEmployeeStage(
                phase=2,
                assistant_messages=[stage_2_message_1, deepcopy(self._STAGE_2_MESSAGE_2)],
            ),
        ]

    @staticmethod
    def _render_display_name(
        message: ProactiveAssistantMessage,
        display_name: str,
    ) -> ProactiveAssistantMessage:
        rendered = deepcopy(message)
        rendered.lines = [line.replace("{display_name}", display_name) for line in rendered.lines]
        return rendered
