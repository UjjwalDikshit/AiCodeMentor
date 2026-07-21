from app.utils.tokens import estimate_tokens
from app.utils.decorators import with_retry, timed
from app.utils.model_tools import estimate_cost, select_model, format_chat_response
from app.utils.telemetry import (
    new_request_id,
    normalize_usage,
    build_request_meta,
    log_ai_request,
    Timer,
    utc_now_iso,
)


def truncate(text: str, max_len: int = 500) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


__all__ = [
    "estimate_tokens",
    "with_retry",
    "timed",
    "estimate_cost",
    "select_model",
    "format_chat_response",
    "truncate",
    "new_request_id",
    "normalize_usage",
    "build_request_meta",
    "log_ai_request",
    "Timer",
    "utc_now_iso",
]
