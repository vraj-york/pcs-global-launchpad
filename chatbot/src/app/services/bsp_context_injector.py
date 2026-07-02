"""
BspContextInjector

Unified server-side injection of BSP behavioral context into LLM system prompts.

Supports:
  - Coach persona: coachee profile via client_id (existing BSPPromptInjector path)
  - Employee/default personas: authenticated user's own compact BSP summary

Production pattern (context engineering):
  - Backend owns authorization and data shaping
  - Chatbot receives bounded XML blocks (~400 tokens)
  - Failures degrade gracefully to generic responses
  - 15-minute in-process cache per Lambda container
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from app.infrastructure.backend_client import BackendAPIClient
from app.observability.context_strategy import ContextStrategy
from app.services.bsp_profile_formatters import (
    append_text,
    format_compact_bsp_subject_block,
    format_user_personalization_user_prefix,
)
from app.utils.cache_keys import personalization_cache_key

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS: int = 15 * 60


class BspContextInjector:
    """Fetches and caches BSP context blocks for LLM system-prompt injection."""

    def __init__(
        self,
        backend_client: Optional[BackendAPIClient] = None,
    ) -> None:
        self._backend: BackendAPIClient = backend_client or BackendAPIClient()
        # Coach cache is keyed by (client_id, requester fingerprint) so a cache
        # hit can never serve one coach's authorized coachee block to a
        # different requester without the backend re-authorizing the fetch.
        self._coach_cache: dict[tuple[str, str], tuple[str, float]] = {}
        self._user_cache: dict[str, tuple[str, Optional[str], dict, float]] = {}

    async def get_behavioral_profile_block(
        self,
        client_id: str,
        access_token: Optional[str] = None,
    ) -> Optional[str]:
        """Return a coach coachee ``<behavioral_profile>`` block for *client_id*."""
        requester = personalization_cache_key(access_token) or "anonymous"
        cache_id = (client_id, requester)
        cached = self._coach_cache.get(cache_id)
        if cached:
            block, expiry = cached
            if time.monotonic() < expiry:
                logger.debug("bsp_coach_cache_hit: client_id=%s", client_id)
                return block

        result = await self._backend.get_client_snapshot(
            client_id=client_id,
            access_token=access_token,
        )
        if "error" in result:
            logger.warning(
                "bsp_coach_profile_fetch_failed",
                extra={"client_id": client_id, "error": result["error"]},
            )
            return None

        snapshot = result.get("data", {})
        if not snapshot:
            logger.warning("bsp_coach_profile_empty: client_id=%s", client_id)
            return None

        block = self._format_coach_profile_block(snapshot)
        self._coach_cache[cache_id] = (block, time.monotonic() + CACHE_TTL_SECONDS)
        logger.info("bsp_coach_profile_cached: client_id=%s", client_id)
        return block

    async def get_user_personalization_block(
        self,
        access_token: Optional[str] = None,
        cache_key: Optional[str] = None,
    ) -> tuple[Optional[str], dict]:
        """Backward-compatible wrapper returning only the system XML block."""
        block, _prefix, meta = await self.get_user_personalization_for_turn(
            access_token=access_token,
            cache_key=cache_key,
            strategy=ContextStrategy.SYSTEM_APPEND,
        )
        return block, meta

    async def get_user_personalization_for_turn(
        self,
        access_token: Optional[str] = None,
        cache_key: Optional[str] = None,
        strategy: ContextStrategy = ContextStrategy.SYSTEM_APPEND,
    ) -> tuple[Optional[str], Optional[str], dict]:
        """
        Return system block and/or user-message prefix for the authenticated user.

        Uses *cache_key* (typically JWT token fingerprint) when provided.
        """
        meta = {
            "profile_available": False,
            "degraded": False,
            "cache_hit": False,
        }

        if cache_key:
            cached = self._user_cache.get(cache_key)
            if cached:
                block, prefix, cached_meta, expiry = cached
                if time.monotonic() < expiry:
                    hit_meta = {**cached_meta, "cache_hit": True}
                    return self._shape_for_strategy(
                        block, prefix, hit_meta, strategy
                    )

        if not access_token:
            meta["degraded"] = True
            return None, None, meta

        result = await self._backend.get_user_personalization_context(
            access_token=access_token,
        )
        if "error" in result:
            logger.warning(
                "user_personalization_fetch_failed",
                extra={"error": result["error"]},
            )
            meta["degraded"] = True
            return None, None, meta

        payload = result.get("data", {})
        if not isinstance(payload, dict) or not payload:
            meta["degraded"] = True
            return None, None, meta

        profile_available = bool(payload.get("profileAvailable"))
        meta["profile_available"] = profile_available
        block = self._format_user_personalization_block(payload)
        prefix = format_user_personalization_user_prefix(payload)

        if cache_key and (block or prefix):
            self._user_cache[cache_key] = (
                block,
                prefix,
                {**meta, "cache_hit": False},
                time.monotonic() + CACHE_TTL_SECONDS,
            )

        return self._shape_for_strategy(block, prefix, meta, strategy)

    async def prefetch_user_personalization(
        self,
        access_token: Optional[str] = None,
        cache_key: Optional[str] = None,
    ) -> None:
        """Warm the in-process cache without blocking the chat critical path."""
        try:
            await self.get_user_personalization_for_turn(
                access_token=access_token,
                cache_key=cache_key,
                strategy=ContextStrategy.SYSTEM_APPEND,
            )
        except Exception as exc:
            logger.warning(
                "user_personalization_prefetch_failed",
                extra={"error": str(exc)},
            )

    @staticmethod
    def _shape_for_strategy(
        block: Optional[str],
        prefix: Optional[str],
        meta: dict,
        strategy: ContextStrategy,
    ) -> tuple[Optional[str], Optional[str], dict]:
        if strategy == ContextStrategy.USER_MESSAGE_PREFIX:
            return None, prefix, meta
        if strategy == ContextStrategy.NONE:
            return None, None, meta
        return block, None, meta

    def invalidate_coach(self, client_id: str) -> None:
        # Cache is keyed by (client_id, requester) — drop every requester's entry.
        for key in [k for k in self._coach_cache if k[0] == client_id]:
            self._coach_cache.pop(key, None)

    def invalidate_user(self, cache_key: str) -> None:
        self._user_cache.pop(cache_key, None)

    def _format_coach_profile_block(self, snapshot: dict) -> str:
        assessment = snapshot.get("assessment", {})
        personality = assessment.get("personality_type", {})
        coaching = snapshot.get("coaching", {})
        client_info = snapshot.get("client", {})

        goals: list[dict] = coaching.get("goals", [])
        goal_lines: list[str] = []
        for goal in goals[:4]:
            status = goal.get("status", "")
            desc = goal.get("description", "")
            if desc:
                goal_lines.append(f'    <goal status="{status}">{desc}</goal>')

        session_notes: list[dict] = coaching.get("session_notes", [])
        latest_focus = ""
        if session_notes:
            latest_focus = session_notes[-1].get("suggested_focus_next_session", "")

        style_desc = _truncate(personality.get("desc", ""), 300)
        stress_advice = _truncate(personality.get("do_when_feeling_stressed", ""), 200)
        goals_xml = "\n".join(goal_lines) if goal_lines else "    <goal>None set</goal>"
        focus_xml = (
            f"\n  <latest_session_focus>{latest_focus}</latest_session_focus>"
            if latest_focus
            else ""
        )

        return (
            "<behavioral_profile>\n"
            f"  <client>\n"
            f"    <name>{client_info.get('name', '')}</name>\n"
            f"    <role>{client_info.get('role_title', '')}</role>\n"
            f"  </client>\n"
            f"  <bsp_style>\n"
            f"    <name>{personality.get('style_name', '')}</name>\n"
            f"    <description>{style_desc}</description>\n"
            f"    <strengths>{personality.get('character_strengths', '')}</strengths>\n"
            f"    <psychological_needs>{personality.get('psychological_needs', '')}</psychological_needs>\n"
            f"    <warning_signs>{personality.get('warning_signs', '')}</warning_signs>\n"
            f"    <stress_response>{stress_advice}</stress_response>\n"
            f"  </bsp_style>\n"
            f"  <active_goals>\n"
            f"{goals_xml}\n"
            f"  </active_goals>"
            f"{focus_xml}\n"
            f"</behavioral_profile>"
        )

    def _format_user_personalization_block(self, payload: dict) -> str:
        extra_lines: list[str] = []
        append_text(extra_lines, "job_role", payload.get("jobRole"), indent="    ")
        append_text(extra_lines, "role_name", payload.get("roleName"), indent="    ")
        append_text(extra_lines, "user_type", payload.get("userType"), indent="    ")

        overall = payload.get("overallStyle")
        overall_payload = None
        if isinstance(overall, dict) and overall:
            overall_payload = {
                "title": overall.get("title"),
                "description": overall.get("description"),
                "interactionPreferences": overall.get("interactionPreferences"),
                "workPreferences": overall.get("workPreferences"),
                "characterStrengths": overall.get("characterStrengths"),
                "psychologicalNeeds": overall.get("psychologicalNeeds"),
                "warningSigns": overall.get("warningSigns"),
                "stressGuidance": overall.get("stressGuidance"),
            }

        return format_compact_bsp_subject_block(
            root_tag="user_personalization",
            privacy="compact_bsp_summary",
            subject_tag="user",
            subject_attrs={
                "id": str(payload.get("id", "")),
                "name": str(payload.get("displayName", "")),
            },
            profile_available=bool(payload.get("profileAvailable")),
            overall_style=overall_payload,
            context_styles=payload.get("contextStyles") if isinstance(payload.get("contextStyles"), dict) else None,
            extra_lines=extra_lines or None,
        )


def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "…"


# Backward-compatible alias used by existing dependency wiring.
BSPPromptInjector = BspContextInjector
