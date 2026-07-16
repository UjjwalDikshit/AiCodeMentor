from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.services.chat_service import ChatService, get_chat_service

router = APIRouter()


@router.post("")
@router.post("/")
async def chat(
    service: ChatService = Depends(get_chat_service),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Placeholder chat endpoint — LangGraph agent wired later."""
    return await service.respond_placeholder(provider=settings.llm_provider)
