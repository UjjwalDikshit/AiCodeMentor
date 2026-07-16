from fastapi import APIRouter, Depends

from app.services.code_review_service import CodeReviewService, get_code_review_service

router = APIRouter()


@router.post("")
@router.post("/")
async def code_review(
    service: CodeReviewService = Depends(get_code_review_service),
) -> dict:
    return await service.respond_placeholder()
