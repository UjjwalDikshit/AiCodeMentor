"""
LangChain infrastructure wrappers — no application chains yet.
"""
from __future__ import annotations

from typing import Any

from app.providers.base import BaseAIProvider
from app.embeddings.base import BaseEmbeddingProvider


class ChatModelWrapper:
    """Thin adapter so LangChain-style code can call our provider."""

    def __init__(self, provider: BaseAIProvider, model: str | None = None) -> None:
        self.provider = provider
        self.model = model

    async def ainvoke(self, messages: list[dict[str, str]], **kwargs: Any) -> dict[str, Any]:
        return await self.provider.chat(messages, model=self.model, **kwargs)


class EmbeddingWrapper:
    def __init__(self, provider: BaseEmbeddingProvider) -> None:
        self.provider = provider

    async def aembed_documents(self, texts: list[str]) -> list[list[float]]:
        return await self.provider.embed(texts)

    async def aembed_query(self, text: str) -> list[float]:
        return (await self.provider.embed([text]))[0]


def build_prompt_template(template: str, input_variables: list[str] | None = None) -> dict:
    """Return a PromptTemplate-like descriptor without requiring LC instantiation."""
    return {
        "template": template,
        "input_variables": input_variables or [],
        "type": "PromptTemplate",
    }


def parse_json_output(text: str) -> Any:
    import json

    return json.loads(text)


def split_text(text: str, chunk_size: int = 800, chunk_overlap: int = 100) -> list[str]:
    if chunk_size <= 0:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = max(end - chunk_overlap, end)
    return chunks


class DocumentLoader:
    """LangChain-style loader facade over `app.loaders` (infrastructure only)."""

    def __init__(self, loader_key: str = "txt") -> None:
        from app.loaders import LOADERS

        key = loader_key.lower()
        if key not in LOADERS:
            raise ValueError(f"Unknown loader '{loader_key}'. Supported: {sorted(LOADERS)}")
        self.loader_key = key
        self._fn = LOADERS[key]

    def load(self, path: str) -> Any:
        return self._fn(path)

    def load_and_split(
        self,
        path: str,
        *,
        chunk_size: int = 800,
        chunk_overlap: int = 100,
    ) -> list[str]:
        content = self.load(path)
        text = content if isinstance(content, str) else str(content)
        return split_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)


class LoggingCallbackHandler:
    """Minimal callback sink for future LC/LG instrumentation."""

    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def on_event(self, name: str, payload: dict | None = None) -> None:
        self.events.append({"event": name, "payload": payload or {}})
