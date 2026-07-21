"""
HuggingFace embeddings — prefers sentence-transformers when installed.
Falls back to DummyEmbeddingProvider vectors if HF stack unavailable
so the infrastructure layer still boots without heavy deps.
"""
from __future__ import annotations

from typing import Any

from app.config.settings import Settings
from app.core.exceptions import EmbeddingError
from app.core.logging import get_logger
from app.embeddings.base import BaseEmbeddingProvider
from app.embeddings.dummy import DummyEmbeddingProvider

logger = get_logger(__name__)


class HuggingFaceEmbeddingProvider(BaseEmbeddingProvider):
    name = "huggingface"

    def __init__(self, settings: Settings, model_name: str | None = None) -> None:
        self.settings = settings
        self.model_name = model_name or settings.embedding_model
        self._model = None
        self._fallback = DummyEmbeddingProvider()
        self._dim = self._fallback.dimension

    def _ensure_model(self) -> None:
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            self._model = SentenceTransformer(self.model_name, token=self.settings.hf_token or None)
            self._dim = int(self._model.get_sentence_embedding_dimension())
        except Exception as exc:  # noqa: BLE001
            logger.warning("HF embeddings unavailable (%s) — using dummy fallback", exc)
            self._model = False  # mark attempted

    @property
    def dimension(self) -> int:
        self._ensure_model()
        return self._dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        self._ensure_model()
        if not self._model:
            return await self._fallback.embed(texts)
        try:
            vectors = self._model.encode(texts, normalize_embeddings=True)
            return [v.tolist() for v in vectors]
        except Exception as exc:  # noqa: BLE001
            raise EmbeddingError(str(exc)) from exc

    async def health(self) -> dict[str, Any]:
        self._ensure_model()
        if not self._model:
            return {
                "status": "fallback",
                "provider": self.name,
                "model": self.model_name,
                "details": "sentence-transformers not installed; dummy vectors active",
            }
        return {
            "status": "ok",
            "provider": self.name,
            "model": self.model_name,
            "dimension": self._dim,
        }


class NomicEmbeddingProvider(HuggingFaceEmbeddingProvider):
    """Nomic models via the same HF pipeline; default model name differs."""

    name = "nomic"

    def __init__(self, settings: Settings) -> None:
        model = settings.embedding_model if "nomic" in settings.embedding_model.lower() else "nomic-ai/nomic-embed-text-v1.5"
        super().__init__(settings, model_name=model)
