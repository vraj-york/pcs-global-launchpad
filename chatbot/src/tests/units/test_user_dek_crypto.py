from unittest.mock import MagicMock

from app.infrastructure.crypto import CryptoClient
from app.services.memory.user_dek_crypto import UserDekCrypto


def test_user_dek_crypto_dev_mode_roundtrip():
    crypto = CryptoClient(encryption_disabled=True)
    dek_repo = MagicMock()
    dek_crypto = UserDekCrypto(crypto=crypto, dek_repo=dek_repo)

    blob = dek_crypto.encrypt_for_user("user_hash_1", "User prefers bullets")
    text = dek_crypto.decrypt_for_user("user_hash_1", blob)

    assert text == "User prefers bullets"
    dek_repo.get_active.assert_not_called()
