"""
Provider factory — select implementation from Settings.ai_provider.
Services depend on BaseAIProvider, never concrete classes.
"""
from app.config.settings import Settings
from app.core.exceptions import ProviderUnavailable
from app.providers.base import BaseAIProvider
from app.providers.dummy import DummyProvider
from app.providers.groq import GroqProvider
from app.providers.ollama import OllamaProvider


class ProviderFactory:
    _registry: dict[str, type] = {
        "dummy": DummyProvider,
        "groq": GroqProvider,
        "ollama": OllamaProvider,
    }

    @classmethod
    def available(cls) -> list[str]:
        return sorted(cls._registry.keys())

    @classmethod
    def create(cls, settings: Settings) -> BaseAIProvider:
        key = (settings.ai_provider or "dummy").lower().strip()
        # Soft fallback: legacy LLM_PROVIDER env if AI_PROVIDER unset to dummy but llm_provider set
        if key == "dummy" and settings.llm_provider in cls._registry:
            # Only honor legacy if explicitly not dummy intent — keep AI_PROVIDER as source of truth
            pass

        if key not in cls._registry:
            raise ProviderUnavailable(
                f"Unknown AI_PROVIDER '{key}'. Supported: {', '.join(cls.available())}"
            )

        provider_cls = cls._registry[key]
        if provider_cls is DummyProvider:
            return DummyProvider()
        return provider_cls(settings)

    @classmethod
    def register(cls, name: str, provider_cls: type) -> None:
        """Extension point for future providers (e.g. Azure) without touching services."""
        cls._registry[name.lower()] = provider_cls
