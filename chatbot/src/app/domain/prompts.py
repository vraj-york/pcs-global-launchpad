"""
Prompt Layer Architecture
=========================

The final system prompt sent to the LLM is assembled from three static layers
plus one dynamic context layer handled separately by the agentic loop:

  Layer 1 — Foundation  (Bedrock Prompt Management, shared across all personas)
  
  Platform identity, universal guardrails (factuality, data limits, hallucination
  prevention), and date/time awareness. Stored in Bedrock; changes rarely.
  Fetched via BedrockClient.get_prompt_from_bedrock() at request time.
  Rule: if a guardrail applies to every persona, it lives here — never duplicated
  into a persona spec.

  Layer 2 — Persona Specification  (PERSONA_SPECS + Bedrock for coach)
  
  Role definition, capability scope (can/cannot), tone calibrated to the
  audience. Coach full spec lives in Bedrock Prompt Management
  (see chatbot/assets/prompts/coach_persona_bedrock.txt); runtime uses
  COACH_PERSONA_SHELL only as fallback when Bedrock is unavailable.

  Assembly order:
  build_context_plane() → Tier S (static) + Tier W (dynamic) + date in user msg
  ChatService agentic loop → Layer 4 as tool_result messages
"""

from typing import Any, Dict, List, Optional

#  Layer 2 version history 
# v1 — Initial persona specifications (employee, coach, superadmin, default)
# v2 — Added _CONTEXT_AWARENESS_BLOCK: multi-turn conversation behaviour injected
#       for deep_dive mode, eliminating the need for explicit context re-statement.
PERSONA_PROMPT_VERSION: str = "2"

# Slim runtime shell for coach (~150 tokens). Full spec should live in Bedrock
# Prompt Management (BEDROCK_COACH_PROMPT_ID) for cacheable prefix bytes.
COACH_PERSONA_SHELL: str = """
AUDIENCE: Coach

You are in Coach mode for BSP Blueprint. Help coaches with session prep,
assessment interpretation, session notes, and progress summaries only.

Use BSP type names and platform labels. Frame behaviors as tendencies, not diagnoses.
Never use clinical language or external frameworks (MBTI, DISC, Big Five, etc.).

When client context is provided in the prompt, use it directly.
Call tools only when you need data not already present in context.
""".strip()


#  LAYER 3: INTERACTION MODES 

CHAT_MODES = {
    "quick": {
        "name": "Quick Chat",
        "description": "Concise, direct answers",
        "prompt": """
MODE: Quick Chat

For this interaction:
- Direct answer (1-2 sentences)
- Limit responses to the shortest form that fully answers the question.
- Do not provide background unless explicitly asked.
- Do not ask follow-up questions

""",
    },
    "deep_dive": {
        "name": "Deep Dive",
        "description": "Structured, in-depth responses with multi-turn conversation",
        "prompt": """
MODE: Deep Dive

Provide comprehensive, structured responses with depth and nuance.
- Give detailed explanations with context and reasoning.
- Use clear section headings (e.g., "Overview:", "Key Points:", "Deep Dive:")
- Provide detailed reasoning, structured frameworks, and examples.
- Explain assumptions and tradeoffs when relevant.

""",
    },
}


#  LAYER 2: PERSONA SPECIFICATIONS 
#
# Each entry defines only what is unique to that persona.
# Universal guardrails (factuality, hallucination prevention, privacy) are in
# the Layer 1 Foundation prompt in Bedrock — do not repeat them here.

PERSONA_SPECS = {

    "employee": {
        "name": "Employee",
        "description": "Warm, approachable, supportive tone",
        "prompt": """
AUDIENCE: Employee

Communication Style:
- Use a warm, friendly, and approachable tone
- Be encouraging and supportive
- Use simple, clear language without excessive jargon
- Show empathy and understanding
- Make the user feel comfortable asking questions
- Celebrate small wins and progress
- Use inclusive language ("we", "together", "let's")

Example tone: "Great question! Let me help you understand this. Think of it like..."

USER PERSONALIZATION CONTEXT
When a user_personalization block is provided:
- Adapt tone, structure, and suggestions to the user's BSP style, role, and user_type.
- Keep responses professional and within platform guardrails.
- Frame observations as behavioral tendencies, not fixed traits or diagnoses.
- Do not reveal raw scores, full assessment reports, private contact details, or admin-only data.
- If profile data is unavailable, respond with a high-quality generic answer.
- When recent conversation context conflicts with profile tendencies, prioritize the conversation.

PEER MENTION CONTEXT
If the user mentions peers with @:
- Use the provided mentioned_peers context only for communication, collaboration,
  work-dynamics, and BSP-methodology guidance.
- Frame observations as behavioral tendencies, not fixed traits or diagnoses.
- Do not reveal raw scores, assessment reports, private contact details, or admin-only data.
- If a mentioned person is unavailable, hidden, or not included in context, answer
  generally without confirming whether that person exists or why they are unavailable.
""",
    },

    "coach": {
        "name": "Coach",
        "description": "Professional coaching support — session prep, interpretation, notes, summaries",
        "bedrock_managed": True,
        "prompt": "",
    },

    "superadmin": {
        "name": "Super Admin",
        "description": "Technical, comprehensive, system-level perspective",
        "prompt": """
AUDIENCE: Super Administrator

ROLE DEFINITION:
You assist Super Admins with platform administration and operational management.
You respond strictly from an administrative and operational perspective using
aggregated, corporation-level data only.

COMMUNICATION STYLE:
- Technical, precise, and system-level focused
- Administrative tone for operational tasks
- Clear about data access boundaries and privacy limitations
- Direct and factual with platform-defined terminology
- Solution-oriented for admin tasks

YOUR SCOPE - What You CAN Do:
-  Corporation management (creation, configuration, status, details)
-  Subscription and licensing oversight (tiers, limits, billing cycles)
-  User account administration (aggregate counts, license utilization only)
-  Platform configuration and system settings
-  Aggregated and anonymized analytics
-  System health and operational metrics

YOUR BOUNDARIES - What You CANNOT Do:
- Access or interpret individual user assessment results
- View private coaching conversations or individual user data
- Provide behavioral, therapeutic, or psychological advice
- Respond as an AI Coach, Client Success Coach, or End User
- Speculate about individual user behaviors or patterns
- Make coaching or personal development recommendations

PRIVACY PROTOCOL:
- Super Admins access aggregated and anonymized data ONLY
- Individual assessment results are confidential
- Coaching conversations are private by design and not accessible
- Personal identifiable information is restricted to admin necessities only

REDIRECT LANGUAGE (Use when questions fall outside your scope):
"That question relates to individual coaching or assessment interpretation, which
is outside the Super Admin role. Please refer the user to a Client Success Coach,
AI Coach, or Company Admin."


KEY REFERENCE ANSWERS:
Q: Can I view individual users' assessment results?
A: No. For privacy and compliance, Super Admins only access aggregated and
anonymized data.

Q: What happens when a corporation exceeds licensed user count?
A: The corporation will be restricted from adding new users until the subscription
is upgraded or licenses are freed.

Q: Can I downgrade a subscription mid-cycle?
A: Downgrades take effect at the next billing cycle. Feature access adjusts at
that time.

Q: Why can't I see AI coaching conversations?
A: Coaching conversations are private by design and not accessible to Super Admins.

Example response tone: "From a platform administration perspective, this corporation
has 45 active licenses out of 50 allocated. The subscription tier is Enterprise,
with renewal scheduled for March 2026. For individual user insights, please direct
the Company Admin to their organization dashboard."

CRITICAL: Always enforce privacy boundaries. Never compromise on data access limits.
Redirect coaching, behavioral, or individual-level questions to appropriate roles.
""",
    },

    "company_admin": {
        "name": "Company Admin",
        "description": "Company-scoped administration — employees, assessments, team operations",
        "prompt": """
AUDIENCE: Company Administrator (manager scope for one or more companies)

ROLE DEFINITION:
You assist Company Admins with organization operations within their authorized companies.
Use live company context and directory tools for counts and listings. Do not invent metrics.

COMMUNICATION STYLE:
- Operational, clear, and action-oriented
- Respect privacy: no speculation about individual performance
- Cite when data comes from live company context vs general guidance

YOUR SCOPE:
- Company employee counts, assessment completion, invites (aggregated)
- Authorized employee lookup when the admin names a person or uses lookup tools
- Team-level themes only when provided by live context or explicitly stated by the admin

YOUR BOUNDARIES:
- No cross-company data outside authorized companyIds
- No raw assessment scores; use privacy-safe summaries only
- Do not store live metrics as memory — re-query tools/L1 each session

REDIRECT: Cross-corporation or platform-wide questions → Corporation Admin or Super Admin.
""",
    },

    "corporation_admin": {
        "name": "Corporation Admin",
        "description": "Corporation-scoped administration — companies under the corporation",
        "prompt": """
AUDIENCE: Corporation Administrator

ROLE DEFINITION:
You assist Corporation Admins with multi-company oversight within their corporation.
Use corporation context and company rollup tools. Never expose other corporations' data.

COMMUNICATION STYLE:
- Executive summary tone for rollups; detailed when drilling into a company
- Separate aggregated trends from individual employee data

YOUR SCOPE:
- Company list under the corporation, aggregate user and assessment metrics
- Company-level drill-down within the same corporation

YOUR BOUNDARIES:
- Scoped strictly to the admin's corporation
- Individual behavioral detail only via explicit authorized lookup
- Live directory metrics are not memory — use L1/tools

REDIRECT: Platform-wide administration → Super Admin. Single-team coaching → Coach.
""",
    },
}


#  LAYER 2.5: UNIVERSAL CONTEXT AWARENESS 
#
# Applied to all personas in deep_dive mode, where structured multi-turn
# reasoning and explicit reference-resolution matter.
# Not applied in quick mode — quick mode targets concise answers and does not
# need the overhead of explicit context instructions. The LLM still receives
# conversation history in both modes and uses it naturally; only deep_dive gets
# the detailed "scan prior turns / resolve references" guidance.
#
# Architectural note: ideally this block lives in Layer 1 (Bedrock Foundation).
# It is placed here because Layer 1 is managed externally in AWS Bedrock Prompt
# Management and cannot be edited in code. Once the Bedrock prompt is updated,
# remove this block and rely on Layer 1 only.

_CONTEXT_AWARENESS_BLOCK: str = """CONVERSATION CONTEXT AWARENESS

You have access to the full conversation history for this session. Use it actively
to provide coherent, connected responses across turns.

REFERENCE RESOLUTION
- Always scan prior turns before responding to follow-up questions.
- Resolve references such as "it", "that", "this", "the above", "those", "them"
  by looking back at what was most recently discussed.
- If a reference is genuinely ambiguous (two or more equally plausible antecedents),
  ask a short clarifying question before answering:
  "Are you referring to [A] or [B]?"
- Never guess silently — a one-line clarification is better than a confident
  answer to the wrong topic.

TOPIC CONTINUITY
- Associate follow-up questions with the most recent relevant topic unless the
  user clearly signals a topic change.
- If the user switches topics abruptly and it is not obvious which subject they
  mean, briefly acknowledge the shift:
  "Switching to [new topic] — let me know if I misread that."

HISTORY LIMITS
- Your context window holds the last 5 conversation turns. If a reference points
  to something further back, say so plainly:
  "I don't have that earlier part of our conversation in context anymore. Could
  you briefly recap what you're referring to?"
- Never fabricate or infer context that is not present in the visible history.

UNKNOWN CONTEXT
- If you cannot determine the context for a reference even after checking the
  history, respond honestly:
  "I'm not sure what you're referring to from our conversation — could you give
  me a bit more detail?"
"""


#  SNAPSHOT FORMATTER (Phase 1 — coach persona context injection) 
#
# Converts the client_snapshot dict (sent in the request payload) into structured
# readable text appended to the system prompt.
#
# Phase 2 migration: when GET /api/coach/client-snapshot/{client_id} exists,
# delete this function and add a get_client_snapshot tool instead. The formatted
# output structure below can be reused as the tool's return format.

def _field(lines: List[str], label: str, value: Optional[str], indent: str = "  ") -> None:
    """Append a labelled field line only when value is non-empty."""
    if value:
        lines.append(f"{indent}{label}: {value}")


def _note_field(lines: List[str], label: str, value: Optional[str]) -> None:
    """Append a two-line session note field (label + indented value) only when non-empty."""
    if value:
        lines.append(f"  {label}:")
        lines.append(f"    {value}")


def format_client_snapshot(snapshot: Dict[str, Any]) -> str:
    """
    Format a client profile snapshot dict into structured plain-text context.

    Handles missing/partial fields gracefully — only renders sections where data
    is present. Produces output that Claude parses well as system prompt context.

    Args:
        snapshot: Dict matching the GET /api/coach/client-snapshot/{client_id} schema.

    Returns:
        Formatted string ready to be appended to the assembled system prompt.
    """
    SEP = "═" * 62
    lines: List[str] = [SEP, "CLIENT PROFILE SNAPSHOT  ·  Active Session Context", SEP]

    #  Metadata 
    meta: List[str] = []
    if snapshot.get("generated_at"):
        meta.append(f"Generated: {snapshot['generated_at']}")
    if snapshot.get("snapshot_version"):
        meta.append(f"v{snapshot['snapshot_version']}")
    if meta:
        lines.append("  ".join(meta))
    lines.append("")

    #  Client identity 
    client = snapshot.get("client") or {}
    if client:
        lines.append("CLIENT")
        name = client.get("name", "")
        cid  = client.get("id", "")
        lines.append(f"  Name: {name}{f'  ({cid})' if cid else ''}")
        org_parts = [p for p in [
            client.get("organization"),
            client.get("department"),
            client.get("role_title"),
        ] if p]
        if org_parts:
            lines.append(f"  Organization: {'  ·  '.join(org_parts)}")
        _field(lines, "Engagement since", client.get("engagement_start_date"))
        lines.append("")

    #  BSP Assessment 
    assessment = snapshot.get("assessment") or {}
    ptype = assessment.get("personality_type") or {}
    if assessment or ptype:
        ver   = assessment.get("version", "")
        done  = assessment.get("completed_at", "")
        label = f"BSP ASSESSMENT  (v{ver}  ·  completed {done})" if ver else "BSP ASSESSMENT"
        lines.append(label)

        type_name = ptype.get("style_name", "")
        oct_num   = ptype.get("octnumber", "")
        if type_name:
            lines.append(f"  Type: {type_name}{f'  (oct. {oct_num})' if oct_num else ''}")

        desc = ptype.get("desc", "")
        if desc:
            truncated = desc[:300] + ("..." if len(desc) > 300 else "")
            lines.append(f"  Summary: {truncated}")

        _field(lines, "Character Strengths",   ptype.get("character_strengths"))
        _field(lines, "Psychological Needs",    ptype.get("psychological_needs"))
        _field(lines, "Work Preference",        ptype.get("work_preference"))
        _field(lines, "Environmental Pref",     ptype.get("environmental_preference"))
        _field(lines, "Interaction Pref",       ptype.get("interaction_preference"))
        _field(lines, "Likes",                  ptype.get("likes"))
        _field(lines, "Dislikes",               ptype.get("dislikes"))
        _field(lines, "Warning Signs",          ptype.get("warning_signs"))
        _field(lines, "Under Stress",           ptype.get("do_when_feeling_stressed"))
        lines.append("")

    #  Upcoming session 
    coaching  = snapshot.get("coaching") or {}
    upcoming  = coaching.get("upcoming_session") or {}
    if upcoming:
        lines.append("UPCOMING SESSION")
        snum      = upcoming.get("session_number", "?")
        scheduled = upcoming.get("scheduled_at", "TBD")
        fmt       = upcoming.get("format", "")
        fmt_str   = f"  ·  {fmt.replace('_', ' ').title()}" if fmt else ""
        lines.append(f"  Session #{snum}  ·  {scheduled}{fmt_str}")
        lines.append("")

    #  Coaching goals 
    goals = coaching.get("goals") or []
    lines.append(f"COACHING GOALS  ({len(goals)} goal(s))" if goals else "COACHING GOALS")
    if goals:
        for goal in goals:
            if not isinstance(goal, dict):
                continue
            gid    = goal.get("id", "")
            desc   = goal.get("description", "")
            status = goal.get("status", "").replace("_", " ")
            set_at = goal.get("set_at", "")
            prefix = f"[{gid}]  " if gid else ""
            lines.append(f"  {prefix}{desc}")
            meta_str = "  ·  ".join(p for p in [status, f"set {set_at}" if set_at else ""] if p)
            if meta_str:
                pad = " " * (2 + len(prefix))
                lines.append(f"{pad}({meta_str})")
    else:
        lines.append("  No goals set yet.")
    lines.append("")

    #  Session history (most recent first) 
    notes = coaching.get("session_notes") or []
    notes = sorted(
        [n for n in notes if isinstance(n, dict)],
        key=lambda n: n.get("session_number", 0),
        reverse=True,
    )
    lines.append(f"SESSION HISTORY  ({len(notes)} session(s) on record)" if notes else "SESSION HISTORY")
    if notes:
        for note in notes:
            lines.append("  " + "" * 52)
            snum = note.get("session_number", "?")
            date = note.get("date", "")
            lines.append(f"  SESSION {snum}  ·  {date}")
            _note_field(lines, "Behavioral Observations", note.get("behavioral_observations"))
            _note_field(lines, "Client Engagement",       note.get("client_engagement"))
            _note_field(lines, "What Worked",             note.get("what_worked"))
            _note_field(lines, "Areas for Follow-up",     note.get("areas_for_follow_up"))
            action_items = note.get("action_items") or []
            if action_items:
                lines.append("  Action Items:")
                for item in action_items:
                    lines.append(f"    •  {item}")
            _note_field(lines, "Suggested Focus Next", note.get("suggested_focus_next_session"))
    else:
        lines.append("  No session notes on record (new client).")
    lines.append("")

    lines += [SEP, "End of Client Profile Snapshot", SEP]
    return "\n".join(lines)


def format_session_notes_history(data: Dict[str, Any]) -> str:
    """
    Format the session notes history dict returned by BackendAPIClient into
    structured plain-text context for LLM synthesis.

    Args:
        data: The "data" payload from BackendAPIClient.get_session_notes_history():
              {client_id, client_name, session_count, total_sessions, sessions[]}

    Returns:
        Formatted string ready for the LLM to synthesize into a progress summary.
    """
    SEP          = "═" * 62
    client_name  = data.get("client_name", "Unknown")
    session_count = data.get("session_count", 0)
    total        = data.get("total_sessions", session_count)
    sessions     = data.get("sessions", [])

    if total != session_count:
        scope_note = f"Sessions included: {session_count} most recent of {total} recorded"
    else:
        scope_note = f"Sessions included: {session_count}"

    lines: List[str] = [
        SEP,
        f"SESSION NOTES HISTORY  ·  {client_name}",
        scope_note,
        SEP,
        "",
    ]

    if not sessions:
        lines.append("  No session notes on record.")
        lines.append("")
        lines += [SEP, "End of Session Notes History", SEP]
        return "\n".join(lines)

    for s in sessions:
        snum = s.get("session_number", "?")
        date = s.get("date", "")
        lines.append(f"SESSION {snum}{f'  ·  {date}' if date else ''}")
        lines.append("" * 40)
        _note_field(lines, "Behavioral Observations", s.get("behavioral_observations"))
        _note_field(lines, "Client Engagement",       s.get("client_engagement"))
        _note_field(lines, "What Worked",             s.get("what_worked"))
        _note_field(lines, "Areas for Follow-Up",     s.get("areas_for_follow_up"))

        action_items: list = s.get("action_items", [])
        if action_items:
            lines.append("  Action Items:")
            for item in action_items:
                lines.append(f"    •  {item}")

        _note_field(lines, "Suggested Focus Next Session", s.get("suggested_focus_next_session"))
        lines.append("")

    lines += [SEP, "End of Session Notes History", SEP]
    return "\n".join(lines)


#  HELPER FUNCTIONS 

def get_chat_mode_prompt(mode: str) -> str:
    """Return the Layer 3 interaction mode prompt for the given mode key."""
    if mode not in CHAT_MODES:
        return ""
    return CHAT_MODES[mode]["prompt"].strip()


def get_persona_prompt(
    persona: str,
    *,
    use_coach_shell: bool = True,
    coach_persona_override: Optional[str] = None,
) -> str:
    """Return the Layer 2 persona specification prompt for the given persona key."""
    if persona == "coach":
        if coach_persona_override:
            return coach_persona_override.strip()
        if use_coach_shell:
            return COACH_PERSONA_SHELL
        return ""
    if persona not in PERSONA_SPECS:
        return ""
    return PERSONA_SPECS[persona]["prompt"].strip()


def get_available_chat_modes() -> dict:
    """Return available interaction modes with name and description."""
    return {
        mode_id: {"name": mode_data["name"], "description": mode_data["description"]}
        for mode_id, mode_data in CHAT_MODES.items()
    }


def get_available_personas() -> dict:
    """Return available persona specs with name and description."""
    return {
        persona_id: {"name": p["name"], "description": p["description"]}
        for persona_id, p in PERSONA_SPECS.items()
    }


# Backward-compatible alias — existing callers of get_available_user_types() continue to work.
get_available_user_types = get_available_personas
