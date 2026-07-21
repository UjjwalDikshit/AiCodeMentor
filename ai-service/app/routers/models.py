from fastapi import APIRouter, Depends

from app.config.settings import Settings
from app.core.deps import get_ai_settings
from app.services.infra import ModelsService

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
@router.get("/")
async def list_models(settings: Settings = Depends(get_ai_settings)) -> dict:
    return ModelsService(settings).list_models()
