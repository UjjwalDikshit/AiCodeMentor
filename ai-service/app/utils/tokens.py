"""Token estimation utilities."""
from __future__ import annotations


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    try:
        import tiktoken

        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:  # noqa: BLE001
        # ~4 chars per token heuristic
        return max(1, len(text) // 4)
