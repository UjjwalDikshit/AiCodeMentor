"""Deterministic dummy embeddings for tests / default boot."""
from __future__ import annotations

from typing import Any

from app.embeddings.base import BaseEmbeddingProvider


class DummyEmbeddingProvider(BaseEmbeddingProvider):
    name = "dummy"
    _dim = 32

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            seed = sum(ord(c) for c in text) or 1
            vectors.append([((seed * (i + 1)) % 997) / 997.0 for i in range(self._dim)])
        return vectors

    async def health(self) -> dict[str, Any]:
        return {"status": "ok", "provider": self.name, "model": "hash-dummy", "dimension": self._dim}
