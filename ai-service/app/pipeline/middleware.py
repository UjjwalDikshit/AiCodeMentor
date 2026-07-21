"""
Pipeline middleware hooks.

Pre-processing  — runs after Request, before Validation (mutate/enrich PipelineRequest).
Post-processing — runs after Output Parser, before Telemetry (mutate content/parsed).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Protocol

from app.pipeline.types import PipelineRequest


@dataclass
class PipelineContext:
    """Mutable bag passed through middleware chains."""

    request: PipelineRequest
    request_id: str
    messages: list[dict[str, str]] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)
    content: str = ""
    parsed: Any = None
    extras: dict[str, Any] = field(default_factory=dict)


PreMiddlewareFn = Callable[[PipelineContext], Awaitable[PipelineContext] | PipelineContext]
PostMiddlewareFn = Callable[[PipelineContext], Awaitable[PipelineContext] | PipelineContext]


class PipelineMiddleware(Protocol):
    """Optional class-based middleware with pre and/or post hooks."""

    name: str

    async def pre(self, ctx: PipelineContext) -> PipelineContext: ...

    async def post(self, ctx: PipelineContext) -> PipelineContext: ...


async def _maybe_await(result: Any) -> Any:
    if hasattr(result, "__await__"):
        return await result
    return result


class MiddlewareChain:
    """Ordered pre/post middleware runners."""

    def __init__(
        self,
        *,
        pre: list[PreMiddlewareFn] | None = None,
        post: list[PostMiddlewareFn] | None = None,
    ) -> None:
        self.pre: list[PreMiddlewareFn] = list(pre or [])
        self.post: list[PostMiddlewareFn] = list(post or [])

    def use_pre(self, fn: PreMiddlewareFn) -> MiddlewareChain:
        self.pre.append(fn)
        return self

    def use_post(self, fn: PostMiddlewareFn) -> MiddlewareChain:
        self.post.append(fn)
        return self

    def use(self, middleware: PipelineMiddleware) -> MiddlewareChain:
        """Register a class-based middleware (both hooks if present)."""
        if hasattr(middleware, "pre"):
            self.pre.append(middleware.pre)
        if hasattr(middleware, "post"):
            self.post.append(middleware.post)
        return self

    async def run_pre(self, ctx: PipelineContext) -> PipelineContext:
        for fn in self.pre:
            ctx = await _maybe_await(fn(ctx))
        return ctx

    async def run_post(self, ctx: PipelineContext) -> PipelineContext:
        for fn in self.post:
            ctx = await _maybe_await(fn(ctx))
        return ctx


# ── Built-in infrastructure middlewares (opt-in) ─────────────────────────────


async def truncate_message_pre(ctx: PipelineContext) -> PipelineContext:
    """Example pre-hook: cap oversized message bodies before validation."""
    max_chars = 50_000
    if ctx.request.message and len(ctx.request.message) > max_chars:
        ctx.request.message = ctx.request.message[:max_chars]
        ctx.extras["truncated"] = True
    trimmed: list[dict[str, str]] = []
    for msg in ctx.request.messages:
        content = msg.get("content", "")
        if len(content) > max_chars:
            trimmed.append({**msg, "content": content[:max_chars]})
            ctx.extras["truncated"] = True
        else:
            trimmed.append(msg)
    ctx.request.messages = trimmed
    return ctx


async def strip_content_post(ctx: PipelineContext) -> PipelineContext:
    """Example post-hook: normalize whitespace on text outputs."""
    if isinstance(ctx.content, str):
        ctx.content = ctx.content.strip()
    if isinstance(ctx.parsed, str):
        ctx.parsed = ctx.parsed.strip()
    return ctx
