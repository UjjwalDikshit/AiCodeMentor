from app.core.errors import coming_soon


class CodeReviewService:
    async def respond_placeholder(self) -> dict:
        return coming_soon("code-review")


def get_code_review_service() -> CodeReviewService:
    return CodeReviewService()
