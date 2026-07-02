"""
Tool Definitions

All tools available to the LLM, plus a persona-scoped selector so each
role only receives the tools relevant to its function.

Adding a new tool:
  1. Add the tool dict to TOOLS (maintains the full registry)
  2. Add its name to the appropriate role list in _TOOLS_BY_PERSONA
"""

from typing import List, Optional, TYPE_CHECKING

from app.utils.permissions import SUBMODULE_KEYS

if TYPE_CHECKING:
    from app.utils.permissions import ChatAuthorizationContext


TOOLS = [
    {
        "name": "search_knowledge_base",
        "description": """Search the internal knowledge base for BSP methodology,
coaching frameworks, assessment processes, behavioural guidelines, onboarding
materials, or any other documented organisational knowledge.

Use this tool when the user asks about:
- BSP methodology, behavioural types, dimension profiles, coaching principles
- How to interpret or work with a specific personality type or profile
- Assessment processes, feedback guidelines, development frameworks
- Company policies, procedures, or any "how do I..." questions about the platform
- Conceptual explanations that require reference to internal documentation

How to use:
- Formulate a concise, targeted search query — do NOT pass the raw user message
  verbatim; a focused query retrieves more relevant results.
- You may call this tool multiple times with different queries if the question
  spans multiple topics.
- If the results are not relevant, try a rephrased query.
- If no results are found, answer from general knowledge and note the limitation.

Access control is enforced automatically — you will receive only the documents
your current user is permitted to see.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type"       : "string",
                    "description": (
                        "A focused search query derived from the user's question. "
                        "Should be specific and targeted, e.g. 'Authoritarian type coaching approach' "
                        "rather than the full user message."
                    ),
                },
                "top_k": {
                    "type"       : "integer",
                    "description": "Number of document chunks to retrieve. Default 3; use up to 6 for broad topics.",
                    "default"    : 3,
                },
            },
            "required": ["query"],
        },
    },

    {
        "name": "get_client_snapshot",
        "description": """Load a client's full profile snapshot for a coaching session.

Call this tool when an Active Client ID is present in the session context and
you need the client's profile to respond. This is typically at the start of
a coaching interaction before addressing the coach's first question.

Returns: client identity and organisation, BSP personality type assessment
(style name, character strengths, warning signs, stress patterns), active
coaching goals, upcoming session details, and session notes history (last 5).

Use once per session to orient yourself to the client. Do not call repeatedly
within the same conversation — the profile data does not change mid-session.

If the client is not found, respond honestly and ask the coach to verify the ID.

COACH PERSONA ONLY — do not call this tool in other modes.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {
                    "type"       : "string",
                    "description": "The client's unique identifier from the active session context.",
                },
            },
            "required": ["client_id"],
        },
    },

    {
        "name": "get_session_notes_history",
        "description": """Retrieve session notes history for a client to support a progress summary.

Use this tool when the coach explicitly asks for a progress summary, a longitudinal
view of the client's development, or to review session history.

IMPORTANT — avoid double-fetching:
If you have already loaded the client profile via get_client_snapshot this session,
the session notes history is already in your context. Synthesize from that directly
rather than calling this tool again.
Call this tool only when session history is specifically needed and is not yet in context.

Returns: client name, session count, and structured notes for each session
(behavioral observations, engagement, what worked, areas for follow-up, action items,
suggested focus for next session). Sessions are returned in chronological order.

COACH PERSONA ONLY — do not call this tool in other modes.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {
                    "type"       : "string",
                    "description": "The client's unique identifier.",
                },
                "max_sessions": {
                    "type"       : "integer",
                    "description": "Maximum number of most-recent sessions to retrieve. Default 5.",
                    "default"    : 5,
                },
            },
            "required": ["client_id"],
        },
    },

    {
        "name": "get_corporations_list",
        "description": """Retrieves a paginated list of corporations, sorted by creation date (newest first).

Use this when the user asks about:
- Recent corporations or latest registrations
- List of all corporations
- "Show me the latest corporation" (use page=1, limit=1)

Returns basic info: id (UUID), legalName, dataResidencyRegion, executiveSponsorName,
executiveSponsorEmail, noOfCompanies, createdAt.

IMPORTANT: companyCode and UUID are internal — do NOT include them in user responses.
To get full details, use get_corporation_details with the UUID.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "page" : {
                    "type"       : "integer",
                    "description": "Page number (1-based). Default 1.",
                    "default"    : 1,
                },
                "limit": {
                    "type"       : "integer",
                    "description": "Records per page. Default 10. Use 1 to get only the latest.",
                    "default"    : 10,
                },
            },
            "required": [],
        },
    },

    {
        "name": "get_corporation_details",
        "description": """Gets complete details for a specific corporation by UUID.

Use this when the user asks about:
- Specific corporation details
- Corporation status (active / inactive)
- Executive sponsor details (name, role, email, phones)
- Corporation address, industry, phone, website
- Any detail not in the basic list

Returns: status, mode, submittedSteps, dbaName, website, industry, phoneNo,
address object, executiveSponsor object.
IMPORTANT: companyCode and UUID are internal — do NOT include them in responses.""",
        "input_schema": {
            "type": "object",
            "properties": {
                "corporation_uuid": {
                    "type"       : "string",
                    "description": "The corporation UUID (obtain from get_corporations_list first).",
                },
            },
            "required": ["corporation_uuid"],
        },
    },
]


#  Persona-scoped tool sets 
# Each persona receives only the tools relevant to its function.
# Tools not in a persona's list are never sent to the LLM for that persona.

_TOOLS_BY_PERSONA: dict = {
    "coach"              : {"get_client_snapshot", "get_session_notes_history", "search_knowledge_base"},
    "superadmin"         : {"get_corporations_list", "get_corporation_details", "search_knowledge_base"},
    "corporation_admin"  : {"search_knowledge_base"},
    "company_admin"      : {"search_knowledge_base"},
    "employee"           : {"search_knowledge_base"},
}

_PERSONA_TOOL_FALLBACK = "employee"


def get_tools_for_persona(persona: str) -> List[dict]:
    """
    Return the tool subset appropriate for the given persona.

    Args:
        persona: One of "coach", "superadmin", "corporation_admin", "company_admin", "employee".
                 Unrecognised values fall back to the employee tool set.

    Returns:
        List of tool dicts filtered to those allowed for this persona.
    """
    allowed = _TOOLS_BY_PERSONA.get(persona, _TOOLS_BY_PERSONA[_PERSONA_TOOL_FALLBACK])
    return [t for t in TOOLS if t["name"] in allowed]


def is_tool_allowed_for_persona(tool_name: str, persona: str) -> bool:
    """
    Return True if tool_name is in the allowed set for the given persona.

    Used as a server-side defence-in-depth check in execute_tool(), independent
    of the LLM-level scoping done by get_tools_for_persona(). Even if the LLM
    somehow requests a tool outside its scoped list, execution is blocked here.

    Args:
        tool_name: The tool name as received in the tool_use block.
        persona:   The server-authoritative user role / persona.

    Returns:
        True if allowed, False otherwise.
    """
    allowed = _TOOLS_BY_PERSONA.get(persona, _TOOLS_BY_PERSONA[_PERSONA_TOOL_FALLBACK])
    return tool_name in allowed


#  RBAC submodule-gated tools 
# Tools that read backend domain data are gated by the SAME submodule keys the
# backend enforces on their endpoints. The chatbot only ever reads, so write
# submodules are never referenced here. The knowledge base and coach tools are
# not represented in the RBAC submodule grid and stay persona-gated below.
_KB_TOOL = "search_knowledge_base"
_COACH_TOOLS = frozenset({"get_client_snapshot", "get_session_notes_history"})

# tool name → submodule keys; the user needs at least one enabled to read it.
# Corporations endpoints are SuperAdmin-scoped on the backend; corporation
# directory view is only enabled for the Super Admin role category, so this
# mapping resolves to super-admin parity while staying submodule-driven.
_TOOL_REQUIRED_SUBMODULES: dict[str, tuple[str, ...]] = {
    "get_corporations_list": (SUBMODULE_KEYS["CORPORATION_DIRECTORY_VIEW"],),
    "get_corporation_details": (SUBMODULE_KEYS["CORPORATION_DIRECTORY_VIEW"],),
}


def allowed_tool_names_for_user(
    persona: str,
    authorization: Optional["ChatAuthorizationContext"] = None,
) -> set[str]:
    """
    Resolve the read-only tool set for a user from persona + RBAC submodules.

    - The knowledge base is available to every authenticated user (content is
      still RBAC-filtered downstream by role/level).
    - Coach tools are gated by the coach persona (not part of the submodule grid).
    - Data tools are gated by the user's enabled submodules (super admin = all).
    """
    allowed: set[str] = {_KB_TOOL}

    if persona == "coach":
        allowed |= set(_COACH_TOOLS)

    if authorization is not None:
        for tool_name, required_keys in _TOOL_REQUIRED_SUBMODULES.items():
            if authorization.can_any(required_keys):
                allowed.add(tool_name)

    return allowed


def get_tools_for_user(
    persona: str,
    authorization: Optional["ChatAuthorizationContext"] = None,
) -> List[dict]:
    """Return the tool definitions a user may call, gated by persona + RBAC."""
    allowed = allowed_tool_names_for_user(persona, authorization)
    return [t for t in TOOLS if t["name"] in allowed]


def is_tool_allowed_for_user(
    tool_name: str,
    persona: str,
    authorization: Optional["ChatAuthorizationContext"] = None,
) -> bool:
    """Defence-in-depth check mirroring ``get_tools_for_user`` for execute_tool()."""
    return tool_name in allowed_tool_names_for_user(persona, authorization)
