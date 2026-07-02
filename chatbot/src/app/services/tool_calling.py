"""
Tool Calling Service

Executes tool calls requested by the LLM. Includes both live-data tools
(backend API) and the knowledge base retrieval tool (vector search).
"""

import json
import logging
from typing import Dict, Any, Optional

from app.infrastructure import BackendAPIClient, BedrockClient
from app.repositories import VectorRepository
from app.config import settings
from app.utils.auth_context import HIGHEST_PRIVILEGE_ROLE
from app.domain.prompts import format_client_snapshot, format_session_notes_history
from app.domain.tools import is_tool_allowed_for_user
from app.utils.permissions import ChatAuthorizationContext

logger = logging.getLogger(__name__)


class ToolCallingService:
    """
    Executes tool calls by routing to the appropriate data source.

    Tools:
      search_knowledge_base  → VectorRepository (RAG retrieval, RBAC-filtered)
      get_corporations_list  → BackendAPIClient
      get_corporation_details→ BackendAPIClient
    """

    def __init__(
        self,
        bedrock_client: Optional[BedrockClient]   = None,
        vector_repo   : Optional[VectorRepository] = None,
    ):
        self.backend_api_client = BackendAPIClient()
        self.bedrock            = bedrock_client or BedrockClient()
        self.vector_repo        = vector_repo    or VectorRepository()
        logger.info(
            f"ToolCallingService initialised — backend: {self.backend_api_client.base_url}"
        )

    async def execute_tool(
        self,
        tool_name    : str,
        tool_input   : Dict[str, Any],
        access_token : Optional[str]  = None,
        user_role        : str            = "default",
        interaction_meta : Optional[dict] = None,
        authorization    : Optional[ChatAuthorizationContext] = None,
    ) -> str:
        """
        Execute a tool and return the result as a JSON string for the LLM.

        Args:
            tool_name:      Name of the tool the LLM has requested.
            tool_input:     Parameters the LLM provided for the tool.
            access_token:   JWT for backend API calls.
            user_role:      Server-authoritative persona — never taken from tool_input.
                            Used for RBAC filtering in search_knowledge_base and
                            coach tool gating.
            authorization:  Resolved read-only RBAC context (enabled submodules)
                            used to gate backend data tools. None degrades to
                            persona-only gating (least privilege).
            retrieval_meta: Mutable dict accumulating knowledge retrieval stats
                            for the audit log. Updated in-place when
                            search_knowledge_base is called.

        Returns:
            JSON string result to pass back to the LLM as a tool_result.

        Raises:
            RBACDeniedError: If search_knowledge_base detects restricted content
                             that the user's role cannot access.
        """
        logger.info(f"execute_tool: {tool_name} | role={user_role} | input={tool_input}")

        #  Defence-in-depth: RBAC authorisation check 
        # The LLM only receives its scoped tool list (from get_tools_for_user),
        # so this should not trigger in normal operation. It guards against edge
        # cases: buggy frontends, prompt injection, or misconfigured tool routing.
        if not is_tool_allowed_for_user(tool_name, user_role, authorization):
            logger.warning(
                f"execute_tool: DENIED — tool '{tool_name}' is not permitted for "
                f"role '{user_role}'. Tool call blocked."
            )
            return json.dumps({
                "error"  : "permission_denied",
                "message": (
                    f"Tool '{tool_name}' is not available for your current role. "
                    "Please use only the tools listed as available for your persona."
                ),
            })

        try:
            if tool_name == "search_knowledge_base":
                return await self._search_knowledge_base(
                    tool_input, user_role, interaction_meta
                )

            elif tool_name == "get_client_snapshot":
                return await self._get_client_snapshot(tool_input, access_token)

            elif tool_name == "get_session_notes_history":
                return await self._get_session_notes_history(tool_input, access_token)

            elif tool_name == "get_corporations_list":
                result = await self.backend_api_client.get_corporations_list(
                    page=tool_input.get("page", 1),
                    limit=tool_input.get("limit", 10),
                    access_token=access_token,
                )
                return json.dumps(result)

            elif tool_name == "get_corporation_details":
                result = await self.backend_api_client.get_corporation_details(
                    corporation_uuid=tool_input.get("corporation_uuid"),
                    access_token=access_token,
                )
                return json.dumps(result)

            else:
                logger.error(f"Unknown tool requested: {tool_name}")
                return json.dumps({"error": f"Unknown tool: {tool_name}"})

        except Exception:
            # RBACDeniedError and domain exceptions propagate — only generic failures
            # are caught here so an individual tool error doesn't crash the whole loop
            raise

    async def _search_knowledge_base(
        self,
        tool_input      : Dict[str, Any],
        user_role       : str,
        interaction_meta: Optional[dict],
    ) -> str:
        """
        Execute a RAG retrieval, enforcing role-based access control.

        RBAC logic mirrors legacy RAG pre-fetch behaviour:
          - Search with the user's role filter
          - If empty and restricted content exists for a higher role → RBACDeniedError
          - If empty with no restricted content → return "not found" message to LLM
          - If results found → return formatted chunks to LLM

        Raises:
            RBACDeniedError: Content exists but is restricted to a higher role.
        """
        from app.domain.exceptions import RBACDeniedError

        query = tool_input.get("query", "")
        top_k = tool_input.get("top_k", settings.RAG_TOP_K)

        if not query:
            return json.dumps({"found": 0, "message": "Empty search query provided."})

        # Generate query embedding
        query_embedding = self.bedrock.generate_embedding(query)

        # Search with user's role filter
        chunks = self.vector_repo.search_similar_chunks(
            query_embedding=query_embedding,
            top_k=top_k,
            user_role=user_role,
        )

        if not chunks:
            # Check whether the absence of results is due to RBAC or genuine absence
            if user_role != HIGHEST_PRIVILEGE_ROLE:
                restricted_check = self.vector_repo.search_similar_chunks(
                    query_embedding=query_embedding,
                    top_k=1,
                    user_role=HIGHEST_PRIVILEGE_ROLE,
                )
                if restricted_check:
                    logger.warning(
                        f"Role '{user_role}' attempted to access restricted knowledge base content."
                    )
                    raise RBACDeniedError(
                        f"The requested information is restricted. "
                        f"Role '{user_role}' does not have access to this content."
                    )

            return json.dumps({
                "found"  : 0,
                "message": "No relevant information found in the knowledge base for this query.",
            })

        # Accumulate retrieval metadata for audit log
        if interaction_meta is not None:
            interaction_meta["retrieved_chunk_count"] += len(chunks)
            interaction_meta["retrieved_source_ids"]  += [c["filename"] for c in chunks]

        logger.info(f"search_knowledge_base: {len(chunks)} chunk(s) retrieved for role '{user_role}'")


        return json.dumps({
            "found"  : len(chunks),
            "results": [
                {
                    "source"   : chunk["filename"],
                    "relevance": round(chunk["similarity"] * 100, 1),
                    "content"  : chunk["chunk_text"],
                }
                for chunk in chunks
            ],
        })

    async def _get_client_snapshot(
        self,
        tool_input  : Dict[str, Any],
        access_token: Optional[str],
    ) -> str:
        """
        Fetch a client's profile snapshot and return it as formatted context.

        The formatted text mirrors what build_context_plane() injects for coach
        client snapshots, so the LLM sees consistent context regardless of path.

        MOCK phase: BackendAPIClient.get_client_snapshot() returns fixture data.
        Production phase: same method makes a real API call — no change here.
        """
        client_id = tool_input.get("client_id", "").strip()

        if not client_id:
            return json.dumps({
                "found"  : False,
                "message": "client_id is required but was not provided.",
            })

        logger.info(f"get_client_snapshot: fetching profile for client_id='{client_id}'")

        result = await self.backend_api_client.get_client_snapshot(
            client_id    = client_id,
            access_token = access_token,
        )

        if "error" in result or "data" not in result:
            logger.warning(f"get_client_snapshot: not found — {result.get('error')}")
            return json.dumps({
                "found"  : False,
                "message": result.get("error", f"No profile found for client '{client_id}'."),
            })

        snapshot  = result["data"]
        formatted = format_client_snapshot(snapshot)
        client    = snapshot.get("client", {})
        name      = client.get("name", client_id)

        logger.info(f"get_client_snapshot: profile loaded for '{name}' ({client_id})")
        return json.dumps({
            "found"    : True,
            "client_id": client_id,
            "profile"  : formatted,
        })

    async def _get_session_notes_history(
        self,
        tool_input  : Dict[str, Any],
        access_token: Optional[str],
    ) -> str:
        """
        Fetch a client's session notes history and return it formatted for LLM synthesis.

        Returns a JSON string with 'found', 'session_count', and 'history' (formatted text).
        The LLM uses the history field to synthesize a progress summary.
        """
        client_id    = tool_input.get("client_id", "").strip()
        max_sessions = int(tool_input.get("max_sessions") or 5)

        if not client_id:
            return json.dumps({
                "found"        : False,
                "session_count": 0,
                "message"      : "client_id is required but was not provided.",
            })

        logger.info(
            f"get_session_notes_history: client_id='{client_id}', max_sessions={max_sessions}"
        )

        result = await self.backend_api_client.get_session_notes_history(
            client_id    = client_id,
            max_sessions = max_sessions,
            access_token = access_token,
        )

        if "error" in result:
            logger.warning(f"get_session_notes_history: not found — {result.get('error')}")
            return json.dumps({
                "found"        : False,
                "session_count": 0,
                "message"      : result["error"],
            })

        data          = result["data"]
        session_count = data.get("session_count", 0)
        client_name   = data.get("client_name", client_id)

        logger.info(
            f"get_session_notes_history: {session_count} session(s) found for '{client_name}'"
        )
        return json.dumps({
            "found"        : True,
            "client_id"    : client_id,
            "session_count": session_count,
            "history"      : format_session_notes_history(data),
        })
