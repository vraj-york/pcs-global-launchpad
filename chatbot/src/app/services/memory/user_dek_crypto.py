"""
Per-user DEK encryption for distilled memories.

Uses one KMS-wrapped DEK per user (stored in user_deks). Memory blobs use a
dedicated wire marker so legacy envelope-encrypted rows still decrypt.
"""

from __future__ import annotations

import logging
import os
import struct
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.infrastructure.crypto import CryptoClient, _DEV_SENTINEL
from app.infrastructure.database import ByteaValue, coerce_bytea
from app.repositories.user_dek_repository import UserDekRepository

logger = logging.getLogger(__name__)

_PER_USER_DEK_MARKER = struct.pack(">I", 1)


class UserDekCrypto:
    def __init__(
        self,
        crypto: CryptoClient,
        dek_repo: Optional[UserDekRepository] = None,
    ) -> None:
        self._crypto = crypto
        self._dek_repo = dek_repo or UserDekRepository()
        self._plaintext_dek_cache: dict[str, bytes] = {}

    def _resolve_plaintext_dek(self, user_id_hash: str) -> bytes:
        cached = self._plaintext_dek_cache.get(user_id_hash)
        if cached is not None:
            return cached

        row = self._dek_repo.get_active(user_id_hash)
        if row:
            ciphertext_blob = coerce_bytea(row["encrypted_dek"])
            if not ciphertext_blob:
                raise ValueError("User DEK ciphertext is empty")
            response = self._crypto._client().decrypt(CiphertextBlob=ciphertext_blob)
            plaintext_dek: bytes = coerce_bytea(response["Plaintext"]) or b""
        else:
            self._crypto._assert_key_id()
            response = self._crypto._client().generate_data_key(
                KeyId=self._crypto.key_id,
                KeySpec="AES_256",
            )
            plaintext_dek = coerce_bytea(response["Plaintext"]) or b""
            ciphertext_blob = coerce_bytea(response["CiphertextBlob"])
            if not ciphertext_blob:
                raise ValueError("KMS generate_data_key returned empty CiphertextBlob")
            self._dek_repo.insert(user_id_hash, ciphertext_blob)

        self._plaintext_dek_cache[user_id_hash] = plaintext_dek
        return plaintext_dek

    def encrypt_for_user(self, user_id_hash: str, plaintext: str) -> bytes:
        if self._crypto._disabled:
            return _DEV_SENTINEL + plaintext.encode("utf-8")

        dek = self._resolve_plaintext_dek(user_id_hash)
        nonce = os.urandom(12)
        ciphertext = AESGCM(dek).encrypt(nonce, plaintext.encode("utf-8"), None)
        return _PER_USER_DEK_MARKER + nonce + ciphertext

    def decrypt_for_user(self, user_id_hash: str, blob: ByteaValue) -> str:
        blob = coerce_bytea(blob) or b""
        if len(blob) < 4:
            raise ValueError(f"Ciphertext blob too short: {len(blob)} bytes")

        if blob[:4] == _DEV_SENTINEL:
            return blob[4:].decode("utf-8")

        if blob[:4] == _PER_USER_DEK_MARKER:
            if len(blob) < 16:
                raise ValueError("Per-user DEK blob is malformed")
            nonce = blob[4:16]
            ciphertext = blob[16:]
            dek = self._resolve_plaintext_dek(user_id_hash)
            return AESGCM(dek).decrypt(nonce, ciphertext, None).decode("utf-8")

        return self._crypto.decrypt(blob)

    def crypto_shred_user(self, user_id_hash: str) -> bool:
        self._plaintext_dek_cache.pop(user_id_hash, None)
        return self._dek_repo.crypto_shred(user_id_hash)
