from fastapi import APIRouter, Depends

from app.services.resume_service import ResumeService, get_resume_service

router = APIRouter()


@router.post("")
@router.post("/")
async def resume(
    service: ResumeService = Depends(get_resume_service),
) -> dict:
    return await service.respond_placeholder()
