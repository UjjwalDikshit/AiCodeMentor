from fastapi import APIRouter, Depends

from app.services.interview_service import InterviewService, get_interview_service

router = APIRouter()


@router.post("")
@router.post("/")
async def interview(
    service: InterviewService = Depends(get_interview_service),
) -> dict:
    return await service.respond_placeholder()
