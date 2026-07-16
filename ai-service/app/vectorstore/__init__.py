"""
ChromaDB vector store adapter — persistence path from settings.
"""
from pathlib import Path

from app.core.config import get_settings


def ensure_persist_dir() -> Path:
    settings = get_settings()
    path = Path(settings.chroma_persist_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_collection_name() -> str:
    return get_settings().chroma_collection


async def similarity_search(_query: str, _k: int = 5) -> list[dict]:
    """Placeholder retrieval — wire Chroma client during feature work."""
    ensure_persist_dir()
    return []
