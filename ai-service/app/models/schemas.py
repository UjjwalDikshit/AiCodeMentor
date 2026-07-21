"""Pydantic request/response models for infrastructure routers."""
from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant|developer)$")
    content: str


class InfraChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)
    message: str | None = None
    model: str | None = None
    use_demo_graph: bool = False
    # Pipeline options (infrastructure)
    system_prompt: str = "system_default"
    prompt_variables: dict[str, Any] = Field(default_factory=dict)
    memory_kind: Literal["none", "buffer", "conversation", "window", "summary"] = "none"
    memory_window: int = Field(default=10, ge=1, le=100)
    session_id: str | None = None
    output_format: Literal["text", "json", "passthrough"] = "text"
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1)


class VectorSearchRequest(BaseModel):
    query: str
    k: int = 5
    collection: str | None = None


class CollectionRequest(BaseModel):
    name: str
    metadata: dict | None = None
