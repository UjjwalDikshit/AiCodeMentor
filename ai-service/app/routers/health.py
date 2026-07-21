from fastapi import APIRouter, Depends

from app.config.settings import Settings
from app.core.deps import (
    get_ai_settings,
    get_ai_provider,
    get_embedding_provider,
    get_vector_store,
)
from app.embeddings.base import BaseEmbeddingProvider
from app.providers.base import BaseAIProvider
from app.services.infra import HealthService
from app.vectorstore.service import VectorStoreService

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    settings: Settings = Depends(get_ai_settings),
    provider: BaseAIProvider = Depends(get_ai_provider),
    embeddings: BaseEmbeddingProvider = Depends(get_embedding_provider),
    vector_store: VectorStoreService = Depends(get_vector_store),
) -> dict:
    service = HealthService(settings, provider, embeddings, vector_store)
    return await service.check()
