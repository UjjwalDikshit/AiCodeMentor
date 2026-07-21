"""
CodeMentor AI — FastAPI infrastructure entrypoint.
Provider-agnostic AI platform layer. No product AI features yet.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.core.logging import setup_logging, get_logger
from app.core.errors import register_exception_handlers
from app.routers import health, providers, chat, vector, documents, models, config, legacy, resume_intel, code_intel

setup_logging()
logger = get_logger(__name__)
settings = get_settings()

# Ensure prompt registry + chroma dirs exist
Path(settings.prompts_directory).mkdir(parents=True, exist_ok=True)
Path(settings.chroma_directory).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="CodeMentor AI Infrastructure",
    description="Reusable AI platform layer (providers, vector store, prompts, graphs)",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(providers.router)
app.include_router(chat.router)
app.include_router(vector.router)
app.include_router(documents.router)
app.include_router(models.router)
app.include_router(config.router)
app.include_router(resume_intel.router)
app.include_router(code_intel.router)
app.include_router(legacy.router)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info(
        "AI infrastructure starting provider=%s embedding=%s",
        settings.ai_provider,
        settings.embedding_provider,
    )
