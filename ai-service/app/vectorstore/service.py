"""
Vector store service — ChromaDB when available, in-memory fallback otherwise.
Infrastructure only (no resume indexing).
"""
from __future__ import annotations

from typing import Any
from pathlib import Path

from app.core.exceptions import VectorStoreError
from app.core.logging import get_logger
from app.embeddings.base import BaseEmbeddingProvider

logger = get_logger(__name__)


class _InMemoryCollection:
    def __init__(self, name: str) -> None:
        self.name = name
        self._docs: dict[str, dict[str, Any]] = {}

    def count(self) -> int:
        return len(self._docs)

    def add(self, ids, documents, embeddings, metadatas) -> None:
        for i, doc_id in enumerate(ids):
            self._docs[doc_id] = {
                "document": documents[i],
                "embedding": embeddings[i],
                "metadata": metadatas[i] if metadatas else {},
            }

    def delete(self, ids) -> None:
        for doc_id in ids:
            self._docs.pop(doc_id, None)

    def query(self, query_embeddings, n_results=5):
        if not self._docs:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
        q = query_embeddings[0]

        def dist(vec):
            return sum((a - b) ** 2 for a, b in zip(q, vec)) ** 0.5

        ranked = sorted(self._docs.items(), key=lambda item: dist(item[1]["embedding"]))[:n_results]
        return {
            "ids": [[i for i, _ in ranked]],
            "documents": [[v["document"] for _, v in ranked]],
            "metadatas": [[v["metadata"] for _, v in ranked]],
            "distances": [[dist(v["embedding"]) for _, v in ranked]],
        }


class _InMemoryClient:
    def __init__(self) -> None:
        self._collections: dict[str, _InMemoryCollection] = {}

    def get_or_create_collection(self, name: str, metadata=None):
        if name not in self._collections:
            self._collections[name] = _InMemoryCollection(name)
        return self._collections[name]

    def delete_collection(self, name: str) -> None:
        self._collections.pop(name, None)

    def list_collections(self):
        return list(self._collections.values())


class VectorStoreService:
    def __init__(
        self,
        persist_directory: str,
        default_collection: str,
        embedding_provider: BaseEmbeddingProvider,
    ) -> None:
        self.persist_directory = persist_directory
        self.default_collection = default_collection
        self.embedding_provider = embedding_provider
        self._client = None
        self._backend = "unknown"

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            Path(self.persist_directory).mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._backend = "chromadb"
            return self._client
        except Exception as exc:  # noqa: BLE001
            logger.warning("ChromaDB unavailable (%s) — using in-memory vector store", exc)
            self._client = _InMemoryClient()
            self._backend = "memory"
            return self._client

    def create_collection(self, name: str | None = None, metadata: dict | None = None) -> dict:
        client = self._get_client()
        collection_name = name or self.default_collection
        try:
            if self._backend == "chromadb":
                collection = client.get_or_create_collection(
                    name=collection_name,
                    metadata=metadata or {"hnsw:space": "cosine"},
                )
            else:
                collection = client.get_or_create_collection(name=collection_name)
            return {"name": collection.name, "count": collection.count(), "backend": self._backend}
        except Exception as exc:  # noqa: BLE001
            raise VectorStoreError(str(exc)) from exc

    def delete_collection(self, name: str) -> dict:
        client = self._get_client()
        try:
            client.delete_collection(name)
            return {"deleted": name, "backend": self._backend}
        except Exception as exc:  # noqa: BLE001
            raise VectorStoreError(str(exc)) from exc

    async def add_documents(
        self,
        documents: list[str],
        *,
        ids: list[str] | None = None,
        metadatas: list[dict] | None = None,
        collection: str | None = None,
    ) -> dict:
        if not documents:
            return {"added": 0}
        client = self._get_client()
        coll = client.get_or_create_collection(name=collection or self.default_collection)
        doc_ids = ids or [f"doc-{i}" for i in range(len(documents))]
        try:
            embeddings = await self.embedding_provider.embed(documents)
            coll.add(
                ids=doc_ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas or [{"source": "infra"} for _ in documents],
            )
            return {"added": len(documents), "ids": doc_ids, "collection": coll.name, "backend": self._backend}
        except Exception as exc:  # noqa: BLE001
            raise VectorStoreError(str(exc)) from exc

    async def search(
        self,
        query: str,
        *,
        k: int = 5,
        collection: str | None = None,
    ) -> list[dict[str, Any]]:
        client = self._get_client()
        coll = client.get_or_create_collection(name=collection or self.default_collection)
        try:
            query_embedding = (await self.embedding_provider.embed([query]))[0]
            result = coll.query(query_embeddings=[query_embedding], n_results=k)
            out: list[dict[str, Any]] = []
            docs = (result.get("documents") or [[]])[0]
            metas = (result.get("metadatas") or [[]])[0]
            ids = (result.get("ids") or [[]])[0]
            distances = (result.get("distances") or [[]])[0]
            for i, doc in enumerate(docs):
                out.append(
                    {
                        "id": ids[i] if i < len(ids) else None,
                        "document": doc,
                        "metadata": metas[i] if i < len(metas) else {},
                        "distance": distances[i] if i < len(distances) else None,
                    }
                )
            return out
        except Exception as exc:  # noqa: BLE001
            raise VectorStoreError(str(exc)) from exc

    def delete_document(self, doc_id: str, *, collection: str | None = None) -> dict:
        client = self._get_client()
        coll = client.get_or_create_collection(name=collection or self.default_collection)
        try:
            coll.delete(ids=[doc_id])
            return {"deleted": doc_id, "backend": self._backend}
        except Exception as exc:  # noqa: BLE001
            raise VectorStoreError(str(exc)) from exc

    async def health(self) -> dict[str, Any]:
        try:
            client = self._get_client()
            collections = client.list_collections()
            return {
                "status": "ok",
                "backend": self._backend,
                "directory": self.persist_directory,
                "collections": [c.name for c in collections],
            }
        except Exception as exc:  # noqa: BLE001
            return {"status": "down", "error": str(exc)}


VectorStoreService.createCollection = VectorStoreService.create_collection  # type: ignore[attr-defined]
VectorStoreService.deleteCollection = VectorStoreService.delete_collection  # type: ignore[attr-defined]
VectorStoreService.addDocuments = VectorStoreService.add_documents  # type: ignore[attr-defined]
VectorStoreService.deleteDocument = VectorStoreService.delete_document  # type: ignore[attr-defined]
