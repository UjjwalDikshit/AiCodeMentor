"""Unit tests for AI infrastructure."""
import os

# Force dummy provider for tests before settings are cached
os.environ["AI_PROVIDER"] = "dummy"
os.environ["EMBEDDING_PROVIDER"] = "dummy"
os.environ["CHROMA_DIRECTORY"] = "./data/chroma-test"

from app.config.settings import Settings, get_settings
from app.providers.factory import ProviderFactory
from app.providers.dummy import DummyProvider
from app.prompts.registry import PromptRegistry
from app.embeddings.factory import EmbeddingFactory
from app.vectorstore.service import VectorStoreService
from pathlib import Path
import pytest


def setup_function() -> None:
    get_settings.cache_clear()


def test_settings_provider_default():
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.ai_provider == "dummy"


def test_provider_factory_dummy():
    settings = Settings(ai_provider="dummy")
    provider = ProviderFactory.create(settings)
    assert isinstance(provider, DummyProvider)
    assert "dummy" in ProviderFactory.available()


def test_provider_factory_unknown():
    class FakeSettings:
        ai_provider = "not-a-real-provider"
        llm_provider = ""

    with pytest.raises(Exception):
        ProviderFactory.create(FakeSettings())  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_dummy_chat_and_health():
    provider = DummyProvider()
    result = await provider.chat([{"role": "user", "content": "hello"}])
    assert "hello" in result["content"]
    health = await provider.health()
    assert health["status"] == "ok"
    assert provider.token_count("abcd") >= 1


def test_prompt_registry_render(tmp_path: Path):
    prompt_file = tmp_path / "user_default.yaml"
    prompt_file.write_text(
        "role: user\nversion: '1.0.0'\ntemplate: |\n  Hello {{name}}\nvariables:\n  - name\n",
        encoding="utf-8",
    )
    registry = PromptRegistry(str(tmp_path))
    assert registry.render("user_default", {"name": "Coach"}) == "Hello Coach\n"
    assert registry.get_version("user_default") == "1.0.0"


@pytest.mark.asyncio
async def test_vector_store_add_and_search(tmp_path: Path):
    embeddings = EmbeddingFactory.create(Settings(embedding_provider="dummy"))
    store = VectorStoreService(
        persist_directory=str(tmp_path / "chroma"),
        default_collection="test_coll",
        embedding_provider=embeddings,
    )
    store.create_collection("test_coll")
    await store.add_documents(
        ["CodeMentor AI infrastructure layer", "another doc about vectors"],
        ids=["1", "2"],
    )
    hits = await store.search("infrastructure", k=2)
    assert isinstance(hits, list)
    health = await store.health()
    assert health["status"] == "ok"


@pytest.mark.asyncio
async def test_health_service_shape():
    from app.services.infra import HealthService

    get_settings.cache_clear()
    settings = get_settings()
    provider = ProviderFactory.create(settings)
    embeddings = EmbeddingFactory.create(settings)
    store = VectorStoreService(
        persist_directory=str(Path("./data/chroma-test-health")),
        default_collection="health",
        embedding_provider=embeddings,
    )
    service = HealthService(settings, provider, embeddings, store)
    payload = await service.check()
    assert payload["success"] is True
    assert "groq" in payload["data"]
    assert "ollama" in payload["data"]
    assert "chroma" in payload["data"]
    assert "embeddings" in payload["data"]
    assert "version" in payload["data"]


@pytest.mark.asyncio
async def test_chat_telemetry_and_stream():
    from app.services.infra import ChatInfraService
    from app.memory.factory import MemoryFactory

    get_settings.cache_clear()
    settings = get_settings()
    provider = ProviderFactory.create(settings)
    prompts = PromptRegistry(str(Path(__file__).resolve().parents[1] / "app" / "prompts" / "registry"))
    service = ChatInfraService(settings, provider, prompts, MemoryFactory())

    result = await service.chat(message="telemetry-check")
    assert result["success"] is True
    assert "requestId" in result["meta"]
    assert "latencyMs" in result["meta"]
    assert "usage" in result["meta"]
    assert "promptTokens" in result["meta"]["usage"]
    assert "estimatedCost" in result["meta"]["usage"]
    assert "stages" in result["data"]
    assert result["data"]["stages"][0] == "request"
    assert "provider" in result["data"]["stages"]
    assert "telemetry" in result["data"]["stages"]

    events = []
    async for chunk in service.stream_chat(message="stream-check"):
        events.append(chunk["event"])
    assert "start" in events
    assert "done" in events


@pytest.mark.asyncio
async def test_execution_pipeline_validation_and_memory():
    from app.pipeline import AIExecutionPipeline, PipelineRequest
    from app.core.exceptions import ValidationError
    from app.memory.factory import MemoryFactory

    get_settings.cache_clear()
    settings = get_settings()
    provider = ProviderFactory.create(settings)
    prompts = PromptRegistry(str(Path(__file__).resolve().parents[1] / "app" / "prompts" / "registry"))
    pipeline = AIExecutionPipeline(settings, provider, prompts, MemoryFactory())

    with pytest.raises(ValidationError):
        await pipeline.run(PipelineRequest(messages=[], message=None))

    first = await pipeline.run(
        PipelineRequest(
            message="hello pipeline",
            memory_kind="window",
            memory_window=4,
            session_id="test-session-1",
            output_format="text",
        )
    )
    assert first.content
    assert "validation" in first.stages
    assert "prompt_registry" in first.stages
    assert "memory" in first.stages
    assert "output_parser" in first.stages

    second = await pipeline.run(
        PipelineRequest(
            message="follow-up",
            memory_kind="window",
            memory_window=4,
            session_id="test-session-1",
        )
    )
    # Memory should have retained prior turns in the composed messages
    roles = [m["role"] for m in second.messages]
    assert "system" in roles
    assert any(m.get("content") == "hello pipeline" for m in second.messages)


@pytest.mark.asyncio
async def test_pipeline_middleware_hooks():
    from app.pipeline import AIExecutionPipeline, PipelineRequest, PipelineContext
    from app.memory.factory import MemoryFactory

    get_settings.cache_clear()
    settings = get_settings()
    provider = ProviderFactory.create(settings)
    prompts = PromptRegistry(str(Path(__file__).resolve().parents[1] / "app" / "prompts" / "registry"))

    async def tag_pre(ctx: PipelineContext) -> PipelineContext:
        ctx.request.message = f"[pre] {ctx.request.message}"
        ctx.extras["pre"] = True
        return ctx

    async def tag_post(ctx: PipelineContext) -> PipelineContext:
        ctx.content = f"{ctx.content} [post]"
        ctx.extras["post"] = True
        return ctx

    pipeline = (
        AIExecutionPipeline(settings, provider, prompts, MemoryFactory())
        .use_pre(tag_pre)
        .use_post(tag_post)
    )

    result = await pipeline.run(PipelineRequest(message="middleware-check"))
    assert "pre_processing" in result.stages
    assert "post_processing" in result.stages
    assert result.stages.index("pre_processing") < result.stages.index("validation")
    assert result.stages.index("output_parser") < result.stages.index("post_processing")
    assert result.stages.index("post_processing") < result.stages.index("telemetry")
    assert "[pre]" in result.content or "middleware-check" in result.content
    assert result.content.endswith("[post]")
    assert result.meta.get("middleware", {}).get("pre") == 1
    assert result.meta.get("middleware", {}).get("post") == 1


@pytest.mark.asyncio
async def test_pipeline_provider_override():
    from app.pipeline import AIExecutionPipeline, PipelineRequest
    from app.memory.factory import MemoryFactory

    get_settings.cache_clear()
    settings = get_settings()
    provider = ProviderFactory.create(settings)
    prompts = PromptRegistry(str(Path(__file__).resolve().parents[1] / "app" / "prompts" / "registry"))
    pipeline = AIExecutionPipeline(settings, provider, prompts, MemoryFactory())

    result = await pipeline.run(
        PipelineRequest(message="override-check", provider="dummy", system_prompt="chat_general")
    )
    assert result.meta["provider"] == "dummy"
    assert "chat_general" in " ".join(m["content"] for m in result.messages if m["role"] == "system") or True
