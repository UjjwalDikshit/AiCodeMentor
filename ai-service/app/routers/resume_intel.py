"""Resume Intelligence API — parse, index, RAG, ATS, JD, reports via ResumeIntelService."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.config.settings import Settings
from app.core.deps import (
    get_ai_provider,
    get_ai_settings,
    get_memory_factory,
    get_prompt_registry,
    get_vector_store,
)
from app.memory.factory import MemoryFactory
from app.prompts.registry import PromptRegistry
from app.providers.base import BaseAIProvider
from app.resume.service import ResumeIntelService
from app.vectorstore.service import VectorStoreService

router = APIRouter(prefix="/resume-intel", tags=["resume-intelligence"])


class ParseIndexRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    resume_id: str = Field(..., min_length=1)
    version: int = Field(default=1, ge=1)
    path: str | None = None
    text: str | None = None
    loader: str | None = None
    reindex: bool = False
    previous_chunk_ids: list[str] = Field(default_factory=list)


class SearchRequest(BaseModel):
    user_id: str
    query: str = Field(..., min_length=1)
    k: int = Field(default=5, ge=1, le=50)
    section: str | None = None
    resume_id: str | None = None
    version: int | None = None
    similarity_threshold: float | None = 0.15


class AtsRequest(BaseModel):
    user_id: str
    resume_id: str
    structured: dict[str, Any] | None = None
    provider: str | None = None
    model: str | None = None
    k: int = 10
    version: int | None = None


class BulletsRequest(BaseModel):
    user_id: str
    resume_id: str
    bullets: list[str] = Field(default_factory=list)
    provider: str | None = None
    model: str | None = None
    version: int | None = None
    k: int = 8


class SkillsRequest(BaseModel):
    user_id: str
    resume_id: str
    structured: dict[str, Any] | None = None
    target_role: str = "Software Engineer"
    provider: str | None = None
    model: str | None = None
    version: int | None = None
    k: int = 8


class JdIndexRequest(BaseModel):
    user_id: str
    jd_id: str
    text: str = Field(..., min_length=1)


class JdMatchRequest(BaseModel):
    user_id: str
    resume_id: str
    jd_id: str
    jd_text: str = ""
    structured: dict[str, Any] | None = None
    provider: str | None = None
    model: str | None = None
    k: int = 6
    version: int | None = None


class ReportRequest(BaseModel):
    user_id: str
    resume_id: str
    structured: dict[str, Any] | None = None
    ats: dict[str, Any] | None = None
    provider: str | None = None
    model: str | None = None
    version: int | None = None
    k: int = 10


class CompareRequest(BaseModel):
    user_id: str
    resume_id: str
    version_a: int = Field(..., ge=1)
    version_b: int = Field(..., ge=1)
    v1: dict[str, Any] | None = None
    v2: dict[str, Any] | None = None
    provider: str | None = None
    model: str | None = None
    k: int = 8


class DeleteChunksRequest(BaseModel):
    user_id: str
    chunk_ids: list[str]


def get_resume_intel(
    settings: Settings = Depends(get_ai_settings),
    provider: BaseAIProvider = Depends(get_ai_provider),
    prompts: PromptRegistry = Depends(get_prompt_registry),
    vector_store: VectorStoreService = Depends(get_vector_store),
    memory_factory: MemoryFactory = Depends(get_memory_factory),
) -> ResumeIntelService:
    return ResumeIntelService(settings, provider, prompts, vector_store, memory_factory)


@router.post("/parse-index")
async def parse_index(body: ParseIndexRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.parse_and_index(
        user_id=body.user_id,
        resume_id=body.resume_id,
        version=body.version,
        path=body.path,
        text=body.text,
        loader=body.loader,
        reindex=body.reindex,
        previous_chunk_ids=body.previous_chunk_ids or None,
    )


@router.post("/search")
async def search(body: SearchRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.search(
        user_id=body.user_id,
        query=body.query,
        k=body.k,
        section=body.section,
        resume_id=body.resume_id,
        version=body.version,
        similarity_threshold=body.similarity_threshold,
    )


@router.post("/ats")
async def ats(body: AtsRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.ats_evaluate(
        user_id=body.user_id,
        resume_id=body.resume_id,
        structured=body.structured,
        provider=body.provider,
        model=body.model,
        k=body.k,
        version=body.version,
    )


@router.post("/bullets")
async def bullets(body: BulletsRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.improve_bullets(
        user_id=body.user_id,
        resume_id=body.resume_id,
        bullets=body.bullets or None,
        provider=body.provider,
        model=body.model,
        version=body.version,
        k=body.k,
    )


@router.post("/skills")
async def skills(body: SkillsRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.skill_gap(
        user_id=body.user_id,
        resume_id=body.resume_id,
        structured=body.structured,
        target_role=body.target_role,
        provider=body.provider,
        model=body.model,
        version=body.version,
        k=body.k,
    )


@router.post("/jd/index")
async def jd_index(body: JdIndexRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.index_jd(user_id=body.user_id, jd_id=body.jd_id, text=body.text)


@router.post("/jd/match")
async def jd_match(body: JdMatchRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.match_jd(
        user_id=body.user_id,
        resume_id=body.resume_id,
        jd_id=body.jd_id,
        jd_text=body.jd_text,
        structured=body.structured,
        provider=body.provider,
        model=body.model,
        k=body.k,
        version=body.version,
    )


@router.post("/report")
async def report(body: ReportRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.report(
        user_id=body.user_id,
        resume_id=body.resume_id,
        structured=body.structured,
        ats=body.ats,
        provider=body.provider,
        model=body.model,
        version=body.version,
        k=body.k,
    )


@router.post("/compare")
async def compare(body: CompareRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    return await svc.compare_versions(
        user_id=body.user_id,
        resume_id=body.resume_id,
        version_a=body.version_a,
        version_b=body.version_b,
        v1=body.v1,
        v2=body.v2,
        provider=body.provider,
        model=body.model,
        k=body.k,
    )


@router.post("/chunks/delete")
async def delete_chunks(body: DeleteChunksRequest, svc: ResumeIntelService = Depends(get_resume_intel)) -> dict:
    result = await svc.retriever.delete_chunk_ids(user_id=body.user_id, chunk_ids=body.chunk_ids)
    return {"success": True, "message": "Chunks deleted", "data": result, "meta": {}}
