"""Prompts and template fallbacks for daily Growth Spark generation."""

GROWTH_SPARK_TITLE = "Daily Growth Spark"

# Hard limits — aligned with dashboard card layout and DB day-one templates.
GROWTH_SPARK_MAX_TITLE_CHARS = 120
GROWTH_SPARK_MAX_BODY_CHARS = 480
GROWTH_SPARK_MAX_BODY_LINES = 6

GROWTH_SPARK_SYSTEM = """You are Bispy Bot, a warm enterprise coaching assistant.

Write a Daily Growth Spark for the user's dashboard. Match the length and structure of the example below exactly — never longer.

Example (follow this size strictly):
TITLE: Creativity gains power when paired with clarity.

BODY:
Your mind naturally generates ideas, possibilities, and unconventional solutions.
Today, remember that people often need structure around innovation before they feel comfortable embracing it.
Your GRAY teammates may want clarity. Your GREEN teammates may want alignment. Your RED teammates may want measurable outcomes.
A brilliant idea gains traction when others understand how to execute it.

Rules:
- TITLE: exactly one short sentence (8–14 words, max 120 characters). Coaching headline — not a greeting.
- BODY: exactly 4–6 short sentences. One sentence per line. Max 480 characters total for the body.
- Do NOT write more than 6 body lines. Do NOT write long paragraphs.
- Reference their overall behavioral style naturally when provided.
- You may mention GRAY / GREEN / RED teammate needs when it fits (like the example).
- Do NOT mention raw numeric scores or internal style codes.
- Do NOT ask them to take an assessment.
- Encouraging, practical, grounded — post-assessment coaching tone.
- Output ONLY in this exact format (TITLE: then BODY:). No markdown, JSON, or extra commentary."""

GROWTH_SPARK_EXAMPLE_REFERENCE = (
    "TITLE: Creativity gains power when paired with clarity.\n\n"
    "BODY:\n"
    "Your mind naturally generates ideas, possibilities, and unconventional solutions.\n"
    "Today, remember that people often need structure around innovation before they feel "
    "comfortable embracing it.\n"
    "Your GRAY teammates may want clarity. Your GREEN teammates may want alignment. "
    "Your RED teammates may want measurable outcomes.\n"
    "A brilliant idea gains traction when others understand how to execute it."
)


def build_growth_spark_user_prompt(
    *,
    display_name: str | None,
    style_title: str | None,
    style_summary: str | None,
    dominant_mind_state: str | None,
    spark_date: str,
    team_context: str | None,
    previous_sparks: list[str] | None = None,
) -> str:
    """Build the user turn for Bedrock Growth Spark generation."""
    lines = [
        "Write today's Daily Growth Spark. Keep it as short as the example — no extra length.",
        f"Date: {spark_date}",
        f"Name: {display_name or 'Unknown'}",
        f"Overall behavioral style: {style_title or 'Not available'}",
        f"Style summary: {style_summary or 'Not available'}",
        f"Dominant stress mind-state: {dominant_mind_state or 'Not available'}",
        f"Team context: {team_context or 'some people on their team'}",
    ]
    if previous_sparks:
        lines.append("Prior sparks to avoid repeating:")
        for idx, spark in enumerate(previous_sparks[:3], start=1):
            trimmed = spark.strip()
            if trimmed:
                lines.append(f"{idx}. {trimmed[:400]}")
    return "\n".join(lines)


def build_template_growth_spark_fallback(
    display_name: str | None,
    style_title: str | None,
) -> tuple[str, str]:
    """Privacy-safe fallback when LLM generation is unavailable."""
    style_clean = (style_title or "").strip()

    if style_clean:
        return (
            "Small shifts in how you show up create meaningful momentum.",
            (
                f"As a {style_clean}, clarity in one conversation can matter more than speed today.\n"
                "Listen first, then offer direction.\n"
                "Your GRAY teammates may want specifics. Your GREEN teammates may want alignment.\n"
                "Growth compounds when intention meets consistency."
            ),
        )

    return (
        "Clarity in one conversation can matter more than speed today.",
        (
            "Listen first, then offer direction.\n"
            "Your teammates may need different things — clarity, alignment, or outcomes.\n"
            "Growth compounds when intention meets consistency."
        ),
    )
