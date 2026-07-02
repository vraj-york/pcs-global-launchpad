import asyncio
from unittest.mock import AsyncMock, MagicMock

from app.models.schema import ChatRequest
from app.observability.context_strategy import ContextStrategy
from app.services.context_profile_service import ContextProfileService


def test_resolve_for_turn_skips_when_strategy_none():
    bsp = MagicMock()
    peers = MagicMock()
    service = ContextProfileService(bsp_injector=bsp, peer_mention_injector=peers)

    result = asyncio.run(
        service.resolve_for_turn(
            request=ChatRequest(message="hi", user_type="employee"),
            persona="employee",
            access_token="token",
            strategy=ContextStrategy.NONE,
            interaction_meta={},
        )
    )

    assert result == (None, None, None, False)
    bsp.get_user_personalization_for_turn.assert_not_called()
