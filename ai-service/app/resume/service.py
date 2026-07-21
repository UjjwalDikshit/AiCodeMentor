"""
Resume intelligence orchestrator — parsing, indexing, RAG, ATS/JD via AIExecutionPipeline.

CRITICAL: AI features must use Retriever → Top-K chunks → Pipeline.
Do not send the entire structured resume to the LLM.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.config.settings import Settings
from app.core.errors import ok
from app.core.logging import get_logger
from app.loaders import LOADERS
from app.memory.factory import MemoryFactory
from app.pipeline import AIExecutionPipeline, PipelineRequest
from app.prompts.registry import PromptRegistry
from app.providers.base import BaseAIProvider
from app.resume.chunker import chunk_resume
from app.resume.parser import parse_resume_text
from app.resume.rag import ResumeRetriever
from app.vectorstore.service import VectorStoreService

logger = get_logger("ai.resume")


def _loader_for_path(path: str) -> str:
    ext = Path(path).suffix.lower().lstrip(".")
    if ext in {"md", "markdown"}:
        return "md"
    if ext == "pdf":
        return "pdf"
    if ext == "docx":
        return "docx"
    if ext in {"txt", "text"}:
        return "txt"
    return "txt"


def _join_hits(hits: list[dict[str, Any]], limit: int = 8000) -> str:
    return "\n\n".join(h.get("document", "") for h in hits if h.get("document"))[:limit]


def _bullets_from_text(text: str) -> list[str]:
    lines = []
    for ln in (text or "").splitlines():
        cleaned = re.sub(r"^[-*•]\s*", "", ln).strip()
        if cleaned and len(cleaned) > 8:
            lines.append(cleaned)
    return lines


class ResumeIntelService:
    def __init__(
        self,
        settings: Settings,
        provider: BaseAIProvider,
        prompts: PromptRegistry,
        vector_store: VectorStoreService,
        memory_factory: MemoryFactory | None = None,
    ) -> None:
        self.settings = settings
        self.pipeline = AIExecutionPipeline(settings, provider, prompts, memory_factory or MemoryFactory())
        self.retriever = ResumeRetriever(vector_store)
        self.vector_store = vector_store

    def load_text(self, path: str, loader: str | None = None) -> str:
        key = (loader or _loader_for_path(path)).lower()
        if key not in LOADERS:
            raise ValueError(f"Unsupported loader '{key}'")
        content = LOADERS[key](path)
        return content if isinstance(content, str) else json.dumps(content)

    async def parse_and_index(
        self,
        *,
        user_id: str,
        resume_id: str,
        version: int,
        path: str | None = None,
        text: str | None = None,
        loader: str | None = None,
        reindex: bool = False,
        previous_chunk_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        if text is None and not path:
            raise ValueError("Provide path or text for resume indexing")
        if text is None:
            text = self.load_text(path, loader)
        structured = parse_resume_text(text)
        chunks = chunk_resume(
            structured,
            resume_id=resume_id,
            version=version,
            embedding_model=self.settings.embedding_model,
        )
        coll = self.retriever.collection_for_user(user_id)
        if reindex and previous_chunk_ids:
            await self.retriever.delete_chunk_ids(user_id=user_id, chunk_ids=previous_chunk_ids)
        indexed = await self.retriever.index_chunks(user_id=user_id, chunks=chunks, collection=coll)
        return ok(
            message="Resume parsed and indexed",
            data={
                "structured": structured,
                "chunks": [
                    {"chunkId": c["chunkId"], "metadata": c["metadata"], "preview": c["content"][:200]}
                    for c in chunks
                ],
                "chunkIds": [c["chunkId"] for c in chunks],
                "chunkCount": len(chunks),
                "indexed": indexed,
                "collection": coll,
                "embeddingModel": self.settings.embedding_model,
                "embeddingProvider": self.settings.embedding_provider,
            },
        )

    async def search(
        self,
        *,
        user_id: str,
        query: str,
        k: int = 5,
        section: str | None = None,
        resume_id: str | None = None,
        version: int | None = None,
        similarity_threshold: float | None = 0.15,
    ) -> dict[str, Any]:
        hits = await self.retriever.search(
            user_id=user_id,
            query=query,
            k=k,
            section=section,
            resume_id=resume_id,
            version=version,
            similarity_threshold=similarity_threshold,
        )
        return ok(message="Resume RAG search", data={"hits": hits})

    async def _pipeline_json(
        self,
        *,
        prompt_name: str,
        message: str,
        variables: dict[str, Any] | None = None,
        provider: str | None = None,
        model: str | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        result = await self.pipeline.run(
            PipelineRequest(
                message=message,
                system_prompt=prompt_name,
                prompt_variables=variables or {},
                provider=provider,
                model=model,
                memory_kind="none",
                output_format="json",
                temperature=0.2,
                max_tokens=4096,
                session_id=session_id,
            )
        )
        parsed = result.parsed
        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except json.JSONDecodeError:
                parsed = {"raw": parsed}
        return {
            "parsed": parsed,
            "content": result.content,
            "meta": result.meta,
            "usage": result.usage,
            "stages": result.stages,
            "rag": True,
        }

    async def ats_evaluate(
        self,
        *,
        user_id: str,
        resume_id: str,
        structured: dict[str, Any] | None = None,  # ignored for LLM; kept for API compat
        provider: str | None = None,
        model: str | None = None,
        k: int = 10,
        version: int | None = None,
    ) -> dict[str, Any]:
        # Multi-query retrieval across key sections — never dump full resume
        queries = [
            ("experience projects achievements impact quantification", None),
            ("skills technologies stack", "skills"),
            ("education certifications", None),
            ("summary profile objective", "summary"),
        ]
        seen: set[str] = set()
        hits: list[dict[str, Any]] = []
        for q, section in queries:
            batch = await self.retriever.search(
                user_id=user_id,
                query=q,
                k=max(3, k // 2),
                resume_id=resume_id,
                version=version,
                section=section,
                similarity_threshold=0.05,
            )
            for h in batch:
                hid = h.get("id") or h.get("document", "")[:80]
                if hid in seen:
                    continue
                seen.add(hid)
                hits.append(h)
                if len(hits) >= k:
                    break
            if len(hits) >= k:
                break

        context = _join_hits(hits, 10000)
        out = await self._pipeline_json(
            prompt_name="resume_ats",
            message="Evaluate ATS readiness from retrieved resume chunks only. Return JSON only.",
            variables={"retrieved_context": context or "(no chunks retrieved)"},
            provider=provider,
            model=model,
            session_id=f"resume-ats:{resume_id}",
        )
        out["retrievedChunkCount"] = len(hits)
        return ok(message="ATS evaluation", data=out)

    async def improve_bullets(
        self,
        *,
        user_id: str,
        resume_id: str,
        bullets: list[str] | None = None,
        provider: str | None = None,
        model: str | None = None,
        version: int | None = None,
        k: int = 8,
    ) -> dict[str, Any]:
        list_bullets = list(bullets or [])
        hits: list[dict[str, Any]] = []
        if not list_bullets:
            for section in ("experience", "projects", "achievements"):
                batch = await self.retriever.search(
                    user_id=user_id,
                    query=f"{section} accomplishments impact results",
                    k=k,
                    resume_id=resume_id,
                    version=version,
                    section=section,
                    similarity_threshold=0.05,
                )
                hits.extend(batch)
            context = _join_hits(hits, 8000)
            list_bullets = _bullets_from_text(context)[:20]
        else:
            # Still ground improvements in retrieved related chunks
            hits = await self.retriever.search(
                user_id=user_id,
                query=" ".join(list_bullets)[:500],
                k=k,
                resume_id=resume_id,
                version=version,
                similarity_threshold=0.05,
            )

        out = await self._pipeline_json(
            prompt_name="resume_bullets",
            message="Improve these resume bullets using retrieved context. Return JSON only.",
            variables={
                "bullets_json": json.dumps(list_bullets)[:10000],
                "retrieved_context": _join_hits(hits, 4000),
            },
            provider=provider,
            model=model,
            session_id=f"resume-bullets:{resume_id}",
        )
        out["retrievedChunkCount"] = len(hits)
        return ok(message="Bullet improvements", data=out)

    async def skill_gap(
        self,
        *,
        user_id: str,
        resume_id: str,
        structured: dict[str, Any] | None = None,  # ignored for LLM
        target_role: str = "Software Engineer",
        provider: str | None = None,
        model: str | None = None,
        version: int | None = None,
        k: int = 8,
    ) -> dict[str, Any]:
        skill_hits = await self.retriever.search(
            user_id=user_id,
            query=f"skills technologies for {target_role}",
            k=k,
            resume_id=resume_id,
            version=version,
            section="skills",
            similarity_threshold=0.05,
        )
        exp_hits = await self.retriever.search(
            user_id=user_id,
            query=f"experience projects {target_role}",
            k=k,
            resume_id=resume_id,
            version=version,
            similarity_threshold=0.05,
        )
        out = await self._pipeline_json(
            prompt_name="resume_skills",
            message=f"Analyze skill gaps for role: {target_role}. Use retrieved chunks only. Return JSON only.",
            variables={
                "target_role": target_role,
                "retrieved_context": _join_hits(skill_hits + exp_hits, 8000) or "(no chunks)",
            },
            provider=provider,
            model=model,
            session_id=f"resume-skills:{resume_id}",
        )
        out["retrievedChunkCount"] = len(skill_hits) + len(exp_hits)
        return ok(message="Skill gap analysis", data=out)

    async def index_jd(
        self,
        *,
        user_id: str,
        jd_id: str,
        text: str,
    ) -> dict[str, Any]:
        coll = self.retriever.jd_collection_for_user(user_id)
        pieces = [p for p in text.split("\n\n") if p.strip()] or [text]
        chunks = []
        for i, piece in enumerate(pieces[:40]):
            cid = f"jd_{jd_id}_{i}"
            chunks.append(
                {
                    "chunkId": cid,
                    "content": piece.strip()[:2000],
                    "metadata": {"jdId": jd_id, "section": "jd", "chunkId": cid, "page": 1},
                }
            )
        indexed = await self.retriever.index_chunks(user_id=user_id, chunks=chunks, collection=coll)
        return ok(message="JD indexed", data={"indexed": indexed, "collection": coll, "chunkCount": len(chunks)})

    async def match_jd(
        self,
        *,
        user_id: str,
        resume_id: str,
        jd_id: str,
        jd_text: str,
        structured: dict[str, Any] | None = None,  # ignored for LLM
        provider: str | None = None,
        model: str | None = None,
        k: int = 6,
        version: int | None = None,
    ) -> dict[str, Any]:
        # Similarity search both collections — not prompt-only comparison
        resume_hits = await self.retriever.search(
            user_id=user_id,
            query=jd_text[:800],
            k=k,
            resume_id=resume_id,
            version=version,
            similarity_threshold=0.05,
        )
        jd_hits = await self.retriever.search(
            user_id=user_id,
            query="requirements qualifications skills responsibilities must-have",
            k=k,
            collection=self.retriever.jd_collection_for_user(user_id),
            jd_id=jd_id,
            similarity_threshold=0.05,
        )
        # Also query JD store with resume-derived terms from retrieved resume chunks
        resume_probe = _join_hits(resume_hits, 400)
        if resume_probe:
            extra_jd = await self.retriever.search(
                user_id=user_id,
                query=resume_probe[:500],
                k=k,
                collection=self.retriever.jd_collection_for_user(user_id),
                jd_id=jd_id,
                similarity_threshold=0.05,
            )
            seen = {h.get("id") for h in jd_hits}
            for h in extra_jd:
                if h.get("id") not in seen:
                    jd_hits.append(h)

        out = await self._pipeline_json(
            prompt_name="resume_jd_match",
            message="Match resume to JD using retrieved chunks only. Return JSON only.",
            variables={
                "resume_context": _join_hits(resume_hits, 5000) or "(no resume chunks)",
                "jd_context": _join_hits(jd_hits, 5000) or "(no JD chunks)",
            },
            provider=provider,
            model=model,
            session_id=f"resume-jd:{resume_id}:{jd_id}",
        )
        out["retrievedChunkCount"] = {"resume": len(resume_hits), "jd": len(jd_hits)}
        return ok(message="JD match", data=out)

    async def report(
        self,
        *,
        user_id: str,
        resume_id: str,
        structured: dict[str, Any] | None = None,  # ignored for LLM
        ats: dict[str, Any] | None = None,
        provider: str | None = None,
        model: str | None = None,
        version: int | None = None,
        k: int = 10,
    ) -> dict[str, Any]:
        hits = await self.retriever.search(
            user_id=user_id,
            query="resume strengths weaknesses skills experience projects education",
            k=k,
            resume_id=resume_id,
            version=version,
            similarity_threshold=0.05,
        )
        out = await self._pipeline_json(
            prompt_name="resume_report",
            message="Generate report summaries from retrieved chunks. Return JSON only.",
            variables={
                "retrieved_context": _join_hits(hits, 8000) or "(no chunks)",
                "ats_json": json.dumps(ats or {})[:5000],
            },
            provider=provider,
            model=model,
            session_id=f"resume-report:{resume_id}",
        )
        out["retrievedChunkCount"] = len(hits)
        return ok(message="Resume report", data=out)

    async def compare_versions(
        self,
        *,
        user_id: str,
        resume_id: str,
        version_a: int,
        version_b: int,
        v1: dict[str, Any] | None = None,  # ignored for LLM
        v2: dict[str, Any] | None = None,
        provider: str | None = None,
        model: str | None = None,
        k: int = 8,
    ) -> dict[str, Any]:
        hits_a = await self.retriever.search(
            user_id=user_id,
            query="skills experience projects education achievements",
            k=k,
            resume_id=resume_id,
            version=version_a,
            similarity_threshold=0.05,
        )
        hits_b = await self.retriever.search(
            user_id=user_id,
            query="skills experience projects education achievements",
            k=k,
            resume_id=resume_id,
            version=version_b,
            similarity_threshold=0.05,
        )
        out = await self._pipeline_json(
            prompt_name="resume_compare",
            message="Compare two resume versions from retrieved chunks. Return structured JSON only.",
            variables={
                "resume_v1": _join_hits(hits_a, 6000) or f"(no chunks for v{version_a})",
                "resume_v2": _join_hits(hits_b, 6000) or f"(no chunks for v{version_b})",
            },
            provider=provider,
            model=model,
            session_id=f"resume-compare:{resume_id}:{version_a}:{version_b}",
        )
        out["retrievedChunkCount"] = {"v1": len(hits_a), "v2": len(hits_b)}
        out["versions"] = {"v1": version_a, "v2": version_b}
        return ok(message="Version comparison", data=out)
