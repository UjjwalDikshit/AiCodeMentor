from fastapi import APIRouter, Depends

from app.core.deps import get_vector_store
from app.documents.schemas import DocumentBatch
from app.models.schemas import CollectionRequest, VectorSearchRequest
from app.services.infra import VectorInfraService
from app.vectorstore.service import VectorStoreService

router = APIRouter(prefix="/vector", tags=["vector"])


def _svc(store: VectorStoreService = Depends(get_vector_store)) -> VectorInfraService:
    return VectorInfraService(store)


@router.post("")
@router.post("/")
async def vector_root(body: VectorSearchRequest, svc: VectorInfraService = Depends(_svc)) -> dict:
    """Convenience POST /vector → search (same as /vector/search)."""
    return await svc.search(body.query, k=body.k, collection=body.collection)


@router.get("/health")
async def vector_health(svc: VectorInfraService = Depends(_svc)) -> dict:
    return await svc.health()


@router.post("/collections")
async def create_collection(body: CollectionRequest, svc: VectorInfraService = Depends(_svc)) -> dict:
    return await svc.create_collection(body.name, body.metadata)


@router.post("/search")
async def search(body: VectorSearchRequest, svc: VectorInfraService = Depends(_svc)) -> dict:
    return await svc.search(body.query, k=body.k, collection=body.collection)


@router.post("/documents")
async def add_documents(body: DocumentBatch, svc: VectorInfraService = Depends(_svc)) -> dict:
    docs = [d.model_dump() for d in body.documents]
    return await svc.add_documents(docs, collection=body.collection)


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    collection: str | None = None,
    svc: VectorInfraService = Depends(_svc),
) -> dict:
    return await svc.delete_document(doc_id, collection=collection)
