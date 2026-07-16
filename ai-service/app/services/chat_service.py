from app.core.errors import coming_soon


class ChatService:
    async def respond_placeholder(self, provider: str = "openai") -> dict:
        payload = coming_soon("chat")
        payload["meta"]["llm_provider"] = provider
        return payload


def get_chat_service() -> ChatService:
    return ChatService()
