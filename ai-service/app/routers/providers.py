from fastapi import APIRouter, Depends

from app.config.settings import Settings
from app.core.deps import get_ai_settings
from app.services.infra import ProviderService

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("")
@router.get("/")
async def list_providers(settings: Settings = Depends(get_ai_settings)) -> dict:
    return ProviderService(settings).list_providers()
