"""AI request telemetry — requestId, latency, token usage, structured logs."""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.logging import get_logger
from app.utils.model_tools import estimate_cost
from app.utils.tokens import estimate_tokens

logger = get_logger("ai.telemetry")


def new_request_id() -> str:
    return str(uuid.uuid4())


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_usage(
    usage: dict[str, Any] | None,
    *,
    prompt_text: str = "",
    completion_text: str = "",
    provider: str = "dummy",
) -> dict[str, Any]:
    usage = usage or {}
    prompt_tokens = int(
        usage.get("prompt_tokens")
        or usage.get("promptTokens")
        or (estimate_tokens(prompt_text) if prompt_text else 0)
    )
    completion_tokens = int(
        usage.get("completion_tokens")
        or usage.get("completionTokens")
        or (estimate_tokens(completion_text) if completion_text else 0)
    )
    total_tokens = int(usage.get("total_tokens") or usage.get("totalTokens") or (prompt_tokens + completion_tokens))
    return {
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_tokens,
        "estimatedCost": estimate_cost(provider, prompt_tokens, completion_tokens),
    }


def build_request_meta(
    *,
    request_id: str,
    provider: str,
    model: str,
    latency_ms: float,
    usage: dict[str, Any],
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    meta = {
        "requestId": request_id,
        "provider": provider,
        "model": model,
        "latencyMs": round(latency_ms, 2),
        "timestamp": utc_now_iso(),
        "usage": usage,
        "layer": "infrastructure",
    }
    if extra:
        meta.update(extra)
    return meta


def log_ai_request(
    *,
    request_id: str,
    provider: str,
    model: str,
    latency_ms: float,
    usage: dict[str, Any],
    error: str | None = None,
) -> None:
    payload = {
        "requestId": request_id,
        "provider": provider,
        "model": model,
        "latencyMs": round(latency_ms, 2),
        "promptTokens": usage.get("promptTokens"),
        "completionTokens": usage.get("completionTokens"),
        "totalTokens": usage.get("totalTokens"),
        "estimatedCost": usage.get("estimatedCost"),
        "error": error,
    }
    if error:
        logger.error("ai_request %s", payload)
    else:
        logger.info("ai_request %s", payload)


class Timer:
    def __init__(self) -> None:
        self._start = time.perf_counter()

    def ms(self) -> float:
        return (time.perf_counter() - self._start) * 1000
