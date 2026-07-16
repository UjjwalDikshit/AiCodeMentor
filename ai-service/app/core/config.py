"""
Centralized settings via pydantic-settings (dependency injection friendly).
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_name: str = "CodeMentor AI Service"
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = 8000
    ai_log_level: str = "info"

    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    chroma_persist_dir: str = "./data/chroma"
    chroma_collection: str = "codementor_docs"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5000"]


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — inject via FastAPI Depends(get_settings)."""
    return Settings()
