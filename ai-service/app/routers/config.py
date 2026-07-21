from fastapi import APIRouter, Depends

from app.config.settings import Settings
from app.core.deps import get_ai_settings
from app.services.infra import ConfigService

router = APIRouter(prefix="/config", tags=["config"])


@router.get("")
@router.get("/")
async def get_config(settings: Settings = Depends(get_ai_settings)) -> dict:
    return ConfigService(settings).public_config()
