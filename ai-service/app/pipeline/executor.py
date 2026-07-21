"""
AIExecutionPipeline

Request
  → Pre-processing Middleware
  → Validation
  → Prompt Registry
  → Memory
  → Provider
  → Output Parser
  → Post-processing Middleware
  → Telemetry
  → Response

Reusable by future modules without owning product logic.
"""
from __future__ import annotations

from typing import Any, AsyncIterator

from app.config.settings import Settings
from app.core.exceptions import AIServiceError
from app.core.logging import get_logger
from app.memory.factory import BaseMemory, MemoryFactory
from app.pipeline.middleware import (
    MiddlewareChain,
    PipelineContext,
    PipelineMiddleware,
    PostMiddlewareFn,
    PreMiddlewareFn,
)
from app.pipeline.parsers import get_output_parser
from app.pipeline.types import PipelineRequest, PipelineResult
from app.pipeline.validators import validate_pipeline_request
from app.prompts.registry import PromptRegistry
from app.providers.base import BaseAIProvider
from app.utils.telemetry import (
    Timer,
    build_request_meta,
    log_ai_request,
    new_request_id,
    normalize_usage,
    utc_now_iso,
)

logger = get_logger("ai.pipeline")

# Session-scoped memory store for window/summary/conversation kinds (process-local)
_SESSION_MEMORY: dict[str, BaseMemory] = {}


class AIExecutionPipeline:
    STAGES = (
        "request",
        "pre_processing",
        "validation",
        "prompt_registry",
        "memory",
        "provider",
        "output_parser",
        "post_processing",
        "telemetry",
        "response",
    )

    def __init__(
        self,
        settings: Settings,
        provider: BaseAIProvider,
        prompts: PromptRegistry,
        memory_factory: MemoryFactory | None = None,
        *,
        pre_middleware: list[PreMiddlewareFn] | None = None,
        post_middleware: list[PostMiddlewareFn] | None = None,
    ) -> None:
        self.settings = settings
        self.provider = provider
        self.prompts = prompts
        self.memory_factory = memory_factory or MemoryFactory()
        self.middleware = MiddlewareChain(pre=pre_middleware, post=post_middleware)

    # ── Middleware registration (fluent) ────────────────────────────────────

    def use_pre(self, fn: PreMiddlewareFn) -> AIExecutionPipeline:
        self.middleware.use_pre(fn)
        return self

    def use_post(self, fn: PostMiddlewareFn) -> AIExecutionPipeline:
        self.middleware.use_post(fn)
        return self

    def use(self, middleware: PipelineMiddleware) -> AIExecutionPipeline:
        self.middleware.use(middleware)
        return self

    async def run(self, request: PipelineRequest) -> PipelineResult:
        stages: list[str] = ["request"]
        request_id = request.request_id or new_request_id()
        request.request_id = request_id
        timer = Timer()
        model_name = request.model or self.settings.chat_model
        prompt_text = ""
        messages: list[dict[str, str]] = []
        ctx = PipelineContext(request=request, request_id=request_id)

        try:
            # ── Pre-processing Middleware ───────────────────────────
            ctx = await self.middleware.run_pre(ctx)
            request = ctx.request
            stages.append("pre_processing")

            # ── Validation ──────────────────────────────────────────
            request = validate_pipeline_request(request)
            ctx.request = request
            stages.append("validation")

            # ── Prompt Registry ─────────────────────────────────────
            messages = self._apply_prompts(request)
            ctx.messages = messages
            stages.append("prompt_registry")

            # ── Memory ──────────────────────────────────────────────
            memory = self._resolve_memory(request)
            messages = self._merge_memory(memory, messages, request)
            ctx.messages = messages
            stages.append("memory")

            prompt_text = " ".join(m.get("content", "") for m in messages)
            model_name = request.model or self.settings.chat_model

            # ── Provider ────────────────────────────────────────────
            raw = await self.provider.chat(
                messages,
                model=model_name,
                temperature=request.temperature if request.temperature is not None else self.settings.temperature,
                max_tokens=request.max_tokens if request.max_tokens is not None else self.settings.max_tokens,
            )
            content = raw.get("content") or ""
            ctx.raw = raw
            ctx.content = content
            stages.append("provider")

            # ── Output Parser ───────────────────────────────────────
            parser = get_output_parser(request.output_format)
            parsed = parser.parse(content)
            if request.output_format == "text":
                content = parsed if isinstance(parsed, str) else content
            ctx.content = content if isinstance(content, str) else str(content)
            ctx.parsed = parsed
            stages.append("output_parser")

            # ── Post-processing Middleware ──────────────────────────
            ctx = await self.middleware.run_post(ctx)
            content = ctx.content
            parsed = ctx.parsed
            stages.append("post_processing")

            # Persist assistant turn into memory (after post hooks)
            if memory is not None:
                user_text = request.message or next(
                    (m["content"] for m in reversed(request.messages) if m.get("role") == "user"),
                    "",
                )
                if user_text:
                    memory.add("user", user_text)
                memory.add("assistant", content if isinstance(content, str) else str(content))

            # ── Telemetry ───────────────────────────────────────────
            provider_name = raw.get("provider", self.provider.name)
            resolved_model = raw.get("model", model_name)
            usage = normalize_usage(
                raw.get("usage"),
                prompt_text=prompt_text,
                completion_text=content if isinstance(content, str) else str(content),
                provider=provider_name,
            )
            latency = timer.ms()
            meta = build_request_meta(
                request_id=request_id,
                provider=provider_name,
                model=resolved_model,
                latency_ms=latency,
                usage=usage,
                extra={
                    "pipeline": True,
                    "stages": list(stages) + ["telemetry", "response"],
                    "output_format": request.output_format,
                    "memory_kind": request.memory_kind,
                    "session_id": request.session_id,
                    "middleware": {
                        "pre": len(self.middleware.pre),
                        "post": len(self.middleware.post),
                        "extras": ctx.extras,
                    },
                },
            )
            log_ai_request(
                request_id=request_id,
                provider=provider_name,
                model=resolved_model,
                latency_ms=latency,
                usage=usage,
            )
            stages.extend(["telemetry", "response"])

            return PipelineResult(
                content=content if isinstance(content, str) else str(content),
                parsed=parsed,
                messages=messages,
                raw=raw,
                usage=usage,
                meta=meta,
                stages=stages,
            )
        except Exception as exc:  # noqa: BLE001
            error = str(exc)
            usage = normalize_usage(None, prompt_text=prompt_text, provider=self.provider.name)
            log_ai_request(
                request_id=request_id,
                provider=self.provider.name,
                model=model_name,
                latency_ms=timer.ms(),
                usage=usage,
                error=error,
            )
            if isinstance(exc, AIServiceError):
                raise
            raise AIServiceError(error, code="PIPELINE_ERROR", status_code=500) from exc

    async def stream(self, request: PipelineRequest) -> AsyncIterator[dict[str, Any]]:
        """Same stages as run(), but provider yields tokens via SSE-friendly events."""
        stages: list[str] = ["request"]
        request_id = request.request_id or new_request_id()
        request.request_id = request_id
        timer = Timer()
        model_name = request.model or self.settings.chat_model
        prompt_text = ""
        assembled: list[str] = []
        ctx = PipelineContext(request=request, request_id=request_id)

        try:
            ctx = await self.middleware.run_pre(ctx)
            request = ctx.request
            stages.append("pre_processing")

            request = validate_pipeline_request(request)
            ctx.request = request
            stages.append("validation")

            messages = self._apply_prompts(request)
            memory = self._resolve_memory(request)
            messages = self._merge_memory(memory, messages, request)
            ctx.messages = messages
            stages.extend(["prompt_registry", "memory"])
            prompt_text = " ".join(m.get("content", "") for m in messages)
            model_name = request.model or self.settings.chat_model

            yield {
                "event": "start",
                "requestId": request_id,
                "provider": self.provider.name,
                "model": model_name,
                "stages": list(stages),
                "timestamp": utc_now_iso(),
            }

            async for chunk in self.provider.stream(messages, model=model_name):
                assembled.append(chunk)
                yield {"event": "token", "requestId": request_id, "delta": chunk}

            stages.append("provider")
            content = "".join(assembled)
            parser = get_output_parser(request.output_format)
            parsed = parser.parse(content)
            if request.output_format == "text" and isinstance(parsed, str):
                content = parsed
            ctx.content = content
            ctx.parsed = parsed
            ctx.raw = {"content": content, "provider": self.provider.name, "model": model_name}
            stages.append("output_parser")

            ctx = await self.middleware.run_post(ctx)
            content = ctx.content
            parsed = ctx.parsed
            stages.append("post_processing")

            if memory is not None:
                user_text = request.message or next(
                    (m["content"] for m in reversed(request.messages) if m.get("role") == "user"),
                    "",
                )
                if user_text:
                    memory.add("user", user_text)
                memory.add("assistant", content)

            usage = normalize_usage(
                None,
                prompt_text=prompt_text,
                completion_text=content,
                provider=self.provider.name,
            )
            latency = timer.ms()
            log_ai_request(
                request_id=request_id,
                provider=self.provider.name,
                model=model_name,
                latency_ms=latency,
                usage=usage,
            )
            stages.extend(["telemetry", "response"])

            yield {
                "event": "done",
                "requestId": request_id,
                "provider": self.provider.name,
                "model": model_name,
                "latencyMs": round(latency, 2),
                "usage": usage,
                "content": content,
                "parsed": parsed,
                "stages": stages,
            }
        except Exception as exc:  # noqa: BLE001
            usage = normalize_usage(None, prompt_text=prompt_text, provider=self.provider.name)
            log_ai_request(
                request_id=request_id,
                provider=self.provider.name,
                model=model_name,
                latency_ms=timer.ms(),
                usage=usage,
                error=str(exc),
            )
            yield {"event": "error", "requestId": request_id, "error": str(exc)}

    def _apply_prompts(self, request: PipelineRequest) -> list[dict[str, str]]:
        msgs = list(request.messages)
        if request.message:
            msgs.append({"role": "user", "content": str(request.message).strip()})

        if request.skip_system_prompt:
            return msgs

        try:
            system = self.prompts.render(request.system_prompt, request.prompt_variables or None)
            if not msgs or msgs[0].get("role") != "system":
                msgs = [{"role": "system", "content": system.strip()}] + msgs
        except Exception as exc:  # noqa: BLE001
            logger.warning("prompt_registry skipped: %s", exc)
        return msgs

    def _resolve_memory(self, request: PipelineRequest) -> BaseMemory | None:
        if request.memory_kind == "none":
            return None
        key = request.session_id or f"anon:{id(self)}"
        cache_key = f"{key}:{request.memory_kind}:{request.memory_window}"
        if cache_key not in _SESSION_MEMORY:
            _SESSION_MEMORY[cache_key] = self.memory_factory.create(
                request.memory_kind,
                window_size=request.memory_window,
            )
        return _SESSION_MEMORY[cache_key]

    def _merge_memory(
        self,
        memory: BaseMemory | None,
        messages: list[dict[str, str]],
        request: PipelineRequest,
    ) -> list[dict[str, str]]:
        if memory is None:
            return messages
        history = memory.get()
        if not history:
            return messages
        system = [m for m in messages if m.get("role") == "system"]
        rest = [m for m in messages if m.get("role") != "system"]
        return system + history + rest
