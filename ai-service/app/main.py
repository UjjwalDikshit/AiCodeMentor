"""
CodeMentor AI — FastAPI application entrypoint.
Routers are thin; business logic lives in services/ and agents/.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.core.errors import register_exception_handlers
from app.routers import health, chat, interview, resume, code_review

setup_logging()
logger = get_logger(__name__)
settings = get_settings()

app = FastAPI(
    title="CodeMentor AI Service",
    description="LangChain / LangGraph AI microservice for CodeMentor AI",
    version="1.0.0",
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

app.include_router(health.router, tags=["health"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])
app.include_router(resume.router, prefix="/resume", tags=["resume"])
app.include_router(code_review.router, prefix="/code-review", tags=["code-review"])


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("AI service starting", extra={"env": settings.app_env})
