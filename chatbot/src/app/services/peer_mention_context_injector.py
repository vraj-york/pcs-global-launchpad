from __future__ import annotations

import logging
import time
from typing import Optional

from app.infrastructure.backend_client import BackendAPIClient
from app.models.schema import ChatMention

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 15 * 60


class PeerMentionContextInjector:
    """
    Fetches and formats compact peer behavioral summaries for employee @mentions.

    Raw assessment scores and full reports stay in the Nest backend. The chatbot
    receives a bounded XML block with only collaboration-relevant fields.
    """

    def __init__(self, backend_client: Optional[BackendAPIClient] = None) -> None:
        self._backend = backend_client or BackendAPIClient()
        self._cache: dict[str, tuple[str, dict, float]] = {}

    async def get_mentioned_peers_block(
        self,
        mentions: list[ChatMention],
        access_token: Optional[str] = None,
    ) -> tuple[Optional[str], dict]:
        peer_ids = [mention.id for mention in mentions if mention.type == "person"]
        if not peer_ids:
            return None, {"requested": 0, "resolved": 0, "degraded": 0}

        # Sort so that ["A","B"] and ["B","A"] hit the same cache entry.
        cache_key = ",".join(sorted(peer_ids))
        cached = self._cache.get(cache_key)
        if cached:
            block, meta, expiry = cached
            if time.monotonic() < expiry:
                return block, meta

        result = await self._backend.resolve_peer_mentions(
            peer_ids=peer_ids,
            access_token=access_token,
        )
        if "error" in result:
            logger.warning(
                "peer_mentions_resolve_failed",
                extra={"error": result["error"]},
            )
            return None, {
                "requested": len(peer_ids),
                "resolved": 0,
                "degraded": len(peer_ids),
            }

        data = result.get("data", {})
        peers = data.get("peers", []) if isinstance(data, dict) else []
        degraded_count = data.get("degradedCount", 0) if isinstance(data, dict) else 0
        meta = {
            "requested": len(peer_ids),
            "resolved": len(peers),
            "degraded": int(degraded_count or 0),
        }
        block = self._format_peers_block(peers, meta) if peers else None
        if block:
            self._cache[cache_key] = (block, meta, time.monotonic() + CACHE_TTL_SECONDS)
        return block, meta

    def _format_peers_block(self, peers: list[dict], meta: dict) -> str:
        lines = [
            '<mentioned_peers privacy="compact_bsp_summary" max_mentions="3">',
            (
                f'  <resolution requested="{meta["requested"]}" '
                f'resolved="{meta["resolved"]}" degraded="{meta["degraded"]}" />'
            ),
        ]

        for peer in peers[:3]:
            lines.append(
                f'  <peer id="{_xml_escape(peer.get("id", ""))}" '
                f'name="{_xml_escape(peer.get("displayName", ""))}">'
            )
            if peer.get("jobRole"):
                lines.append(f'    <role>{_xml_escape(peer["jobRole"])}</role>')

            overall = peer.get("overallStyle")
            if overall:
                lines.append("    <overall_style>")
                lines.append(
                    f'      <title>{_xml_escape(overall.get("title", ""))}</title>'
                )
                _append_text(lines, "description", overall.get("description"))
                _append_list(
                    lines,
                    "interaction_preferences",
                    overall.get("interactionPreferences"),
                )
                _append_list(lines, "work_preferences", overall.get("workPreferences"))
                _append_list(
                    lines,
                    "character_strengths",
                    overall.get("characterStrengths"),
                )
                _append_list(
                    lines,
                    "psychological_needs",
                    overall.get("psychologicalNeeds"),
                )
                _append_list(lines, "warning_signs", overall.get("warningSigns"))
                _append_text(lines, "stress_guidance", overall.get("stressGuidance"))
                lines.append("    </overall_style>")
            else:
                lines.append("    <profile_available>false</profile_available>")

            context_styles = peer.get("contextStyles") or {}
            if context_styles:
                lines.append("    <context_styles>")
                for context, title in context_styles.items():
                    if title:
                        lines.append(
                            f'      <style context="{_xml_escape(context)}">'
                            f"{_xml_escape(title)}</style>"
                        )
                lines.append("    </context_styles>")

            lines.append("  </peer>")

        lines.append("</mentioned_peers>")
        return "\n".join(lines)


def _append_text(lines: list[str], tag: str, value: Optional[str]) -> None:
    if value:
        lines.append(f"      <{tag}>{_xml_escape(value)}</{tag}>")


def _append_list(lines: list[str], tag: str, values: Optional[list[str]]) -> None:
    if not values:
        return
    lines.append(f"      <{tag}>")
    for value in values[:3]:
        lines.append(f"        <item>{_xml_escape(value)}</item>")
    lines.append(f"      </{tag}>")


def _xml_escape(value: object) -> str:
    text = str(value or "")
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
