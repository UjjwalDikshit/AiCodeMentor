from fastapi import APIRouter

from app.core.errors import coming_soon

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {
        "success": True,
        "message": "CodeMentor AI service is healthy",
        "service": "ai-service",
    }


@router.get("/")
async def root() -> dict:
    return coming_soon("health.root")
