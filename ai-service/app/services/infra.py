"""Infrastructure services — DI-friendly, no product AI features."""
from __future__ import annotations

from typing import Any

from app.agents.graph import DemoGraph
from app.config.settings import Settings
from app.core.errors import ok
from app.embeddings.base import BaseEmbeddingProvider
from app.memory.factory import MemoryFactory
from app.pipeline import AIExecutionPipeline, PipelineRequest
from app.prompts.registry import PromptRegistry
from app.providers.base import BaseAIProvider
from app.providers.factory import ProviderFactory
from app.vectorstore.service import VectorStoreService


class HealthService:
    def __init__(
        self,
        settings: Settings,
        provider: BaseAIProvider,
        embeddings: BaseEmbeddingProvider,
        vector_store: VectorStoreService,
    ) -> None:
        self.settings = settings
        self.provider = provider
        self.embeddings = embeddings
        self.vector_store = vector_store

    async def check(self) -> dict[str, Any]:
        provider_health = await self.provider.health()
        embedding_health = await self.embeddings.health()
        chroma_health = await self.vector_store.health()

        groq_status = {"status": "skipped"}
        ollama_status = {"status": "skipped"}
        if self.settings.ai_provider == "groq":
            groq_status = provider_health
        else:
            from app.providers.groq import GroqProvider

            groq_status = await GroqProvider(self.settings).health()
        if self.settings.ai_provider == "ollama":
            ollama_status = provider_health
        else:
            from app.providers.ollama import OllamaProvider

            ollama_status = await OllamaProvider(self.settings).health()

        overall = "ok"
        if chroma_health.get("status") == "down":
            overall = "degraded"

        return ok(
            message="AI infrastructure health",
            data={
                "status": overall,
                "version": self.settings.app_version,
                "active_provider": self.settings.ai_provider,
                "groq": groq_status,
                "ollama": ollama_status,
                "chroma": chroma_health,
                "embeddings": embedding_health,
            },
        )


class ChatInfraService:
    """Facade over AIExecutionPipeline (+ optional DemoGraph for graph plumbing)."""

    def __init__(
        self,
        settings: Settings,
        provider: BaseAIProvider,
        prompts: PromptRegistry,
        memory_factory: MemoryFactory,
    ) -> None:
        self.settings = settings
        self.provider = provider
        self.prompts = prompts
        self.memory_factory = memory_factory
        self.demo_graph = DemoGraph()
        self.pipeline = AIExecutionPipeline(settings, provider, prompts, memory_factory)

    def _to_pipeline_request(self, **kwargs: Any) -> PipelineRequest:
        messages = list(kwargs.get("messages") or [])
        message = kwargs.get("message")
        if not messages and not message:
            message = "ping"
        return PipelineRequest(
            messages=messages,
            message=message,
            model=kwargs.get("model"),
            temperature=kwargs.get("temperature"),
            max_tokens=kwargs.get("max_tokens"),
            request_id=kwargs.get("request_id"),
            system_prompt=kwargs.get("system_prompt") or "system_default",
            prompt_variables=kwargs.get("prompt_variables") or {},
            memory_kind=kwargs.get("memory_kind") or "none",
            memory_window=int(kwargs.get("memory_window") or 10),
            session_id=kwargs.get("session_id"),
            output_format=kwargs.get("output_format") or "text",
        )

    async def chat(
        self,
        *,
        messages: list[dict[str, str]] | None = None,
        message: str | None = None,
        model: str | None = None,
        use_demo_graph: bool = False,
        request_id: str | None = None,
        system_prompt: str = "system_default",
        prompt_variables: dict | None = None,
        memory_kind: str = "none",
        memory_window: int = 10,
        session_id: str | None = None,
        output_format: str = "text",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        from app.pipeline.validators import validate_pipeline_request
        from app.utils.telemetry import (
            Timer,
            build_request_meta,
            log_ai_request,
            new_request_id,
            normalize_usage,
        )

        request_id = request_id or new_request_id()
        pipe_req = self._to_pipeline_request(
            messages=messages or [],
            message=message,
            model=model,
            request_id=request_id,
            system_prompt=system_prompt,
            prompt_variables=prompt_variables,
            memory_kind=memory_kind,
            memory_window=memory_window,
            session_id=session_id,
            output_format=output_format,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        if use_demo_graph:
            timer = Timer()
            pipe_req = validate_pipeline_request(pipe_req)
            msgs = self.pipeline._apply_prompts(pipe_req)
            state = await self.demo_graph.ainvoke({"messages": msgs}, thread_id="demo")
            content = state.get("response") or ""
            usage = normalize_usage(
                None,
                prompt_text=" ".join(m.get("content", "") for m in msgs),
                completion_text=content,
                provider=self.provider.name,
            )
            latency = timer.ms()
            meta = build_request_meta(
                request_id=request_id,
                provider=self.provider.name,
                model="demo_echo",
                latency_ms=latency,
                usage=usage,
                extra={"mode": "langgraph-demo", "pipeline": False},
            )
            log_ai_request(
                request_id=request_id,
                provider=self.provider.name,
                model="demo_echo",
                latency_ms=latency,
                usage=usage,
            )
            return ok(
                message="DemoGraph response",
                data={
                    "content": content,
                    "graph": "demo_echo",
                    "meta": state.get("meta"),
                    "usage": usage,
                },
                meta=meta,
            )

        result = await self.pipeline.run(pipe_req)
        return result.to_response(message="Infrastructure chat (pipeline)")

    async def stream_chat(
        self,
        *,
        messages: list[dict[str, str]] | None = None,
        message: str | None = None,
        model: str | None = None,
        request_id: str | None = None,
        system_prompt: str = "system_default",
        prompt_variables: dict | None = None,
        memory_kind: str = "none",
        memory_window: int = 10,
        session_id: str | None = None,
        output_format: str = "text",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        from app.utils.telemetry import new_request_id

        request_id = request_id or new_request_id()
        async for event in self.pipeline.stream(
            self._to_pipeline_request(
                messages=messages or [],
                message=message,
                model=model,
                request_id=request_id,
                system_prompt=system_prompt,
                prompt_variables=prompt_variables,
                memory_kind=memory_kind,
                memory_window=memory_window,
                session_id=session_id,
                output_format=output_format,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        ):
            yield event


class ProviderService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def list_providers(self) -> dict[str, Any]:
        return ok(
            message="Available AI providers",
            data={
                "active": self.settings.ai_provider,
                "supported": ProviderFactory.available(),
                "chat_model": self.settings.chat_model,
            },
        )


class ConfigService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def public_config(self) -> dict[str, Any]:
        return ok(
            message="Non-secret AI configuration",
            data={
                "ai_provider": self.settings.ai_provider,
                "chat_model": self.settings.chat_model,
                "embedding_provider": self.settings.embedding_provider,
                "embedding_model": self.settings.embedding_model,
                "temperature": self.settings.temperature,
                "max_tokens": self.settings.max_tokens,
                "top_p": self.settings.top_p,
                "top_k": self.settings.top_k,
                "chroma_directory": self.settings.chroma_directory,
                "chroma_collection": self.settings.chroma_collection,
                "ollama_base_url": self.settings.ollama_base_url,
                "version": self.settings.app_version,
            },
        )


class ModelsService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def list_models(self) -> dict[str, Any]:
        return ok(
            message="Configured models",
            data={
                "chat": {"provider": self.settings.ai_provider, "model": self.settings.chat_model},
                "embeddings": {
                    "provider": self.settings.embedding_provider,
                    "model": self.settings.embedding_model,
                },
            },
        )


class VectorInfraService:
    def __init__(self, vector_store: VectorStoreService) -> None:
        self.vector_store = vector_store

    async def create_collection(self, name: str, metadata: dict | None = None) -> dict:
        data = self.vector_store.create_collection(name, metadata)
        return ok(message="Collection ready", data=data)

    async def search(self, query: str, k: int = 5, collection: str | None = None) -> dict:
        hits = await self.vector_store.search(query, k=k, collection=collection)
        return ok(message="Search complete", data={"hits": hits})

    async def add_documents(self, documents: list[dict], collection: str | None = None) -> dict:
        contents = [d["content"] for d in documents]
        ids = [d.get("id") for d in documents]
        ids = [i for i in ids if i] or None
        metadatas = [d.get("metadata") or {} for d in documents]
        data = await self.vector_store.add_documents(
            contents, ids=ids, metadatas=metadatas, collection=collection
        )
        return ok(message="Documents added", data=data)

    async def delete_document(self, doc_id: str, collection: str | None = None) -> dict:
        data = self.vector_store.delete_document(doc_id, collection=collection)
        return ok(message="Document deleted", data=data)

    async def health(self) -> dict:
        return ok(message="Vector store health", data=await self.vector_store.health())


class DocumentInfraService:
    """Loader catalog — no indexing pipelines yet."""

    def list_loaders(self) -> dict:
        from app.loaders import LOADERS

        return ok(
            message="Document loaders available",
            data={"loaders": sorted(LOADERS.keys())},
            meta={"note": "Infrastructure only — no RAG pipelines"},
        )
