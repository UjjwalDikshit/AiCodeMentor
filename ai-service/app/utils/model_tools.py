"""Cost / model selection helpers (infrastructure estimates only)."""
from __future__ import annotations


# Rough USD per 1M tokens — illustrative for dashboards, not billing truth
PROVIDER_RATES = {
    "groq": {"input": 0.05, "output": 0.08},
    "ollama": {"input": 0.0, "output": 0.0},
    "dummy": {"input": 0.0, "output": 0.0},
}


def estimate_cost(provider: str, prompt_tokens: int, completion_tokens: int) -> float:
    rates = PROVIDER_RATES.get(provider, PROVIDER_RATES["dummy"])
    return (prompt_tokens / 1_000_000) * rates["input"] + (completion_tokens / 1_000_000) * rates["output"]


def select_model(settings_model: str, override: str | None = None) -> str:
    return override or settings_model


def format_chat_response(result: dict) -> dict:
    return {
        "content": result.get("content", ""),
        "model": result.get("model"),
        "provider": result.get("provider"),
        "usage": result.get("usage") or {},
    }
