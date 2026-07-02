from unittest.mock import MagicMock, patch

from app.repositories.memory_consent_repository import MemoryConsentRepository


def test_is_granted_uses_config_default_when_no_row():
    repo = MemoryConsentRepository(db_client=MagicMock())
    with patch.object(repo, "get", return_value=None):
        with patch(
            "app.repositories.memory_consent_repository.settings.MEMORY_CONSENT_DEFAULT_GRANTED",
            True,
        ):
            assert repo.is_granted("user-hash") is True
        with patch(
            "app.repositories.memory_consent_repository.settings.MEMORY_CONSENT_DEFAULT_GRANTED",
            False,
        ):
            assert repo.is_granted("user-hash") is False


def test_is_granted_honors_explicit_revocation():
    repo = MemoryConsentRepository(db_client=MagicMock())
    with patch.object(repo, "get", return_value={"granted": False}):
        with patch(
            "app.repositories.memory_consent_repository.settings.MEMORY_CONSENT_DEFAULT_GRANTED",
            True,
        ):
            assert repo.is_granted("user-hash") is False


def test_is_granted_honors_explicit_grant():
    repo = MemoryConsentRepository(db_client=MagicMock())
    with patch.object(repo, "get", return_value={"granted": True}):
        with patch(
            "app.repositories.memory_consent_repository.settings.MEMORY_CONSENT_DEFAULT_GRANTED",
            False,
        ):
            assert repo.is_granted("user-hash") is True
