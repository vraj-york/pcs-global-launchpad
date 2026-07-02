from __future__ import annotations

from typing import Optional


def xml_escape(value: object) -> str:
    text = str(value or "")
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def append_text(lines: list[str], tag: str, value: Optional[str], indent: str = "      ") -> None:
    if value:
        lines.append(f"{indent}<{tag}>{xml_escape(value)}</{tag}>")


def append_list(
    lines: list[str],
    tag: str,
    values: Optional[list[str]],
    indent: str = "      ",
) -> None:
    if not values:
        return
    lines.append(f"{indent}<{tag}>")
    for value in values[:3]:
        lines.append(f"{indent}  <item>{xml_escape(value)}</item>")
    lines.append(f"{indent}</{tag}>")


def format_overall_style_block(overall: dict, indent: str = "    ") -> list[str]:
    lines = [f"{indent}<overall_style>"]
    lines.append(
        f"{indent}  <title>{xml_escape(overall.get('title', ''))}</title>"
    )
    append_text(lines, "description", overall.get("description"), f"{indent}  ")
    append_list(
        lines,
        "interaction_preferences",
        overall.get("interactionPreferences"),
        f"{indent}  ",
    )
    append_list(
        lines,
        "work_preferences",
        overall.get("workPreferences"),
        f"{indent}  ",
    )
    append_list(
        lines,
        "character_strengths",
        overall.get("characterStrengths"),
        f"{indent}  ",
    )
    append_list(
        lines,
        "psychological_needs",
        overall.get("psychologicalNeeds"),
        f"{indent}  ",
    )
    append_list(
        lines,
        "warning_signs",
        overall.get("warningSigns"),
        f"{indent}  ",
    )
    append_text(
        lines,
        "stress_guidance",
        overall.get("stressGuidance"),
        f"{indent}  ",
    )
    lines.append(f"{indent}</overall_style>")
    return lines


def format_context_styles_block(
    context_styles: dict,
    indent: str = "    ",
) -> list[str]:
    lines = [f"{indent}<context_styles>"]
    for context, title in context_styles.items():
        if title:
            lines.append(
                f'{indent}  <style context="{xml_escape(context)}">'
                f"{xml_escape(title)}</style>"
            )
    lines.append(f"{indent}</context_styles>")
    return lines


def format_user_personalization_user_prefix(payload: dict) -> Optional[str]:
    """
    Compact user-message prefix for employee quick chat.

    Keeps the system prompt stable while still grounding the model in the
    authenticated user's BSP style summary.
    """
    if not payload.get("profileAvailable"):
        return None

    overall = payload.get("overallStyle")
    if not isinstance(overall, dict) or not overall:
        return None

    title = str(overall.get("title") or "").strip()
    description = str(overall.get("description") or "").strip()
    if len(description) > 120:
        description = description[:120].rstrip() + "…"

    prefs = overall.get("interactionPreferences")
    pref_hint = ""
    if isinstance(prefs, list) and prefs:
        pref_hint = str(prefs[0]).strip()

    lines = [
        "[User context — recent conversation takes precedence over profile]",
    ]
    if title:
        style_line = f"Style: {title}"
        if description:
            style_line = f"{style_line} — {description}"
        lines.append(style_line)
    if pref_hint:
        lines.append(f"Interaction preference: {pref_hint}")

    return "\n".join(lines)


def format_compact_bsp_subject_block(
    *,
    root_tag: str,
    privacy: str,
    subject_tag: str,
    subject_attrs: dict[str, str],
    profile_available: bool,
    overall_style: Optional[dict] = None,
    context_styles: Optional[dict] = None,
    extra_lines: Optional[list[str]] = None,
) -> str:
    lines = [f'<{root_tag} privacy="{privacy}">']
    attr_text = " ".join(
        f'{key}="{xml_escape(value)}"' for key, value in subject_attrs.items()
    )
    lines.append(f"  <{subject_tag} {attr_text}>")

    if extra_lines:
        lines.extend(extra_lines)

    if profile_available and overall_style:
        lines.extend(format_overall_style_block(overall_style, indent="    "))
    else:
        lines.append("    <profile_available>false</profile_available>")

    if profile_available and context_styles:
        lines.extend(format_context_styles_block(context_styles, indent="    "))

    lines.append(f"  </{subject_tag}>")
    lines.append(f"</{root_tag}>")
    return "\n".join(lines)
