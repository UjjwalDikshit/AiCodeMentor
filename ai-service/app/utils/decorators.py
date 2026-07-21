"""Retry / timing decorators and helpers."""
from __future__ import annotations

import functools
import time
from typing import Any, Callable, TypeVar

from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.logging import get_logger

logger = get_logger(__name__)
F = TypeVar("F", bound=Callable[..., Any])


def with_retry(attempts: int = 3) -> Callable[[F], F]:
    def decorator(fn: F) -> F:
        wrapped = retry(
            reraise=True,
            stop=stop_after_attempt(attempts),
            wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        )(fn)
        return wrapped  # type: ignore[return-value]

    return decorator


def timed(fn: F) -> F:
    @functools.wraps(fn)
    async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        try:
            return await fn(*args, **kwargs)
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.debug("%s took %.2fms", fn.__name__, elapsed_ms)

    @functools.wraps(fn)
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.debug("%s took %.2fms", fn.__name__, elapsed_ms)

    import asyncio

    if asyncio.iscoroutinefunction(fn):
        return async_wrapper  # type: ignore[return-value]
    return sync_wrapper  # type: ignore[return-value]
