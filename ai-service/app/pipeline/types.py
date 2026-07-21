"""Pipeline request / result contracts."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

OutputFormat = Literal["text", "json", "passthrough"]
MemoryKind = Literal["none", "buffer", "conversation", "window", "summary"]


@dataclass
class PipelineRequest:
    """Inbound AI execution request (infrastructure — not a product feature)."""

    messages: list[dict[str, str]] = field(default_factory=list)
    message: str | None = None
    model: str | None = None
    provider: str | None = None  # optional override via ProviderFactory
    temperature: float | None = None
    max_tokens: int | None = None
    request_id: str | None = None

    # Prompt registry
    system_prompt: str = "system_default"
    prompt_variables: dict[str, Any] = field(default_factory=dict)
    skip_system_prompt: bool = False

    # Memory
    memory_kind: MemoryKind = "none"
    memory_window: int = 10
    session_id: str | None = None

    # Output
    output_format: OutputFormat = "text"


@dataclass
class PipelineResult:
    """Normalized pipeline response after telemetry."""

    content: str
    parsed: Any
    messages: list[dict[str, str]]
    raw: dict[str, Any]
    usage: dict[str, Any]
    meta: dict[str, Any]
    stages: list[str] = field(default_factory=list)

    def to_response(self, message: str = "Pipeline complete") -> dict[str, Any]:
        from app.core.errors import ok

        return ok(
            message=message,
            data={
                "content": self.content,
                "parsed": self.parsed,
                "model": self.raw.get("model"),
                "provider": self.raw.get("provider"),
                "usage": self.usage,
                "estimatedCost": self.usage.get("estimatedCost"),
                "stages": self.stages,
            },
            meta=self.meta,
        )
