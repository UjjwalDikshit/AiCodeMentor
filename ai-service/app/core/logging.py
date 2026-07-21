"""Structured logging for the AI service."""
import logging
import sys

from app.config.settings import get_settings


def setup_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.ai_log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format='{"timestamp":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
        stream=sys.stdout,
        force=True,
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
