import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

from app.services.bsp_context_injector import BspContextInjector
from app.observability.context_strategy import ContextStrategy
from app.services.bsp_profile_formatters import format_compact_bsp_subject_block


def test_get_user_personalization_block_formats_xml_and_caches():
    backend = MagicMock()
    backend.get_user_personalization_context = AsyncMock(
        return_value={
            "data": {
                "id": "user-1",
                "displayName": "Jamie Lee",
                "jobRole": "Product Manager",
                "roleName": "Individual Contributor",
                "userType": "employee",
                "profileAvailable": True,
                "overallStyle": {
                    "title": "Pioneer",
                    "description": "Moves quickly.",
                    "interactionPreferences": ["direct updates"],
                    "workPreferences": ["clear outcomes"],
                    "characterStrengths": ["initiative"],
                    "psychologicalNeeds": ["autonomy"],
                    "warningSigns": ["impatience"],
                    "stressGuidance": "May push harder for control.",
                },
                "contextStyles": {
                    "professional_typical": "Collaborator",
                },
            }
        }
    )
    injector = BspContextInjector(backend_client=backend)

    async def run() -> tuple:
        block, meta = await injector.get_user_personalization_block(
            access_token="token-abc",
            cache_key="cache-1",
        )
        block_cached, meta_cached = await injector.get_user_personalization_block(
            access_token="token-abc",
            cache_key="cache-1",
        )
        return block, meta, block_cached, meta_cached

    block, meta, block_cached, meta_cached = asyncio.run(run())

    assert meta["profile_available"] is True
    assert meta["degraded"] is False
    assert block is not None
    assert "<user_personalization" in block
    assert "Jamie Lee" in block
    assert "Pioneer" in block
    assert block_cached == block
    assert meta_cached["profile_available"] is True
    assert meta_cached["cache_hit"] is True
    backend.get_user_personalization_context.assert_awaited_once()


def test_get_user_personalization_block_degrades_on_backend_error():
    backend = MagicMock()
    backend.get_user_personalization_context = AsyncMock(
        return_value={"error": "User personalization context could not be loaded."}
    )
    injector = BspContextInjector(backend_client=backend)

    block, meta = asyncio.run(
        injector.get_user_personalization_block(
            access_token="token-abc",
            cache_key="cache-2",
        )
    )

    assert block is None
    assert meta["degraded"] is True
    assert meta["profile_available"] is False


def test_format_compact_bsp_subject_block_escapes_xml():
    block = format_compact_bsp_subject_block(
        root_tag="user_personalization",
        privacy="compact_bsp_summary",
        subject_tag="user",
        subject_attrs={"id": "u1", "name": 'Jamie "Quick" & Co'},
        profile_available=False,
    )

    assert "&quot;" in block
    assert "&amp;" in block


def test_get_behavioral_profile_block_uses_coach_cache():
    backend = MagicMock()
    backend.get_client_snapshot = AsyncMock(
        return_value={
            "data": {
                "client": {"name": "Sarah", "role_title": "PM"},
                "assessment": {
                    "personality_type": {
                        "style_name": "Authoritarian",
                        "desc": "Direct",
                        "character_strengths": "Assertive",
                        "psychological_needs": "Goals",
                        "warning_signs": "Impatient",
                        "do_when_feeling_stressed": "Slow down",
                    }
                },
                "coaching": {"goals": [], "session_notes": []},
            }
        }
    )
    injector = BspContextInjector(backend_client=backend)

    async def run() -> None:
        first = await injector.get_behavioral_profile_block("client_1", access_token="t")
        second = await injector.get_behavioral_profile_block("client_1", access_token="t")
        assert first == second
        backend.get_client_snapshot.assert_awaited_once()

        # Force-expire every cached entry (key is (client_id, requester)).
        injector._coach_cache = {
            key: (value[0], time.monotonic() - 1)
            for key, value in injector._coach_cache.items()
        }
        await injector.get_behavioral_profile_block("client_1", access_token="t")
        assert backend.get_client_snapshot.await_count == 2

    asyncio.run(run())


def test_get_behavioral_profile_block_scopes_cache_per_requester():
    """A cached coachee block must not be served to a different requester."""
    backend = MagicMock()
    backend.get_client_snapshot = AsyncMock(
        return_value={
            "data": {
                "client": {"name": "Sarah", "role_title": "PM"},
                "assessment": {"personality_type": {"style_name": "Authoritarian"}},
                "coaching": {"goals": [], "session_notes": []},
            }
        }
    )
    injector = BspContextInjector(backend_client=backend)

    async def run() -> None:
        await injector.get_behavioral_profile_block("client_1", access_token="coach_a")
        # Different requester token → backend must re-authorize, no cache hit.
        await injector.get_behavioral_profile_block("client_1", access_token="coach_b")
        assert backend.get_client_snapshot.await_count == 2

    asyncio.run(run())


def test_user_message_prefix_strategy_returns_prefix_only():
    backend = MagicMock()
    backend.get_user_personalization_context = AsyncMock(
        return_value={
            "data": {
                "id": "user-1",
                "displayName": "Jamie Lee",
                "profileAvailable": True,
                "overallStyle": {
                    "title": "Pioneer",
                    "description": "Moves quickly.",
                    "interactionPreferences": ["direct updates"],
                },
            }
        }
    )
    injector = BspContextInjector(backend_client=backend)

    block, prefix, meta = asyncio.run(
        injector.get_user_personalization_for_turn(
            access_token="token-abc",
            cache_key="cache-prefix",
            strategy=ContextStrategy.USER_MESSAGE_PREFIX,
        )
    )

    assert block is None
    assert prefix is not None
    assert "Pioneer" in prefix
    assert meta["profile_available"] is True
