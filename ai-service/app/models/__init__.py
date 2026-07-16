"""
Pydantic request/response models (separate from Mongoose backend models).
"""
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(default="", description="User message")
    session_id: str | None = None


class PlaceholderResponse(BaseModel):
    success: bool = True
    message: str = "Coming Soon"
