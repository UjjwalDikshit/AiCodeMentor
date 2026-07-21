"""Legacy feature endpoints — Coming Soon placeholders (no AI business logic)."""
from fastapi import APIRouter

from app.core.errors import coming_soon

router = APIRouter(tags=["legacy-placeholders"])


@router.post("/interview")
@router.post("/interview/")
async def interview_placeholder() -> dict:
    return coming_soon("interview")


# /resume product placeholder removed — use /resume-intel (Resume Intelligence Platform)


# /code-review placeholder removed — use /code-intel (Code Intelligence Platform)
