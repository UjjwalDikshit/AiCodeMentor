"""Config package — re-export settings for DI."""
from app.config.settings import Settings, get_settings

__all__ = ["Settings", "get_settings"]
