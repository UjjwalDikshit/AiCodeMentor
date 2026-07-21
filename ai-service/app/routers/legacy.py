"""Legacy feature endpoints — Coming Soon placeholders (no AI business logic)."""
from fastapi import APIRouter

from app.core.errors import coming_soon

router = APIRouter(tags=["legacy-placeholders"])


@router.post("/interview")
@router.post("/interview/")
async def interview_placeholder() -> dict:
    return coming_soon("interview")


# /resume product placeholder removed — use /resume-intel (Resume Intelligence Platform)


@router.post("/code-review")
@router.post("/code-review/")
async def code_review_placeholder() -> dict:
    return coming_soon("code-review")
