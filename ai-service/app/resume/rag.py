"""Resume RAG retriever — uses VectorStoreService + embedding provider."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.vectorstore.service import VectorStoreService


class ResumeRetriever:
    def __init__(self, vector_store: VectorStoreService) -> None:
        self.vector_store = vector_store

    @staticmethod
    def collection_for_user(user_id: str) -> str:
        safe = "".join(c if c.isalnum() else "_" for c in str(user_id))[:48]
        return f"resume_user_{safe}"

    @staticmethod
    def jd_collection_for_user(user_id: str) -> str:
        safe = "".join(c if c.isalnum() else "_" for c in str(user_id))[:48]
        return f"jd_user_{safe}"

    async def index_chunks(
        self,
        *,
        user_id: str,
        chunks: list[dict[str, Any]],
        collection: str | None = None,
    ) -> dict[str, Any]:
        coll = collection or self.collection_for_user(user_id)
        self.vector_store.create_collection(coll, metadata={"kind": "resume"})
        if not chunks:
            return {"added": 0, "collection": coll}
        model_name = (
            getattr(self.vector_store.embedding_provider, "model_name", None)
            or getattr(self.vector_store.embedding_provider, "name", None)
            or "unknown"
        )
        created_at = datetime.now(timezone.utc).isoformat()
        docs = [c["content"] for c in chunks]
        ids = [c["chunkId"] for c in chunks]
        metas = []
        for c in chunks:
            meta = dict(c.get("metadata") or {})
            meta["embeddingModel"] = meta.get("embeddingModel") or model_name
            meta["createdAt"] = meta.get("createdAt") or created_at
            meta["embeddingCreatedAt"] = created_at
            # Chroma metadata values must be scalars
            if "version" in meta:
                meta["version"] = int(meta["version"])
            metas.append(meta)
        return await self.vector_store.add_documents(docs, ids=ids, metadatas=metas, collection=coll)

    async def delete_chunk_ids(self, *, user_id: str, chunk_ids: list[str], collection: str | None = None) -> dict:
        coll = collection or self.collection_for_user(user_id)
        if not chunk_ids:
            return {"deleted": 0, "collection": coll}
        return self.vector_store.delete_documents(chunk_ids, collection=coll)

    async def delete_resume_chunks(self, *, user_id: str, chunk_ids: list[str] | None = None) -> dict:
        if not chunk_ids:
            return {"deleted": 0, "note": "pass chunk ids"}
        return await self.delete_chunk_ids(user_id=user_id, chunk_ids=chunk_ids)

    async def search(
        self,
        *,
        user_id: str,
        query: str,
        k: int = 5,
        section: str | None = None,
        resume_id: str | None = None,
        version: int | None = None,
        jd_id: str | None = None,
        collection: str | None = None,
        similarity_threshold: float | None = None,
    ) -> list[dict[str, Any]]:
        coll = collection or self.collection_for_user(user_id)
        # Over-fetch so post-filters (section/resumeId/version) still yield top-k
        hits = await self.vector_store.search(query, k=max(k * 5, k), collection=coll)
        filtered: list[dict[str, Any]] = []
        for h in hits:
            meta = h.get("metadata") or {}
            if section and meta.get("section") != section:
                continue
            if resume_id and str(meta.get("resumeId")) != str(resume_id):
                continue
            if version is not None and int(meta.get("version") or -1) != int(version):
                continue
            if jd_id and str(meta.get("jdId")) != str(jd_id):
                continue
            dist = h.get("distance")
            if similarity_threshold is not None and dist is not None:
                sim = 1.0 / (1.0 + float(dist))
                if sim < similarity_threshold:
                    continue
                h = {**h, "similarity": round(sim, 4)}
            filtered.append(h)
            if len(filtered) >= k:
                break
        return filtered
