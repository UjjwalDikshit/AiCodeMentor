"""Document DTOs used by vector infrastructure."""
from __future__ import annotations

from pydantic import BaseModel, Field


class DocumentIn(BaseModel):
    id: str | None = None
    content: str = Field(..., min_length=1)
    metadata: dict = Field(default_factory=dict)


class DocumentBatch(BaseModel):
    documents: list[DocumentIn]
    collection: str | None = None
