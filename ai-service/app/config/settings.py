"""
Centralized AI service settings — switch providers via AI_PROVIDER only.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # App
    app_env: str = "development"
    app_name: str = "CodeMentor AI Service"
    app_version: str = "1.0.0"
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = 8000
    ai_log_level: str = "info"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:5000"]
    )

    # Provider selection — change this one variable to switch LLMs
    ai_provider: Literal["groq", "ollama", "dummy"] = "dummy"

    # Groq
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"

    # HuggingFace / embeddings
    hf_token: str = ""
    embedding_provider: Literal["huggingface", "nomic", "dummy"] = "dummy"
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    # Chat model params
    chat_model: str = "llama-3.1-8b-instant"
    temperature: float = 0.2
    max_tokens: int = 2048
    top_p: float = 1.0
    top_k: int = 40

    # Chroma
    chroma_directory: str = "./data/chroma"
    chroma_collection: str = "codementor_docs"

    # Prompts — resolved relative to package if relative path given
    prompts_directory: str = "app/prompts/registry"

    # Legacy aliases (ignored for selection; kept for env compatibility)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_provider: str = ""
    llm_model: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
