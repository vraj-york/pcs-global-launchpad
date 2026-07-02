"""Prompt fragments and XML formatting for distilled memories."""

from __future__ import annotations

from app.domain.memory_registry import MEMORY_KINDS, bsp_dimension_rules_for_prompt
from app.services.memory.memory_policy import (
    L1_L3_PRECEDENCE_INSTRUCTION,
    MEMORY_USAGE_INSTRUCTION,
)


def build_extraction_system_prompt() -> str:
    kinds = ", ".join(sorted(MEMORY_KINDS))
    dimension_rules = bsp_dimension_rules_for_prompt()
    return f"""You extract 0-3 durable memories from a chat turn. Output strict JSON only.

Schema:
{{"memories": [
  {{"kind": "<one of: {kinds}>",
    "text": "third-person statement about the user",
    "bsp_dimension": "<see kind rules below, or null>",
    "entities": ["Name"],
    "importance": 0.0,
    "scope_type": "personal|coachee|team|organization",
    "scope_ref": null,
    "sensitivity": "normal|restricted|team"
  }}
]}}

Kind selection (pick the best fit):
- preference: how/when they work or want answers (schedule, format, tone)
- goal: stated objectives they are actively pursuing (delegation, promotion prep)
- behavioural_insight: self-described patterns (not BSP scores)
- fact: stable work context (role, team size)
- relationship: named people or reporting lines

bsp_dimension by kind (must match — use null when unsure):
{dimension_rules}

Rules:
- Only NEW facts not in existing_memories or the BSP profile summary.
- Skip chit-chat, thanks, ok, greetings.
- Never infer clinical, medical, protected-class, or performance rating attributes.
- Never store numeric BSP assessment scores — those belong in the live profile.
- Use third-person (e.g. "User prefers bullet answers").
- importance below 0.3 means discard — do not include low-value items.
- Max 3 memories per turn.
- org_insight: never extract automatically.
"""


def format_memories_xml(
    memories: list[dict],
    *,
    include_precedence: bool = True,
) -> str:
    if not memories:
        return ""

    lines = ["<extracted_memories>"]
    if include_precedence:
        lines.append(f"<precedence>{L1_L3_PRECEDENCE_INSTRUCTION}</precedence>")
        lines.append(f"<usage>{MEMORY_USAGE_INSTRUCTION}</usage>")

    for item in memories:
        kind = item.get("kind", "fact")
        text = item.get("text", "").strip()
        if not text:
            continue
        dim = item.get("bsp_dimension")
        dim_attr = f' bsp_dimension="{dim}"' if dim else ""
        lines.append(f'  <memory kind="{kind}"{dim_attr}>{text}</memory>')

    lines.append("</extracted_memories>")
    return "\n".join(lines)
