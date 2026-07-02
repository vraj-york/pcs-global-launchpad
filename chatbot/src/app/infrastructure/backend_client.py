"""
Backend Client

Handles communication with the backend API.
"""

import httpx
from typing import Any, Dict, Optional
import os
import logging

from app.config import settings

logger = logging.getLogger(__name__)


#  MOCK DATA — Remove when GET /api/coach/client-snapshot/{client_id} exists 
# Two representative fixtures: one client with session history, one new client.

_MOCK_CLIENT_SNAPSHOTS: Dict[str, Dict[str, Any]] = {
    "client_0042": {
        "snapshot_version": "1.0",
        "generated_at"    : "2026-03-06T08:00:00Z",
        "client": {
            "id"                   : "client_0042",
            "name"                 : "Sarah Mitchell",
            "email"                : "s.mitchell@clientorg.com",
            "organization"         : "Acme Corp",
            "department"           : "Product",
            "role_title"           : "Senior Product Manager",
            "coach_id"             : "coach_0011",
            "engagement_start_date": "2025-10-01",
        },
        "assessment": {
            "version"         : "1.2",
            "completed_at"    : "2025-10-14T10:30:00Z",
            "personality_type": {
                "octnumber"              : 12,
                "style_name"             : "Authoritarian",
                "desc"                   : (
                    "Red State of Mind is assertive, confident, driven, results-oriented, and strategic. "
                    "Authoritarians are characterized by emergent leadership, fast-thinking, multi-tasking, "
                    "problem-solving, and are self-starters. Authoritarians want to be in control, often "
                    "seeking power, at times impatient, perfectionistic, and agitated. In distress, "
                    "Authoritarians display anger, raising their voice, pushing deadlines, and finding "
                    "fault in self or others."
                ),
                "environmental_preference": "Assert and seeks control",
                "interaction_preference"  : "Shifts between working alone and with others",
                "character_strengths"     : "Assertive, Authoritative, Confident, Driven, Organized, Punctual, Results-oriented",
                "psychological_needs"     : "Recognition for Work, Time Structure, Clearly Defined Goals, Power, Sense of Purpose",
                "likes"                   : "Leadership, Project Completion, Achievement, Closure, Results",
                "work_preference"         : "Leadership roles, driven to transfer thoughts into actions, organizational structure",
                "dislikes"                : "Surprises, Excuses, Inaction, Insubordination, Missing deadlines, Losing control",
                "warning_signs"           : "Perfectionism, Critical, Controlling, Impatient, Frustrated",
                "do_when_feeling_stressed": (
                    "Relinquish the need to do everything yourself. Allow others to help. "
                    "Be flexible with time frames and commitments. Schedule a well-needed break to relax. "
                    "Be willing to answer questions without fault-finding or blame. "
                    "Accept responsibility for your actions and decisions. "
                    "Apologize for any accusations already made."
                ),
            },
        },
        "coaching": {
            "goals": [
                {
                    "id"         : "goal_01",
                    "description": "Develop more effective cross-functional communication",
                    "status"     : "in_progress",
                    "set_at"     : "2025-10-20",
                },
                {
                    "id"         : "goal_02",
                    "description": "Build confidence in stakeholder influence without over-relying on data",
                    "status"     : "in_progress",
                    "set_at"     : "2025-11-05",
                },
            ],
            "upcoming_session": {
                "scheduled_at"  : "2026-03-10T14:00:00Z",
                "session_number": 5,
                "format"        : "video_call",
            },
            "session_notes": [
                {
                    "session_id"                  : "session_001",
                    "session_number"              : 1,
                    "date"                        : "2025-10-20",
                    "behavioral_observations"     : "Strong command of her domain but visibly uncomfortable when asked to reflect on interpersonal dynamics with her team.",
                    "client_engagement"           : "Receptive to structured frameworks. Slight resistance when conversation moved away from task-based topics.",
                    "what_worked"                 : "Anchoring discussion to specific workplace scenarios rather than general reflection.",
                    "areas_for_follow_up"         : "Relationship with direct reports — she deflected twice when this came up.",
                    "action_items"                : [
                        "Client to observe one team meeting and note her communication style vs. others'",
                        "Coach to share methodology reading on Authoritarian profiles in team settings",
                    ],
                    "suggested_focus_next_session": "Start with the observation exercise debrief. Ease into interpersonal reflection from there.",
                },
                {
                    "session_id"                  : "session_002",
                    "session_number"              : 2,
                    "date"                        : "2025-11-05",
                    "behavioral_observations"     : "More open this session. Completed the observation exercise and had concrete examples to discuss.",
                    "client_engagement"           : "More relaxed. Laughed twice — good sign.",
                    "what_worked"                 : "Using her own examples as entry points rather than introducing concepts first.",
                    "areas_for_follow_up"         : "Stakeholder communication upward (with her VP) — mentioned it briefly but moved on.",
                    "action_items"                : [
                        "Client to prepare for VP presentation using the communication preference framework",
                        "Set goal around stakeholder influence for next 60 days",
                    ],
                    "suggested_focus_next_session": "VP presentation debrief. Introduce goal_02 formally.",
                },
                {
                    "session_id"                  : "session_003",
                    "session_number"              : 3,
                    "date"                        : "2025-12-01",
                    "behavioral_observations"     : "Stress pattern visible — came in with a lot of data and analysis. Classic risk-averse mode under pressure.",
                    "client_engagement"           : "Initially closed. Opened up in second half once immediate work pressure was acknowledged.",
                    "what_worked"                 : "Naming the stress pattern explicitly (she found it validating, not critical).",
                    "areas_for_follow_up"         : "How she recovers after high-stress periods. Resilience angle worth exploring.",
                    "action_items"                : [
                        "Client to identify one situation next month where she deliberately slows down analysis and asks a team member's opinion first",
                    ],
                    "suggested_focus_next_session": "Follow up on the experiment. Introduce resilience framing from the methodology.",
                },
                {
                    "session_id"                  : "session_004",
                    "session_number"              : 4,
                    "date"                        : "2026-01-20",
                    "behavioral_observations"     : "Noticeable shift — described asking a colleague for input on a roadmap decision and finding it useful.",
                    "client_engagement"           : "Energised. Brought the topic up herself without prompting.",
                    "what_worked"                 : "The experiment format — small, low-risk actions with observable outcomes suit her profile well.",
                    "areas_for_follow_up"         : "Sustaining the behaviour change under pressure. Will it hold when the next stressful sprint hits?",
                    "action_items"                : [
                        "Coach to check in on this at session 5",
                        "Client to continue the experiment with a different colleague",
                    ],
                    "suggested_focus_next_session": "Review behaviour change sustainability. Assess readiness to tackle goal_02 more directly.",
                },
            ],
        },
    },

    "client_0091": {
        "snapshot_version": "1.0",
        "generated_at"    : "2026-03-06T08:00:00Z",
        "client": {
            "id"                   : "client_0091",
            "name"                 : "James Okafor",
            "email"                : "j.okafor@clientorg.com",
            "organization"         : "Nexus Ltd",
            "department"           : "Engineering",
            "role_title"           : "Engineering Lead",
            "coach_id"             : "coach_0011",
            "engagement_start_date": "2026-03-01",
        },
        "assessment": {
            "version"         : "1.2",
            "completed_at"    : "2026-03-01T10:00:00Z",
            "personality_type": {
                "octnumber"              : 12,
                "style_name"             : "Authoritarian",
                "desc"                   : (
                    "Red State of Mind is assertive, confident, driven, results-oriented, and strategic. "
                    "Authoritarians are characterized by emergent leadership, fast-thinking, multi-tasking, "
                    "problem-solving, and are self-starters. Authoritarians want to be in control, often "
                    "seeking power, at times impatient, perfectionistic, and agitated. In distress, "
                    "Authoritarians display anger, raising their voice, pushing deadlines, and finding "
                    "fault in self or others."
                ),
                "environmental_preference": "Assert and seeks control",
                "interaction_preference"  : "Shifts between working alone and with others",
                "character_strengths"     : "Assertive, Authoritative, Confident, Driven, Organized, Punctual, Results-oriented",
                "psychological_needs"     : "Recognition for Work, Time Structure, Clearly Defined Goals, Power, Sense of Purpose",
                "likes"                   : "Leadership, Project Completion, Achievement, Closure, Results",
                "work_preference"         : "Leadership roles, driven to transfer thoughts into actions, organizational structure",
                "dislikes"                : "Surprises, Excuses, Inaction, Insubordination, Missing deadlines, Losing control",
                "warning_signs"           : "Perfectionism, Critical, Controlling, Impatient, Frustrated",
                "do_when_feeling_stressed": (
                    "Relinquish the need to do everything yourself. Allow others to help. "
                    "Be flexible with time frames and commitments. Schedule a well-needed break to relax. "
                    "Be willing to answer questions without fault-finding or blame. "
                    "Accept responsibility for your actions and decisions. "
                    "Apologize for any accusations already made."
                ),
            },
        },
        "coaching": {
            "goals"            : [],
            "upcoming_session" : {
                "scheduled_at"  : "2026-03-10T10:00:00Z",
                "session_number": 1,
                "format"        : "video_call",
            },
            "session_notes": [],
        },
    },
}


class BackendAPIClient:
    """
    Client to interact with the backend APIs
    """

    def __init__(self):
        raw_base_url = os.getenv("BACKEND_API_URL")
        self.base_url = (raw_base_url or "").strip().rstrip("/") or None
        # self.api_key = os.getenv("BACKEND_API_KEY")  # Fallback API key from env
        self.timeout = 30
        self.warm_context_timeout = settings.WARM_CONTEXT_HTTP_TIMEOUT

        # print(
        #     f"BackendAPIClient initialized: base_url={self.base_url}, has_api_key={self.api_key is not None}"
        # )

        if not self.base_url:
            logger.error("BACKEND_API_URL environment variable is not set!")

    def _get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """
        Common headers for the API requests

        Args:
            access_token: Optional access token from user request (takes precedence over env var)

        Returns:
            Headers dict with Authorization if token available
        """
        headers = {"Content-Type": "application/json"}
        # Use access_token from request if provided, otherwise fallback to env var
        if access_token:
            logger.debug(f"Using access_token (first 50 chars): {access_token[:50]}...")

        token = access_token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def get_client_snapshot(
        self, client_id: str, access_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch a coach client's full profile snapshot.

        Production: server-side fetch with coach JWT (Path B — client_id only).
        Dev/demo: mock fixtures when USE_MOCK_CLIENT_SNAPSHOT=true.

        Nest endpoint (when live):
          GET /users/{client_id}/chatbot/personalization-context
        """
        if settings.USE_MOCK_CLIENT_SNAPSHOT or not self.base_url:
            logger.info(f"get_client_snapshot called: client_id={client_id} [MOCK]")
            snapshot = _MOCK_CLIENT_SNAPSHOTS.get(client_id)
            if snapshot:
                logger.info(f"Mock snapshot found for {client_id}")
                return {"data": snapshot}
            logger.warning(f"Mock snapshot not found for client_id={client_id}")
            return {"error": f"No client profile found for ID '{client_id}'."}

        url = f"{self.base_url.rstrip('/')}/users/{client_id}/chatbot/personalization-context"
        headers = self._get_headers(access_token)
        try:
            async with httpx.AsyncClient(timeout=self.warm_context_timeout) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                payload = response.json()
                data = payload.get("data", payload)
                return {"data": data}
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return {"error": f"No client profile found for ID '{client_id}'."}
            logger.warning(
                "get_client_snapshot_http_error status=%s client_id=%s",
                e.response.status_code,
                client_id,
            )
            return {"error": "Client profile could not be loaded."}
        except httpx.TimeoutException:
            logger.warning("get_client_snapshot_timeout client_id=%s", client_id)
            return {"error": "Client profile request timed out."}
        except Exception as e:
            logger.warning("get_client_snapshot_failed client_id=%s error=%s", client_id, str(e))
            return {"error": "Client profile could not be loaded."}

    async def resolve_peer_mentions(
        self,
        peer_ids: list[str],
        access_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Resolve selected employee @mentions to compact behavioral summaries.

        The Nest backend is the data and authorization owner. This method never
        trusts labels from the browser; it forwards only stable peer IDs and the
        requester's bearer token.
        """
        unique_ids: list[str] = []
        seen: set[str] = set()
        for peer_id in peer_ids:
            trimmed = peer_id.strip()
            if trimmed and trimmed not in seen:
                seen.add(trimmed)
                unique_ids.append(trimmed)
            if len(unique_ids) >= 3:
                break

        if not unique_ids:
            return {"data": {"peers": [], "degradedCount": 0}}

        if not self.base_url:
            return {"error": "BACKEND_API_URL is not configured"}

        url = f"{self.base_url.rstrip('/')}/users/me/peer-mentions/resolve"
        headers = self._get_headers(access_token)
        try:
            async with httpx.AsyncClient(timeout=self.warm_context_timeout) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json={"peerIds": unique_ids},
                )
                response.raise_for_status()
                payload = response.json()
                return {"data": payload.get("data", payload)}
        except httpx.TimeoutException:
            logger.warning(
                "resolve_peer_mentions_timeout url=%s timeout=%s",
                url,
                self.warm_context_timeout,
            )
            return {"error": "Peer mention context timed out."}
        except httpx.HTTPStatusError as e:
            response_body = e.response.text[:500] if e.response.text else ""
            logger.warning(
                "resolve_peer_mentions_http_error status=%s url=%s body=%s",
                e.response.status_code,
                url,
                response_body,
            )
            return {"error": "Peer mention context could not be resolved."}
        except Exception as e:
            logger.warning(
                "resolve_peer_mentions_failed url=%s error=%s",
                url,
                str(e),
            )
            return {"error": "Peer mention context could not be resolved."}

    async def get_user_personalization_context(
        self,
        access_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetch the authenticated user's compact BSP summary for chatbot personalization.

        The Nest backend is the data and authorization owner. Only the requester's
        bearer token is forwarded — no user identifiers from the client body.
        """
        if not access_token:
            return {"error": "Access token is required for personalization context."}

        if not self.base_url:
            return {"error": "BACKEND_API_URL is not configured"}

        url = f"{self.base_url.rstrip('/')}/users/me/chatbot/personalization-context"
        headers = self._get_headers(access_token)
        try:
            async with httpx.AsyncClient(timeout=self.warm_context_timeout) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                payload = response.json()
                return {"data": payload.get("data", payload)}
        except httpx.TimeoutException:
            logger.warning(
                "get_user_personalization_context_timeout url=%s timeout=%s",
                url,
                self.warm_context_timeout,
            )
            return {"error": "User personalization context timed out."}
        except httpx.HTTPStatusError as e:
            response_body = e.response.text[:500] if e.response.text else ""
            logger.warning(
                "get_user_personalization_context_http_error status=%s url=%s body=%s",
                e.response.status_code,
                url,
                response_body,
            )
            return {"error": "User personalization context could not be loaded."}
        except Exception as e:
            logger.warning(
                "get_user_personalization_context_failed url=%s error=%s",
                url,
                str(e),
            )
            return {"error": "User personalization context could not be loaded."}

    async def get_my_authorization(
        self,
        access_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetch the authenticated user's RBAC authorization context.

        Reuses ``GET /users/me/profile``, which returns the user's enabled
        ``submodules`` (the same source the frontend RBAC uses) plus role
        metadata. Only the requester's bearer token is forwarded — no user
        identifiers from the client body. Read-only.
        """
        if not access_token:
            return {"error": "Access token is required for authorization context."}

        if not self.base_url:
            return {"error": "BACKEND_API_URL is not configured"}

        url = f"{self.base_url.rstrip('/')}/users/me/profile"
        headers = self._get_headers(access_token)
        try:
            async with httpx.AsyncClient(timeout=self.warm_context_timeout) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                payload = response.json()
                return {"data": payload.get("data", payload)}
        except httpx.TimeoutException:
            logger.warning(
                "get_my_authorization_timeout url=%s timeout=%s",
                url,
                self.warm_context_timeout,
            )
            return {"error": "Authorization context request timed out."}
        except httpx.HTTPStatusError as e:
            logger.warning(
                "get_my_authorization_http_error status=%s url=%s",
                e.response.status_code,
                url,
            )
            return {"error": "Authorization context could not be loaded."}
        except Exception as e:
            logger.warning("get_my_authorization_failed url=%s error=%s", url, str(e))
            return {"error": "Authorization context could not be loaded."}

    async def get_session_notes_history(
        self,
        client_id   : str,
        max_sessions: int = 5,
        access_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetch a client's session notes history, most recent sessions first.

        MOCK IMPLEMENTATION — Replace the body with a real HTTP call to
        GET /api/coach/clients/{client_id}/session-notes?limit={max_sessions}
        once the backend endpoint exists. Return structure must stay:
          {"data": {client_id, client_name, session_count, total_sessions, sessions[]}}
          {"error": <message>, "session_count": 0}

        Args:
            client_id:    The client's unique identifier.
            max_sessions: Maximum number of most-recent sessions to return.
            access_token: Coach-scoped JWT for auth (unused in mock).
        """
        logger.info(
            f"get_session_notes_history called: client_id={client_id}, max={max_sessions} [MOCK]"
        )

        #  MOCK: extract from fixture data 
        snapshot = _MOCK_CLIENT_SNAPSHOTS.get(client_id)
        if not snapshot:
            logger.warning(f"Mock snapshot not found for client_id={client_id}")
            return {
                "error"        : f"No client found for ID '{client_id}'.",
                "session_count": 0,
            }

        client   = snapshot.get("client", {})
        coaching = snapshot.get("coaching", {})
        all_notes: list = coaching.get("session_notes", [])

        # Most recent sessions first, then take the slice, then chronological order for synthesis.
        sorted_desc = sorted(all_notes, key=lambda s: s.get("session_number", 0), reverse=True)
        selected    = sorted(sorted_desc[:max_sessions], key=lambda s: s.get("session_number", 0))

        logger.info(
            f"Mock history: {len(selected)} of {len(all_notes)} sessions returned for '{client.get('name', client_id)}'"
        )
        return {
            "data": {
                "client_id"     : client_id,
                "client_name"   : client.get("name", client_id),
                "session_count" : len(selected),
                "total_sessions": len(all_notes),
                "sessions"      : selected,
            }
        }

        #  REAL API (uncomment when endpoint exists) 
        # if not self.base_url:
        #     return {"error": "BACKEND_API_URL is not configured", "session_count": 0}
        # url     = f"{self.base_url}/coach/clients/{client_id}/session-notes"
        # params  = {"limit": max_sessions}
        # headers = self._get_headers(access_token)
        # try:
        #     async with httpx.AsyncClient(timeout=self.timeout) as client:
        #         response = await client.get(url, headers=headers, params=params)
        #         response.raise_for_status()
        #         return {"data": response.json()}
        # except httpx.HTTPStatusError as e:
        #     if e.response.status_code == 404:
        #         return {"error": f"No client found for ID '{client_id}'.", "session_count": 0}
        #     return {"error": f"API request failed: {str(e)}", "session_count": 0}
        # except Exception as e:
        #     return {"error": f"Unexpected error: {str(e)}", "session_count": 0}

    async def get_corporations_list(
        self, page: int = 1, limit: int = 10, access_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call the backend API to get the list of corporations

        Args:
            page: Page number
            limit: Items per page
            access_token: Optional access token from user request
        """
        logger.info(
            f"get_corporations_list called: page={page}, limit={limit}, has_token={access_token is not None}"
        )

        if not self.base_url:
            error_msg = "BACKEND_API_URL is not configured"
            logger.error(error_msg)
            return {"error": error_msg}

        url = f"{self.base_url}/corporations"
        params = {"page": page, "limit": limit}
        headers = self._get_headers(access_token)

        logger.info(f"Making request to {url} with params={params}")
        logger.debug(f"Request headers: {headers}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.debug("HTTP client created, making GET request...")
                response = await client.get(url, headers=headers, params=params)
                logger.info(
                    f"Response received: status={response.status_code}, body={response.text[:200]}"
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            error_msg = f"API request failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"error": error_msg}
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"error": error_msg}

    async def get_corporation_details(
        self, corporation_uuid: str, access_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call the backend API to get detailed corporation information by UUID

        Args:
            corporation_uuid: UUID of the corporation
            access_token: Optional access token from user request
        """
        logger.info(
            f"get_corporation_details called: uuid={corporation_uuid}, has_token={access_token is not None}"
        )

        if not self.base_url:
            error_msg = "BACKEND_API_URL is not configured"
            logger.error(error_msg)
            return {"error": error_msg}

        url = f"{self.base_url}/corporations/{corporation_uuid}"
        headers = self._get_headers(access_token)

        logger.info(f"Making request to {url}")
        logger.debug(f"Request headers: {headers}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                logger.debug("HTTP client created, making GET request...")
                response = await client.get(url, headers=headers)
                logger.info(
                    f"Response received: status={response.status_code}, body={response.text[:200]}"
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            error_msg = f"API request failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"error": error_msg}
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {"error": error_msg}
