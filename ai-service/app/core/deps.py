"""
Dependency injection providers for FastAPI Depends().
Services never instantiate LLM providers directly.
"""
from functools import lru_cache
from pathlib import Path

from app.config.settings import Settings, get_settings
from app.providers.factory import ProviderFactory
from app.providers.base import BaseAIProvider
from app.embeddings.factory import EmbeddingFactory, BaseEmbeddingProvider
from app.vectorstore.service import VectorStoreService
from app.prompts.registry import PromptRegistry
from app.memory.factory import MemoryFactory


def get_ai_settings() -> Settings:
    return get_settings()


@lru_cache
def _provider_singleton() -> BaseAIProvider:
    return ProviderFactory.create(get_settings())


def get_ai_provider() -> BaseAIProvider:
    """Resolve chat/LLM provider from AI_PROVIDER config."""
    # Recreate when settings change in tests via cache_clear
    return ProviderFactory.create(get_settings())


def get_embedding_provider() -> BaseEmbeddingProvider:
    return EmbeddingFactory.create(get_settings())


def get_vector_store() -> VectorStoreService:
    settings = get_settings()
    return VectorStoreService(
        persist_directory=settings.chroma_directory,
        default_collection=settings.chroma_collection,
        embedding_provider=get_embedding_provider(),
    )


def get_prompt_registry() -> PromptRegistry:
    settings = get_settings()
    directory = settings.prompts_directory
    path = Path(directory)
    if not path.is_absolute():
        # Resolve from ai-service working directory first, then package-relative
        cwd_path = Path.cwd() / directory
        pkg_path = Path(__file__).resolve().parents[1] / "prompts" / "registry"
        directory = str(cwd_path if cwd_path.exists() else pkg_path)
    return PromptRegistry(directory=directory)


def get_memory_factory() -> MemoryFactory:
    return MemoryFactory()
