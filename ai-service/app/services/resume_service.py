from app.core.errors import coming_soon


class ResumeService:
    async def respond_placeholder(self) -> dict:
        return coming_soon("resume")


def get_resume_service() -> ResumeService:
    return ResumeService()
