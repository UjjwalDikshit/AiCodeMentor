"""Groq OpenAI-compatible chat provider (httpx — no hardcoded SDK usage in services)."""
from __future__ import annotations

from typing import Any, AsyncIterator

import httpx

from app.config.settings import Settings
from app.core.exceptions import ModelError, ProviderUnavailable
from app.providers.base import BaseAIProvider
from app.utils.tokens import estimate_tokens


class GroqProvider(BaseAIProvider):
    name = "groq"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.api_key = settings.groq_api_key
        self.base_url = settings.groq_base_url.rstrip("/")
        self.default_model = settings.chat_model

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ProviderUnavailable("GROQ_API_KEY is not configured")
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.settings.temperature,
            "max_tokens": max_tokens if max_tokens is not None else self.settings.max_tokens,
            "top_p": kwargs.get("top_p", self.settings.top_p),
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._headers(),
                    json=payload,
                )
        except httpx.HTTPError as exc:
            raise ProviderUnavailable(f"Groq unreachable: {exc}") from exc

        if response.status_code >= 400:
            raise ModelError(f"Groq error {response.status_code}: {response.text[:300]}")

        data = response.json()
        choice = (data.get("choices") or [{}])[0]
        content = (choice.get("message") or {}).get("content", "")
        return {
            "content": content,
            "model": data.get("model", payload["model"]),
            "provider": self.name,
            "usage": data.get("usage", {}),
            "raw": data,
        }

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        # Infrastructure stub: non-streaming fallback chunked for clients
        result = await self.chat(messages, model=model, **kwargs)
        text = result["content"]
        chunk_size = 24
        for i in range(0, len(text), chunk_size):
            yield text[i : i + chunk_size]

    async def embeddings(self, texts: list[str], *, model: str | None = None) -> list[list[float]]:
        raise ModelError("GroqProvider does not expose embeddings — use EmbeddingFactory")

    async def health(self) -> dict[str, Any]:
        if not self.api_key:
            return {"status": "unconfigured", "provider": self.name, "details": {"reason": "missing GROQ_API_KEY"}}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )
            ok = response.status_code < 400
            return {
                "status": "ok" if ok else "degraded",
                "provider": self.name,
                "details": {"http_status": response.status_code},
            }
        except Exception as exc:  # noqa: BLE001
            return {"status": "down", "provider": self.name, "details": {"error": str(exc)}}

    def token_count(self, text: str) -> int:
        return estimate_tokens(text)
