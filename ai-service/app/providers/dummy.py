"""Dummy provider — deterministic responses for tests and local boot without keys."""
from __future__ import annotations

from typing import Any, AsyncIterator

from app.providers.base import BaseAIProvider
from app.utils.tokens import estimate_tokens


class DummyProvider(BaseAIProvider):
    name = "dummy"

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        last_user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
        content = f"[dummy] echo: {last_user}"
        return {
            "content": content,
            "model": model or "dummy-echo",
            "provider": self.name,
            "usage": {
                "prompt_tokens": estimate_tokens(" ".join(m.get("content", "") for m in messages)),
                "completion_tokens": estimate_tokens(content),
            },
        }

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        result = await self.chat(messages, model=model, **kwargs)
        for word in result["content"].split(" "):
            yield word + " "

    async def embeddings(self, texts: list[str], *, model: str | None = None) -> list[list[float]]:
        # Deterministic tiny vectors for infra tests
        return [[float((sum(ord(c) for c in t) % 100) / 100.0)] * 8 for t in texts]

    async def health(self) -> dict[str, Any]:
        return {"status": "ok", "provider": self.name, "details": {"mode": "offline-test"}}

    def token_count(self, text: str) -> int:
        return estimate_tokens(text)
