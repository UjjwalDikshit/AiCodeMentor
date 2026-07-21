"""Code Intelligence API — deterministic engines first, then AIExecutionPipeline."""
from __future__ import annotations

import base64
import json
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.code_intel.service import CodeIntelService
from app.config.settings import Settings
from app.core.deps import get_ai_provider, get_ai_settings, get_memory_factory, get_prompt_registry
from app.memory.factory import MemoryFactory
from app.prompts.registry import PromptRegistry
from app.providers.base import BaseAIProvider

router = APIRouter(prefix="/code-intel", tags=["code-intelligence"])


class AnalyzeRequest(BaseModel):
    code: str = Field(default="", max_length=500000)
    filename: str | None = None
    language: str | None = None
    files: list[dict[str, str]] = Field(default_factory=list)
    zip_base64: str | None = None
    github_raw_url: str | None = None
    diff_text: str | None = None
    provider: str | None = None
    model: str | None = None
    include_ai_review: bool = True


class DiffRequest(BaseModel):
    old_code: str = Field(..., max_length=500000)
    new_code: str = Field(..., max_length=500000)
    filename: str | None = None
    provider: str | None = None
    model: str | None = None


class SnippetRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=500000)
    filename: str | None = None
    language: str | None = None
    provider: str | None = None
    model: str | None = None


def get_code_intel(
    settings: Settings = Depends(get_ai_settings),
    provider: BaseAIProvider = Depends(get_ai_provider),
    prompts: PromptRegistry = Depends(get_prompt_registry),
    memory_factory: MemoryFactory = Depends(get_memory_factory),
) -> CodeIntelService:
    return CodeIntelService(settings, provider, prompts, memory_factory)


@router.post("/analyze")
async def analyze(body: AnalyzeRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    zip_bytes = base64.b64decode(body.zip_base64) if body.zip_base64 else None
    units = svc.unpack_inputs(
        code=body.code or None,
        files=body.files or None,
        zip_bytes=zip_bytes,
        github_raw_url=body.github_raw_url,
        diff_text=body.diff_text,
    )
    if len(units) > 1 or body.files or body.zip_base64:
        return await svc.analyze_multi(
            units,
            provider=body.provider,
            model=body.model,
            include_ai_review=body.include_ai_review,
        )
    if not units:
        return {"success": False, "message": "No code provided", "data": {}, "meta": {}}
    return await svc.analyze(
        code=units[0]["content"],
        filename=body.filename or units[0].get("filename"),
        language=body.language,
        provider=body.provider,
        model=body.model,
        include_ai_review=body.include_ai_review,
    )


@router.post("/analyze/stream")
async def analyze_stream(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)):
    async def event_generator():
        async for chunk in svc.review_stream(
            code=body.code,
            filename=body.filename,
            language=body.language,
            provider=body.provider,
            model=body.model,
        ):
            event = chunk.get("event", "message")
            payload = chunk.get("data", chunk)
            yield f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/complexity")
async def complexity(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    det = svc.run_deterministic(body.code, filename=body.filename, language=body.language)
    return {"success": True, "message": "Complexity", "data": det["complexity"], "meta": {"language": det["language"]}}


@router.post("/security")
async def security(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    det = svc.run_deterministic(body.code, filename=body.filename, language=body.language)
    return {"success": True, "message": "Security", "data": det["security"], "meta": {"language": det["language"]}}


@router.post("/security/review")
async def security_review(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    return await svc.security_review_ai(
        code=body.code, filename=body.filename, provider=body.provider, model=body.model
    )


@router.post("/performance")
async def performance(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    det = svc.run_deterministic(body.code, filename=body.filename, language=body.language)
    return {
        "success": True,
        "message": "Performance",
        "data": det["performance"],
        "meta": {"language": det["language"]},
    }


@router.post("/performance/review")
async def performance_review(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    return await svc.performance_review_ai(
        code=body.code, filename=body.filename, provider=body.provider, model=body.model
    )


@router.post("/refactor")
async def refactor(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    return await svc.refactor(code=body.code, filename=body.filename, provider=body.provider, model=body.model)


@router.post("/interview")
async def interview(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    return await svc.interview_coach(
        code=body.code, filename=body.filename, provider=body.provider, model=body.model
    )


@router.post("/diff")
async def diff_review(body: DiffRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    return await svc.diff_review(
        old_code=body.old_code,
        new_code=body.new_code,
        filename=body.filename,
        provider=body.provider,
        model=body.model,
    )


@router.post("/detect-language")
async def detect_lang(body: SnippetRequest, svc: CodeIntelService = Depends(get_code_intel)) -> dict:
    from app.code_intel.language import detect_language

    return {"success": True, "message": "Language", "data": detect_language(body.code, body.filename), "meta": {}}
