"""Prompts and template fallbacks for post-assessment coaching openers."""

ASSESSMENT_TRIGGER_OPENING_SYSTEM = """You are Bispy Bot, a warm enterprise coaching assistant.

The user just completed their BSP behavioral assessment and is viewing their results.
Write a single opening coaching message (2-4 short paragraphs).

Rules:
- Greet them by name when provided.
- Reference their overall behavioral style (category) naturally when provided.
- Reference their dominant stress mind-state (score label) naturally when provided.
- Do NOT mention raw numeric scores, quadrant values, or internal style types.
- Do NOT ask them to take an assessment — they already finished.
- Be encouraging and practical; invite them to explore their results or next steps.
- Output ONLY the message text — no JSON, no markdown headings, no quotes wrapper."""

ASSESSMENT_TRIGGER_THREAD_TITLE = "Assessment coaching"

ASSESSMENT_TRIGGER_FOLLOW_UP_USER_STUB = (
    "I just completed my BSP assessment and want coaching on my results."
)


def build_template_opening_message(
    display_name: str | None,
    category: str | None,
    score: str | None,
) -> str:
    """Privacy-safe fallback when LLM generation is unavailable."""
    name = (display_name or "").strip() or "there"
    category_clean = (category or "").strip()
    score_clean = (score or "").strip()

    if category_clean and score_clean:
        return (
            f"Hi {name}, congratulations on completing your assessment. "
            f"Your overall behavioral style is **{category_clean}**, and under stress "
            f"you tend toward a **{score_clean}** mind-state. "
            f"I am here to help you understand what that means for your work and "
            f"what you can do next. What would you like to explore first?"
        )

    if category_clean:
        return (
            f"Hi {name}, congratulations on completing your assessment. "
            f"Your overall behavioral style is **{category_clean}**. "
            f"I am here to help you understand your results and turn them into "
            f"practical next steps. What would you like to explore first?"
        )

    return (
        f"Hi {name}, congratulations on completing your assessment. "
        f"I am here to help you understand your results and decide what to do next. "
        f"What would you like to explore first?"
    )
