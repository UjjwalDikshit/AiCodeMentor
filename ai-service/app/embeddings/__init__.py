"""
Embedding factory placeholder — swap OpenAI/HF without changing callers.
"""
from app.core.config import get_settings


def get_embedding_model_name() -> str:
    return get_settings().embedding_model


async def embed_texts(_texts: list[str]) -> list[list[float]]:
    """Placeholder — returns empty vectors until embeddings are wired."""
    return []
