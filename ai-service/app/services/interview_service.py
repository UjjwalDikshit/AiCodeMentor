from app.core.errors import coming_soon


class InterviewService:
    async def respond_placeholder(self) -> dict:
        return coming_soon("interview")


def get_interview_service() -> InterviewService:
    return InterviewService()
