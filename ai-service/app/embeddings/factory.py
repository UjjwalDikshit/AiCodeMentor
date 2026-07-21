from app.config.settings import Settings
from app.embeddings.base import BaseEmbeddingProvider
from app.embeddings.dummy import DummyEmbeddingProvider
from app.embeddings.huggingface import HuggingFaceEmbeddingProvider, NomicEmbeddingProvider


class EmbeddingFactory:
    @classmethod
    def create(cls, settings: Settings) -> BaseEmbeddingProvider:
        key = (settings.embedding_provider or "dummy").lower()
        if key == "huggingface":
            return HuggingFaceEmbeddingProvider(settings)
        if key == "nomic":
            return NomicEmbeddingProvider(settings)
        return DummyEmbeddingProvider()
