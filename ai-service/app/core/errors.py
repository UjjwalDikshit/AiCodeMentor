"""Exception handlers + response helpers."""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AIServiceError, AppError


def coming_soon(resource: str = "resource") -> dict:
    return {
        "success": True,
        "message": "Coming Soon",
        "data": {},
        "meta": {"resource": resource, "service": "ai-service", "layer": "infrastructure"},
    }


def ok(message: str = "OK", data: dict | None = None, meta: dict | None = None) -> dict:
    return {
        "success": True,
        "message": message,
        "data": data or {},
        "meta": meta or {},
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AIServiceError)
    async def ai_error_handler(_request: Request, exc: AIServiceError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": {},
                "meta": {"code": exc.code},
            },
        )

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": {},
                "meta": {"code": exc.code},
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
        from app.config.settings import get_settings

        detail = str(exc) if get_settings().app_env != "production" else None
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
                "data": {},
                "meta": {"detail": detail},
            },
        )
