"""Embedding provider interface."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseEmbeddingProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        ...

    @abstractmethod
    async def health(self) -> dict[str, Any]:
        ...

    @property
    @abstractmethod
    def dimension(self) -> int:
        ...
