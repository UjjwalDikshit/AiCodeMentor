"""
Code Intelligence orchestrator.

Deterministic engines run FIRST; AIExecutionPipeline receives structured findings
to explain, prioritize, and improve — never to invent basic static metrics.
"""
from __future__ import annotations

import json
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any, AsyncIterator

from app.code_intel.complexity import analyze_complexity
from app.code_intel.diff import analyze_diff
from app.code_intel.language import detect_language
from app.code_intel.parser import parse_code
from app.code_intel.performance import analyze_performance
from app.code_intel.quality import score_quality
from app.code_intel.security import analyze_security
from app.code_intel.static import analyze_static
from app.config.settings import Settings
from app.core.errors import ok
from app.core.logging import get_logger
from app.memory.factory import MemoryFactory
from app.pipeline import AIExecutionPipeline, PipelineRequest
from app.prompts.registry import PromptRegistry
from app.providers.base import BaseAIProvider

logger = get_logger("ai.code_intel")


class CodeIntelService:
    def __init__(
        self,
        settings: Settings,
        provider: BaseAIProvider,
        prompts: PromptRegistry,
        memory_factory: MemoryFactory | None = None,
    ) -> None:
        self.settings = settings
        self.pipeline = AIExecutionPipeline(settings, provider, prompts, memory_factory or MemoryFactory())
        self._det_cache: dict[str, dict[str, Any]] = {}

    def run_deterministic(
        self,
        code: str,
        *,
        filename: str | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        import hashlib

        cache_key = hashlib.sha1(f"{language or ''}:{filename or ''}:{code}".encode()).hexdigest()
        cached = self._det_cache.get(cache_key)
        if cached is not None:
            return cached
        lang_info = detect_language(code, filename)
        lang = language or lang_info["language"]
        ast = parse_code(code, language=None if language is None else lang, filename=filename)
        static = analyze_static(code, ast)
        complexity = analyze_complexity(code, ast)
        security = analyze_security(code)
        performance = analyze_performance(code, ast, complexity)
        quality = score_quality(ast, static, complexity, security, performance)
        result = {
            "language": ast.get("language") or lang_info["language"],
            "languageConfidence": ast.get("languageConfidence") or lang_info["confidence"],
            "ast": {
                "parserBackend": ast.get("parserBackend"),
                "functions": ast.get("functions"),
                "classes": ast.get("classes"),
                "interfaces": ast.get("interfaces"),
                "methods": ast.get("methods"),
                "imports": ast.get("imports"),
                "variables": ast.get("variables"),
                "loops": ast.get("loops"),
                "conditionals": ast.get("conditionals"),
                "recursion": ast.get("recursion"),
                "comments": ast.get("comments"),
                "callGraph": ast.get("callGraph"),
                "lineCount": ast.get("lineCount"),
                "treeSitter": ast.get("treeSitter"),
            },
            "static": static,
            "complexity": complexity,
            "security": security,
            "performance": performance,
            "quality": quality,
        }
        if len(self._det_cache) > 128:
            self._det_cache.clear()
        self._det_cache[cache_key] = result
        return result

    def _findings_blob(
        self,
        deterministic: dict[str, Any],
        code: str,
        *,
        max_code: int = 400,
        include_code: bool = True,
    ) -> str:
        """Structured findings for the LLM. Raw code is optional and tightly capped (supplemental)."""
        compact: dict[str, Any] = {
            "language": deterministic.get("language"),
            "quality": deterministic.get("quality"),
            "complexity": {
                k: deterministic.get("complexity", {}).get(k)
                for k in (
                    "cyclomaticComplexity",
                    "cognitiveComplexity",
                    "estimatedMaintainability",
                    "bigOEstimated",
                    "memoryComplexity",
                    "maxFunctionLength",
                    "nestedLoopDepth",
                    "recursionDepth",
                )
            },
            "staticFindings": (deterministic.get("static") or {}).get("findings", [])[:40],
            "securityFindings": (deterministic.get("security") or {}).get("findings", [])[:30],
            "performanceFindings": (deterministic.get("performance") or {}).get("findings", [])[:20],
            "astSummary": {
                "functionCount": len((deterministic.get("ast") or {}).get("functions") or []),
                "classCount": len((deterministic.get("ast") or {}).get("classes") or []),
                "conditionalCount": len((deterministic.get("ast") or {}).get("conditionals") or []),
                "loopCount": len((deterministic.get("ast") or {}).get("loops") or []),
                "functions": [
                    {"name": f.get("name"), "length": f.get("length"), "startLine": f.get("startLine")}
                    for f in ((deterministic.get("ast") or {}).get("functions") or [])[:25]
                ],
            },
        }
        if include_code and max_code > 0:
            compact["codeExcerptSupplemental"] = (code or "")[:max_code]
        return json.dumps(compact)[:14000]

    async def _pipeline_json(
        self,
        *,
        prompt_name: str,
        message: str,
        variables: dict[str, Any],
        provider: str | None = None,
        model: str | None = None,
        session_id: str | None = None,
        stream: bool = False,
    ) -> dict[str, Any]:
        result = await self.pipeline.run(
            PipelineRequest(
                message=message,
                system_prompt=prompt_name,
                prompt_variables=variables,
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
        }

    async def analyze(
        self,
        *,
        code: str,
        filename: str | None = None,
        language: str | None = None,
        provider: str | None = None,
        model: str | None = None,
        include_ai_review: bool = True,
    ) -> dict[str, Any]:
        deterministic = self.run_deterministic(code, filename=filename, language=language)
        ai_review = None
        if include_ai_review:
            ai_review = await self._pipeline_json(
                prompt_name="code_review",
                message="Prioritize and explain the deterministic findings. Return JSON only.",
                variables={"findings_json": self._findings_blob(deterministic, code, include_code=False)},
                provider=provider,
                model=model,
                session_id="code-review",
            )
        return ok(
            message="Code analysis complete",
            data={"deterministic": deterministic, "aiReview": ai_review},
        )

    async def review_stream(
        self,
        *,
        code: str,
        filename: str | None = None,
        language: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """SSE-friendly: emit deterministic first, then stream AI tokens via pipeline."""
        deterministic = self.run_deterministic(code, filename=filename, language=language)
        yield {"event": "analysis", "data": deterministic}

        request = PipelineRequest(
            message="Prioritize and explain the deterministic findings. Return JSON only.",
            system_prompt="code_review",
            prompt_variables={"findings_json": self._findings_blob(deterministic, code, include_code=False)},
            provider=provider,
            model=model,
            memory_kind="none",
            output_format="json",
            temperature=0.2,
            max_tokens=4096,
            session_id="code-review-stream",
        )
        async for chunk in self.pipeline.stream(request):
            yield chunk

    async def interview_coach(
        self,
        *,
        code: str,
        filename: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        deterministic = self.run_deterministic(code, filename=filename)
        out = await self._pipeline_json(
            prompt_name="code_interview",
            message="Generate interview coaching from deterministic analysis. Return JSON only.",
            variables={"findings_json": self._findings_blob(deterministic, code, include_code=False)},
            provider=provider,
            model=model,
            session_id="code-interview",
        )
        return ok(message="Interview coach", data={"deterministic": deterministic, "coach": out})

    async def refactor(
        self,
        *,
        code: str,
        filename: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        deterministic = self.run_deterministic(code, filename=filename)
        out = await self._pipeline_json(
            prompt_name="refactor",
            message="Propose a refactor grounded in deterministic findings. Return JSON only.",
            variables={
                "findings_json": self._findings_blob(deterministic, code, max_code=2500, include_code=True),
                "original_code": (code or "")[:8000],
            },
            provider=provider,
            model=model,
            session_id="code-refactor",
        )
        return ok(message="Refactor suggestion", data={"deterministic": deterministic, "refactor": out})

    async def security_review_ai(
        self,
        *,
        code: str,
        filename: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        deterministic = self.run_deterministic(code, filename=filename)
        out = await self._pipeline_json(
            prompt_name="security_review",
            message="Explain and prioritize deterministic security findings. Return JSON only.",
            variables={"findings_json": self._findings_blob(deterministic, code, include_code=False)},
            provider=provider,
            model=model,
            session_id="code-security-review",
        )
        return ok(message="Security review", data={"deterministic": deterministic, "aiReview": out})

    async def performance_review_ai(
        self,
        *,
        code: str,
        filename: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        deterministic = self.run_deterministic(code, filename=filename)
        out = await self._pipeline_json(
            prompt_name="performance_review",
            message="Explain and prioritize deterministic performance findings. Return JSON only.",
            variables={"findings_json": self._findings_blob(deterministic, code, include_code=False)},
            provider=provider,
            model=model,
            session_id="code-performance-review",
        )
        return ok(message="Performance review", data={"deterministic": deterministic, "aiReview": out})

    async def diff_review(
        self,
        *,
        old_code: str,
        new_code: str,
        filename: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        old_d = self.run_deterministic(old_code, filename=filename)
        new_d = self.run_deterministic(new_code, filename=filename)
        diff = analyze_diff(old_code, new_code, old_ast=old_d.get("ast"), new_ast=new_d.get("ast"), old_quality=old_d.get("quality"), new_quality=new_d.get("quality"))
        out = await self._pipeline_json(
            prompt_name="diff_review",
            message="Explain the deterministic diff and metric deltas. Return JSON only.",
            variables={
                "diff_json": json.dumps(diff)[:8000],
                "old_quality": json.dumps(old_d.get("quality") or {}),
                "new_quality": json.dumps(new_d.get("quality") or {}),
                "new_findings": self._findings_blob(new_d, new_code, include_code=False),
            },
            provider=provider,
            model=model,
            session_id="code-diff",
        )
        return ok(
            message="Diff review",
            data={"diff": diff, "oldQuality": old_d.get("quality"), "newQuality": new_d.get("quality"), "aiReview": out},
        )

    def unpack_inputs(
        self,
        *,
        code: str | None = None,
        files: list[dict[str, str]] | None = None,
        zip_bytes: bytes | None = None,
        github_raw_url: str | None = None,
        diff_text: str | None = None,
    ) -> list[dict[str, str]]:
        """Normalize inputs into [{filename, content}] units."""
        units: list[dict[str, str]] = []
        if code:
            units.append({"filename": "snippet.txt", "content": code})
        for f in files or []:
            if f.get("content"):
                units.append({"filename": f.get("filename") or "file.txt", "content": f["content"]})
        if zip_bytes:
            try:
                with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
                    infos = zf.infolist()
                    if len(infos) > 80:
                        logger.warning("Zip rejected: too many entries")
                        return units
                    total_uncompressed = 0
                    for info in infos[:40]:
                        name = info.filename
                        # Zip-slip / path traversal
                        if name.startswith("/") or ".." in Path(name).parts:
                            logger.warning("Zip entry rejected (path traversal): %s", name)
                            continue
                        if name.endswith("/") or info.is_dir():
                            continue
                        if info.file_size > 500_000:
                            continue
                        total_uncompressed += info.file_size
                        if total_uncompressed > 2_000_000:
                            logger.warning("Zip rejected: uncompressed size limit")
                            break
                        if Path(name).suffix.lower() not in {
                            ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".c", ".cpp", ".h", ".cs", ".sql", ".txt", ".md"
                        }:
                            continue
                        raw = zf.read(name)
                        try:
                            text = raw.decode("utf-8")
                        except UnicodeDecodeError:
                            text = raw.decode("latin-1", errors="ignore")
                        units.append({"filename": Path(name).name, "content": text[:100000]})
            except zipfile.BadZipFile:
                logger.warning("Invalid zip upload")
        if github_raw_url and github_raw_url.startswith(("http://", "https://")):
            units.append({"filename": "github_url.txt", "content": f"# fetch externally\n{github_raw_url}"})
        if diff_text:
            units.append({"filename": "changes.diff", "content": diff_text})
        return units

    async def analyze_multi(
        self,
        units: list[dict[str, str]],
        *,
        provider: str | None = None,
        model: str | None = None,
        include_ai_review: bool = True,
    ) -> dict[str, Any]:
        results = []
        for unit in units[:20]:
            det = self.run_deterministic(unit["content"], filename=unit.get("filename"))
            results.append({"filename": unit.get("filename"), "deterministic": det})
        # Aggregate findings only — no raw multi-file code dump to the LLM
        agg = {
            "files": [
                {
                    "filename": r["filename"],
                    "quality": r["deterministic"].get("quality"),
                    "static": (r["deterministic"].get("static") or {}).get("findingCount"),
                    "security": (r["deterministic"].get("security") or {}).get("findingCount"),
                    "performance": (r["deterministic"].get("performance") or {}).get("findingCount"),
                    "complexity": r["deterministic"].get("complexity"),
                }
                for r in results
            ],
            "details": [
                self._findings_blob(r["deterministic"], "", include_code=False) for r in results[:8]
            ],
        }
        ai_review = None
        if include_ai_review and results:
            ai_review = await self._pipeline_json(
                prompt_name="code_review",
                message="Review multi-file deterministic findings. Return JSON only.",
                variables={"findings_json": json.dumps({"aggregate": agg})[:14000]},
                provider=provider,
                model=model,
                session_id="code-review-multi",
            )
        return ok(message="Multi-file analysis", data={"files": results, "aiReview": ai_review})
