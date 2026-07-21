"""Ollama local LLM provider."""
from __future__ import annotations

from typing import Any, AsyncIterator

import httpx

from app.config.settings import Settings
from app.core.exceptions import ModelError, ProviderUnavailable
from app.providers.base import BaseAIProvider
from app.utils.tokens import estimate_tokens


class OllamaProvider(BaseAIProvider):
    name = "ollama"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.default_model = settings.chat_model

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
            "stream": False,
            "options": {
                "temperature": temperature if temperature is not None else self.settings.temperature,
                "num_predict": max_tokens if max_tokens is not None else self.settings.max_tokens,
                "top_p": kwargs.get("top_p", self.settings.top_p),
                "top_k": kwargs.get("top_k", self.settings.top_k),
            },
        }
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
        except httpx.HTTPError as exc:
            raise ProviderUnavailable(f"Ollama unreachable: {exc}") from exc

        if response.status_code >= 400:
            raise ModelError(f"Ollama error {response.status_code}: {response.text[:300]}")

        data = response.json()
        content = (data.get("message") or {}).get("content", "")
        return {
            "content": content,
            "model": payload["model"],
            "provider": self.name,
            "usage": {
                "prompt_tokens": data.get("prompt_eval_count"),
                "completion_tokens": data.get("eval_count"),
            },
            "raw": data,
        }

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        result = await self.chat(messages, model=model, **kwargs)
        for part in result["content"].split(" "):
            yield part + " "

    async def embeddings(self, texts: list[str], *, model: str | None = None) -> list[list[float]]:
        vectors: list[list[float]] = []
        embed_model = model or self.settings.embedding_model
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                for text in texts:
                    response = await client.post(
                        f"{self.base_url}/api/embeddings",
                        json={"model": embed_model, "prompt": text},
                    )
                    if response.status_code >= 400:
                        raise ModelError(f"Ollama embeddings error: {response.text[:200]}")
                    vectors.append(response.json().get("embedding") or [])
        except httpx.HTTPError as exc:
            raise ProviderUnavailable(f"Ollama embeddings failed: {exc}") from exc
        return vectors

    async def health(self) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
            return {
                "status": "ok" if response.status_code < 400 else "degraded",
                "provider": self.name,
                "details": {"http_status": response.status_code, "base_url": self.base_url},
            }
        except Exception as exc:  # noqa: BLE001
            return {"status": "down", "provider": self.name, "details": {"error": str(exc)}}

    def token_count(self, text: str) -> int:
        return estimate_tokens(text)
