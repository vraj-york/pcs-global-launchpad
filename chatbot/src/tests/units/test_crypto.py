"""
CryptoClient Unit Tests

Covers:
  • Dev mode (ENCRYPTION_DISABLED=true) — no KMS calls, plaintext round-trip
  • Prod mode — encrypt path (mocked KMS GenerateDataKey) + decrypt path
  • decrypt_batch parallel dispatch
  • Error paths: missing key_id, malformed blob, truncated blob
"""

import os
import struct
import pytest
from unittest.mock import MagicMock, patch, call
from uuid import uuid4

from app.infrastructure.crypto import CryptoClient, _DEV_SENTINEL


#  Helpers 

FAKE_PLAINTEXT_KEY = os.urandom(32)   # 256-bit AES key
FAKE_ENCRYPTED_KEY = b"fake_kms_blob_" + os.urandom(16)  # ~30 bytes

PLAINTEXT_MSG = "Hello, world! This is a test message."


def _make_kms_client(plaintext_key=FAKE_PLAINTEXT_KEY, encrypted_key=FAKE_ENCRYPTED_KEY):
    """Return a mock boto3 KMS client with GenerateDataKey and Decrypt configured."""
    mock_kms = MagicMock()
    mock_kms.generate_data_key.return_value = {
        "Plaintext": plaintext_key,
        "CiphertextBlob": encrypted_key,
    }
    mock_kms.decrypt.return_value = {"Plaintext": plaintext_key}
    return mock_kms


#  Dev mode (ENCRYPTION_DISABLED=true) 

class TestDevMode:
    """CryptoClient with encryption_disabled=True must never call KMS."""

    def setup_method(self):
        self.crypto = CryptoClient(encryption_disabled=True)

    def test_encrypt_returns_dev_sentinel_prefix(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        assert blob[:4] == _DEV_SENTINEL

    def test_encrypt_stores_plaintext_after_sentinel(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        stored = blob[4:].decode("utf-8")
        assert stored == PLAINTEXT_MSG

    def test_decrypt_round_trips_plaintext(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        result = self.crypto.decrypt(blob)
        assert result == PLAINTEXT_MSG

    def test_no_kms_client_initialised(self):
        # _kms should remain None because we never called _client()
        assert self.crypto._kms is None

    def test_empty_string_round_trips(self):
        blob = self.crypto.encrypt("")
        assert self.crypto.decrypt(blob) == ""

    def test_unicode_round_trips(self):
        text = "Héllo wörld 🌍"
        blob = self.crypto.encrypt(text)
        assert self.crypto.decrypt(blob) == text

    def test_long_text_round_trips(self):
        text = "A" * 10_000
        blob = self.crypto.encrypt(text)
        assert self.crypto.decrypt(blob) == text

    def test_encrypt_batch_returns_list(self):
        texts = ["msg one", "msg two", "msg three"]
        blobs = self.crypto.encrypt_batch(texts)
        assert len(blobs) == 3
        assert all(b[:4] == _DEV_SENTINEL for b in blobs)

    def test_decrypt_batch_round_trips(self):
        texts = ["alpha", "beta", "gamma"]
        blobs = self.crypto.encrypt_batch(texts)
        results = self.crypto.decrypt_batch(blobs)
        assert results == texts

    def test_decrypt_batch_empty_list(self):
        assert self.crypto.decrypt_batch([]) == []


#  Prod mode (real encryption path, KMS mocked) 

class TestProdModeEncrypt:
    """Encrypt path in prod mode: GenerateDataKey → AES-256-GCM → pack wire format."""

    def setup_method(self):
        self.mock_kms = _make_kms_client()
        self.crypto = CryptoClient(
            key_id="arn:aws:kms:us-east-1:123456789012:key/test-key",
            encryption_disabled=False,
        )
        self.crypto._kms = self.mock_kms  # inject mock before any lazy init

    def test_calls_generate_data_key_with_correct_key_id(self):
        self.crypto.encrypt(PLAINTEXT_MSG)
        self.mock_kms.generate_data_key.assert_called_once_with(
            KeyId="arn:aws:kms:us-east-1:123456789012:key/test-key",
            KeySpec="AES_256",
        )

    def test_blob_starts_with_correct_encrypted_key_length(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        key_len = struct.unpack(">I", blob[:4])[0]
        assert key_len == len(FAKE_ENCRYPTED_KEY)

    def test_blob_contains_encrypted_key(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        key_len = struct.unpack(">I", blob[:4])[0]
        stored_key = blob[4 : 4 + key_len]
        assert stored_key == FAKE_ENCRYPTED_KEY

    def test_nonce_is_12_bytes(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        key_len = struct.unpack(">I", blob[:4])[0]
        nonce = blob[4 + key_len : 4 + key_len + 12]
        assert len(nonce) == 12

    def test_two_encryptions_produce_different_nonces(self):
        blob1 = self.crypto.encrypt(PLAINTEXT_MSG)
        blob2 = self.crypto.encrypt(PLAINTEXT_MSG)
        key_len = struct.unpack(">I", blob1[:4])[0]
        nonce1 = blob1[4 + key_len : 4 + key_len + 12]
        nonce2 = blob2[4 + key_len : 4 + key_len + 12]
        # With overwhelmingly high probability, two random 96-bit nonces differ
        assert nonce1 != nonce2

    def test_does_not_start_with_dev_sentinel(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        assert blob[:4] != _DEV_SENTINEL


class TestProdModeDecrypt:
    """Decrypt path in prod mode: unpack blob → KMS Decrypt → AES-256-GCM."""

    def setup_method(self):
        self.mock_kms = _make_kms_client()
        self.crypto = CryptoClient(
            key_id="arn:aws:kms:us-east-1:123456789012:key/test-key",
            encryption_disabled=False,
        )
        self.crypto._kms = self.mock_kms

    def test_round_trip(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        result = self.crypto.decrypt(blob)
        assert result == PLAINTEXT_MSG

    def test_decrypt_calls_kms_with_encrypted_key(self):
        blob = self.crypto.encrypt(PLAINTEXT_MSG)
        self.crypto.decrypt(blob)
        # GenerateDataKey + Decrypt = 2 total calls
        assert self.mock_kms.decrypt.call_count == 1
        decrypt_call_kwargs = self.mock_kms.decrypt.call_args
        # CiphertextBlob passed to decrypt should be FAKE_ENCRYPTED_KEY
        assert decrypt_call_kwargs[1]["CiphertextBlob"] == FAKE_ENCRYPTED_KEY

    def test_unicode_round_trip(self):
        text = "Voilà — ñoño"
        blob = self.crypto.encrypt(text)
        assert self.crypto.decrypt(blob) == text

    def test_decrypt_dev_blob_without_kms(self):
        """A dev-mode blob is correctly decrypted even in prod CryptoClient."""
        dev_blob = _DEV_SENTINEL + b"dev plaintext"
        result = self.crypto.decrypt(dev_blob)
        # KMS Decrypt should NOT have been called for a dev blob
        self.mock_kms.decrypt.assert_not_called()
        assert result == "dev plaintext"


#  Error paths 

class TestCryptoErrors:
    def test_encrypt_raises_when_no_key_id_and_not_disabled(self):
        crypto = CryptoClient(key_id=None, encryption_disabled=False)
        with pytest.raises(ValueError, match="KMS_MESSAGES_KEY_ARN"):
            crypto.encrypt("test")

    def test_decrypt_raises_on_too_short_blob(self):
        crypto = CryptoClient(encryption_disabled=True)
        with pytest.raises(ValueError, match="too short"):
            crypto.decrypt(b"x")

    def test_decrypt_raises_on_truncated_prod_blob(self):
        crypto = CryptoClient(
            key_id="arn:aws:kms:us-east-1:123456789012:key/test-key",
            encryption_disabled=False,
        )
        # Craft a blob that claims key_len=100 but only has 10 bytes of key
        bad_blob = struct.pack(">I", 100) + b"only10byte"
        with pytest.raises(ValueError, match="malformed"):
            crypto.decrypt(bad_blob)


#  Batch decrypt parallelism 

class TestDecryptBatch:
    def test_prod_batch_preserves_order(self):
        mock_kms = _make_kms_client()
        crypto = CryptoClient(
            key_id="arn:aws:kms:us-east-1:123456789012:key/test-key",
            encryption_disabled=False,
        )
        crypto._kms = mock_kms
        texts = [f"message {i}" for i in range(5)]
        blobs = [crypto.encrypt(t) for t in texts]
        results = crypto.decrypt_batch(blobs)
        assert results == texts

    def test_batch_empty_returns_empty(self):
        crypto = CryptoClient(encryption_disabled=True)
        assert crypto.decrypt_batch([]) == []
