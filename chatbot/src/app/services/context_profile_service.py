"""
Unified warm-tier context resolution (Phase 2).

Single entry point for user, peer, and coach BSP shapes. Injectors remain
as adapters; this service owns turn strategy and prefetch orchestration.
"""

from __future__ import annotations

import logging
from typing import Optional, TYPE_CHECKING

from app.models.schema import ChatRequest
from app.observability.context_strategy import ContextStrategy
from app.utils.cache_keys import personalization_cache_key

if TYPE_CHECKING:
    from app.services.bsp_context_injector import BspContextInjector
    from app.services.peer_mention_context_injector import PeerMentionContextInjector

logger = logging.getLogger(__name__)


class ContextProfileService:
    """Resolves warm-tier BSP context for chat turns."""

    def __init__(
        self,
        bsp_injector: Optional["BspContextInjector"] = None,
        peer_mention_injector: Optional["PeerMentionContextInjector"] = None,
    ) -> None:
        self._bsp = bsp_injector
        self._peers = peer_mention_injector

    async def prefetch_self(
        self,
        access_token: Optional[str],
        user_id_hash: Optional[str] = None,
    ) -> None:
        if not self._bsp or not access_token:
            return
        await self._bsp.prefetch_user_personalization(
            access_token=access_token,
            cache_key=personalization_cache_key(access_token, user_id_hash),
        )

    async def resolve_for_turn(
        self,
        *,
        request: ChatRequest,
        persona: str,
        access_token: Optional[str],
        strategy: ContextStrategy,
        interaction_meta: Optional[dict],
    ) -> tuple[
        Optional[str],
        Optional[str],
        Optional[str],
        bool,
    ]:
        """
        Return (system_block, user_prefix, peer_block, warm_cache_hit).
        """
        needs_personalization = (
            strategy != ContextStrategy.NONE
            and persona in {"employee", "superadmin", "company_admin", "corporation_admin"}
            and self._bsp is not None
        )
        needs_peers = (
            persona == "employee"
            and bool(request.mentions)
            and self._peers is not None
        )

        if not needs_personalization and not needs_peers:
            return None, None, None, False

        import asyncio

        warm_cache_hit = False
        user_block: Optional[str] = None
        user_prefix: Optional[str] = None
        peer_block: Optional[str] = None

        user_id_hash = (
            interaction_meta.get("_user_id_hash") if interaction_meta else None
        )

        async def fetch_personalization() -> tuple[Optional[str], Optional[str], bool]:
            if not needs_personalization or not self._bsp:
                return None, None, False
            cache_key = personalization_cache_key(access_token, user_id_hash)
            block, prefix, meta = await self._bsp.get_user_personalization_for_turn(
                access_token=access_token,
                cache_key=cache_key,
                strategy=strategy,
            )
            if interaction_meta is not None:
                interaction_meta["user_personalization_available"] = meta.get(
                    "profile_available", False
                )
                interaction_meta["user_personalization_degraded"] = meta.get(
                    "degraded", False
                )
            return block, prefix, bool(meta.get("cache_hit"))

        async def fetch_peers() -> Optional[str]:
            if not needs_peers or not self._peers:
                return None
            block, meta = await self._peers.get_mentioned_peers_block(
                mentions=request.mentions,
                access_token=access_token,
            )
            if interaction_meta is not None:
                interaction_meta["peer_mentions_requested"] = meta.get("requested", 0)
                interaction_meta["peer_mentions_resolved"] = meta.get("resolved", 0)
                interaction_meta["peer_mentions_degraded"] = meta.get("degraded", 0)
            return block

        if needs_personalization and needs_peers:
            (user_block, user_prefix, user_cached), peer_block = await asyncio.gather(
                fetch_personalization(),
                fetch_peers(),
            )
            warm_cache_hit = user_cached
        elif needs_personalization:
            user_block, user_prefix, warm_cache_hit = await fetch_personalization()
        else:
            peer_block = await fetch_peers()

        return user_block, user_prefix, peer_block, warm_cache_hit

    async def resolve_coachee_block(
        self,
        *,
        client_id: str,
        access_token: Optional[str],
    ) -> Optional[str]:
        if not self._bsp:
            return None
        return await self._bsp.get_behavioral_profile_block(
            client_id=client_id,
            access_token=access_token,
        )
