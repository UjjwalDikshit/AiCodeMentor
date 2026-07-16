"""Centralized exception handlers + response helpers."""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def coming_soon(resource: str = "resource") -> dict:
    return {
        "success": True,
        "message": "Coming Soon",
        "meta": {"resource": resource, "service": "ai-service"},
    }


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Internal server error",
                "detail": str(exc) if get_debug() else None,
            },
        )


def get_debug() -> bool:
    from app.core.config import get_settings

    return get_settings().app_env != "production"
