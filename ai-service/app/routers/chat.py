import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.config.settings import Settings
from app.core.deps import get_ai_settings, get_ai_provider, get_prompt_registry, get_memory_factory
from app.models.schemas import InfraChatRequest
from app.memory.factory import MemoryFactory
from app.prompts.registry import PromptRegistry
from app.providers.base import BaseAIProvider
from app.services.infra import ChatInfraService
from app.utils.telemetry import new_request_id

router = APIRouter(prefix="/chat", tags=["chat"])


def _service(
    settings: Settings = Depends(get_ai_settings),
    provider: BaseAIProvider = Depends(get_ai_provider),
    prompts: PromptRegistry = Depends(get_prompt_registry),
    memory_factory: MemoryFactory = Depends(get_memory_factory),
) -> ChatInfraService:
    return ChatInfraService(settings, provider, prompts, memory_factory)


def _chat_kwargs(body: InfraChatRequest) -> dict:
    return {
        "messages": [{"role": m.role, "content": m.content} for m in body.messages],
        "message": body.message,
        "model": body.model,
        "provider": body.provider,
        "system_prompt": body.system_prompt,
        "prompt_variables": body.prompt_variables,
        "skip_system_prompt": body.skip_system_prompt,
        "memory_kind": body.memory_kind,
        "memory_window": body.memory_window,
        "session_id": body.session_id,
        "output_format": body.output_format,
        "temperature": body.temperature,
        "max_tokens": body.max_tokens,
    }


@router.post("")
@router.post("/")
async def chat(body: InfraChatRequest, service: ChatInfraService = Depends(_service)) -> dict:
    return await service.chat(
        **_chat_kwargs(body),
        use_demo_graph=body.use_demo_graph,
        request_id=new_request_id(),
    )


@router.post("/stream")
async def stream_chat(body: InfraChatRequest, service: ChatInfraService = Depends(_service)):
    """Server-Sent Events stream through the AI execution pipeline."""
    request_id = new_request_id()

    async def event_generator():
        async for chunk in service.stream_chat(**_chat_kwargs(body), request_id=request_id):
            event = chunk.get("event", "message")
            yield f"event: {event}\ndata: {json.dumps(chunk, default=str)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
