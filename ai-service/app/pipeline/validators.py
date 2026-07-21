"""Request validation stage."""
from __future__ import annotations

from app.core.exceptions import ValidationError
from app.pipeline.types import PipelineRequest

ALLOWED_ROLES = frozenset({"system", "user", "assistant", "developer"})
ALLOWED_OUTPUT = frozenset({"text", "json", "passthrough"})
ALLOWED_MEMORY = frozenset({"none", "buffer", "conversation", "window", "summary"})
ALLOWED_PROVIDERS = frozenset({"dummy", "groq", "ollama"})


def validate_pipeline_request(request: PipelineRequest) -> PipelineRequest:
    """Validate and normalize a pipeline request. Raises ValidationError on failure."""
    if not isinstance(request.messages, list):
        raise ValidationError("messages must be a list")

    normalized: list[dict[str, str]] = []
    for i, msg in enumerate(request.messages):
        if not isinstance(msg, dict):
            raise ValidationError(f"messages[{i}] must be an object")
        role = str(msg.get("role", "")).strip().lower()
        content = msg.get("content")
        if role not in ALLOWED_ROLES:
            raise ValidationError(f"messages[{i}].role must be one of {sorted(ALLOWED_ROLES)}")
        if content is None or not str(content).strip():
            raise ValidationError(f"messages[{i}].content must be a non-empty string")
        normalized.append({"role": role, "content": str(content)})

    request.messages = normalized

    if request.message is not None and not str(request.message).strip():
        raise ValidationError("message must be non-empty when provided")

    if not request.messages and not request.message:
        raise ValidationError("Provide at least one message or a message string")

    if request.provider is not None:
        key = str(request.provider).strip().lower()
        if key and key not in ALLOWED_PROVIDERS:
            raise ValidationError(f"provider must be one of {sorted(ALLOWED_PROVIDERS)}")
        request.provider = key or None

    if request.output_format not in ALLOWED_OUTPUT:
        raise ValidationError(f"output_format must be one of {sorted(ALLOWED_OUTPUT)}")

    if request.memory_kind not in ALLOWED_MEMORY:
        raise ValidationError(f"memory_kind must be one of {sorted(ALLOWED_MEMORY)}")

    if request.memory_window < 1:
        raise ValidationError("memory_window must be >= 1")

    if request.temperature is not None and not (0.0 <= float(request.temperature) <= 2.0):
        raise ValidationError("temperature must be between 0 and 2")

    if request.max_tokens is not None and int(request.max_tokens) < 1:
        raise ValidationError("max_tokens must be >= 1")

    return request
