"""
Abstract AI provider — all LLM backends implement this interface.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator


class BaseAIProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Return { content, model, usage, provider }."""

    @abstractmethod
    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Yield content chunks."""
        yield ""  # pragma: no cover — makes this an async generator for type checkers

    @abstractmethod
    async def embeddings(self, texts: list[str], *, model: str | None = None) -> list[list[float]]:
        """Optional provider-side embeddings; may raise if unsupported."""

    @abstractmethod
    async def health(self) -> dict[str, Any]:
        """Return { status, provider, details }."""

    @abstractmethod
    def token_count(self, text: str) -> int:
        """Approximate token count."""
