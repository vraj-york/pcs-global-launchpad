"""
CryptoClient — AES-256-GCM Envelope Encryption via AWS KMS

Architecture
------------
Every encrypt call generates a fresh 256-bit Data Encryption Key (DEK) via
``kms.generate_data_key``. The plaintext DEK encrypts the message locally with
AES-256-GCM, then is immediately discarded. Only the *KMS-encrypted* DEK is
stored alongside the ciphertext.

Wire format (stored in BYTEA columns):
    ┌┐
    │ 4 bytes (uint32 BE)  │ len(encrypted_dek)                              │
    │ N bytes              │ encrypted_dek  (KMS ciphertext blob, ~180 B)    │
    │ 12 bytes             │ nonce          (random IV, unique per encrypt)  │
    │ M bytes + 16 bytes   │ ciphertext + GCM auth tag (AESGCM output)       │
    └┘

Dev mode  (CHATBOT_ENCRYPTION_DISABLED=true)
    The first 4 bytes are 0x00000000 (length == 0 → no DEK, no nonce).
    The remaining bytes are the raw UTF-8 plaintext.
    This allows local development without AWS credentials.
    Decryption detects the sentinel automatically so mixed blobs round-trip.
    NEVER enable this flag in staging or production.

Upgrade path (Distilled Memories)
    Switch from a shared CMK to per-user DEKs: generate one DEK per user on
    first message, encrypt it under the root CMK, store it in a users_keys
    table.  Pass the per-user encrypted DEK directly to decrypt() instead of
    calling generate_data_key each time.  The encrypt/decrypt signatures here
    remain unchanged; only the key_id parameter supplied by the caller changes.
"""

import os
import struct
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

logger = logging.getLogger(__name__)

# 4-byte big-endian uint32 zero — marks dev-mode (unencrypted) blobs
_DEV_SENTINEL = struct.pack(">I", 0)

# Maximum workers for parallel KMS decrypt calls (get_window decrypts ≤12 messages)
_MAX_DECRYPT_WORKERS = 10


class CryptoClient:
    """AES-256-GCM envelope encryption client backed by AWS KMS."""

    def __init__(
        self,
        key_id: Optional[str] = None,
        encryption_disabled: Optional[bool] = None,
    ) -> None:
        """
        Args:
            key_id:              KMS CMK ARN or alias. Defaults to
                                 ``settings.KMS_MESSAGES_KEY_ARN``.
            encryption_disabled: Override for ``settings.CHATBOT_ENCRYPTION_DISABLED``.
                                 Primarily used in unit tests.
        """
        self.key_id = key_id or settings.KMS_MESSAGES_KEY_ARN
        self._disabled = (
            encryption_disabled
            if encryption_disabled is not None
            else settings.CHATBOT_ENCRYPTION_DISABLED
        )
        # Lazily initialised so Lambda cold-starts don't pay the connection cost
        # unless crypto is actually used.
        self._kms: Optional[object] = None

    #  Private helpers 

    def _client(self):
        if self._kms is None:
            self._kms = boto3.client("kms", region_name=settings.AWS_REGION)
        return self._kms

    def _assert_key_id(self) -> None:
        if not self.key_id:
            raise ValueError(
                "KMS_MESSAGES_KEY_ARN is not set. "
                "Set the env var or pass key_id= to CryptoClient(), "
                "or set CHATBOT_ENCRYPTION_DISABLED=true for local development."
            )

    #  Public API 

    def encrypt(self, plaintext: str) -> bytes:
        """
        Encrypt *plaintext* and return a self-contained binary blob.

        In dev mode (encryption_disabled=True) the blob is a 4-zero-byte
        sentinel followed by raw UTF-8 — no KMS call is made.

        Args:
            plaintext: The string to encrypt (e.g. a message body or summary).

        Returns:
            Encrypted bytes following the wire format documented at module level.

        Raises:
            ValueError: If KMS_MESSAGES_KEY_ARN is not configured in prod mode.
        """
        if self._disabled:
            return _DEV_SENTINEL + plaintext.encode("utf-8")

        self._assert_key_id()

        response = self._client().generate_data_key(
            KeyId=self.key_id, KeySpec="AES_256"
        )
        plaintext_key: bytes = response["Plaintext"]
        encrypted_key: bytes = response["CiphertextBlob"]

        nonce = os.urandom(12)
        aesgcm = AESGCM(plaintext_key)
        ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)

        return (
            struct.pack(">I", len(encrypted_key))
            + encrypted_key
            + nonce
            + ciphertext_with_tag
        )

    def decrypt(self, blob: bytes) -> str:
        """
        Decrypt a blob produced by :meth:`encrypt`.

        Handles both encrypted blobs and dev-mode (plaintext) blobs transparently.

        Args:
            blob: The bytes value read from a BYTEA column.

        Returns:
            The original plaintext string.

        Raises:
            ValueError: If the blob is too short to be valid.
        """
        if len(blob) < 4:
            raise ValueError(f"Ciphertext blob too short: {len(blob)} bytes")

        key_len = struct.unpack(">I", blob[:4])[0]

        if key_len == 0:
            # Dev-mode blob — raw UTF-8 follows the 4-byte sentinel
            return blob[4:].decode("utf-8")

        if len(blob) < 4 + key_len + 12:
            raise ValueError("Ciphertext blob is malformed (truncated)")

        encrypted_key = blob[4 : 4 + key_len]
        nonce = blob[4 + key_len : 4 + key_len + 12]
        ciphertext_with_tag = blob[4 + key_len + 12 :]

        response = self._client().decrypt(CiphertextBlob=encrypted_key)
        plaintext_key: bytes = response["Plaintext"]

        aesgcm = AESGCM(plaintext_key)
        return aesgcm.decrypt(nonce, ciphertext_with_tag, None).decode("utf-8")

    def encrypt_batch(self, texts: list[str]) -> list[bytes]:
        """Encrypt multiple strings sequentially.  Returns blobs in the same order."""
        return [self.encrypt(t) for t in texts]

    def decrypt_batch(self, blobs: list[bytes]) -> list[str]:
        """
        Decrypt multiple blobs in parallel using a thread pool.

        Each blob requires one KMS Decrypt call. Parallelising keeps the total
        latency close to a single call rather than sum-of-calls.  The order of
        the output list matches the input list.

        In dev mode no KMS calls are made so the thread pool is not used.
        """
        if not blobs:
            return []

        if self._disabled:
            return [self.decrypt(b) for b in blobs]

        results: dict[int, str] = {}
        workers = min(len(blobs), _MAX_DECRYPT_WORKERS)

        with ThreadPoolExecutor(max_workers=workers) as pool:
            future_to_idx = {
                pool.submit(self.decrypt, blob): i for i, blob in enumerate(blobs)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                results[idx] = future.result()

        return [results[i] for i in range(len(blobs))]
