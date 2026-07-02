"""Bedrock Titan embedding wrapper for memory vectors."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.infrastructure.bedrock_client import BedrockClient


class MemoryEmbeddingService:
    def __init__(self, bedrock: "BedrockClient") -> None:
        self._bedrock = bedrock

    def embed_text(self, text: str) -> list[float]:
        return self._bedrock.generate_embedding(text.strip())
