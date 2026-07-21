"""Centralized AI-layer exceptions."""


class AIServiceError(Exception):
    def __init__(self, message: str, code: str = "AI_ERROR", status_code: int = 500) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class ProviderUnavailable(AIServiceError):
    def __init__(self, message: str = "AI provider unavailable") -> None:
        super().__init__(message, code="PROVIDER_UNAVAILABLE", status_code=503)


class EmbeddingError(AIServiceError):
    def __init__(self, message: str = "Embedding failed") -> None:
        super().__init__(message, code="EMBEDDING_ERROR", status_code=500)


class VectorStoreError(AIServiceError):
    def __init__(self, message: str = "Vector store error") -> None:
        super().__init__(message, code="VECTOR_STORE_ERROR", status_code=500)


class PromptError(AIServiceError):
    def __init__(self, message: str = "Prompt error") -> None:
        super().__init__(message, code="PROMPT_ERROR", status_code=400)


class ValidationError(AIServiceError):
    def __init__(self, message: str = "Validation failed") -> None:
        super().__init__(message, code="VALIDATION_ERROR", status_code=400)


class ParseError(AIServiceError):
    def __init__(self, message: str = "Output parse failed") -> None:
        super().__init__(message, code="PARSE_ERROR", status_code=422)


class ModelError(AIServiceError):
    def __init__(self, message: str = "Model error") -> None:
        super().__init__(message, code="MODEL_ERROR", status_code=500)


# Backward-compatible alias used by older scaffold
class AppError(AIServiceError):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message, code="APP_ERROR", status_code=status_code)
