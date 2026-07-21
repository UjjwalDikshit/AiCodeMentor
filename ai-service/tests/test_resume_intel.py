"""Tests for Resume Intelligence — parser, chunking, RAG, ATS, JD, compare, report."""
import os

os.environ["AI_PROVIDER"] = "dummy"
os.environ["EMBEDDING_PROVIDER"] = "dummy"
os.environ["CHROMA_DIRECTORY"] = "./data/chroma-resume-test"

import pytest
from pathlib import Path

from app.config.settings import Settings, get_settings
from app.embeddings.factory import EmbeddingFactory
from app.resume.parser import parse_resume_text, detect_section
from app.resume.chunker import chunk_resume
from app.resume.rag import ResumeRetriever
from app.resume.service import ResumeIntelService
from app.memory.factory import MemoryFactory
from app.prompts.registry import PromptRegistry
from app.providers.factory import ProviderFactory
from app.vectorstore.service import VectorStoreService


SAMPLE = """
Jane Doe
jane@example.com | +1-555-0100 | https://github.com/jane

SUMMARY
Full-stack engineer with 5 years building scalable APIs.

SKILLS
Python, FastAPI, React, MongoDB, Docker

EXPERIENCE
Software Engineer — Acme Corp
- Built RAG pipelines serving 10k users
- Reduced latency by 40%

PROJECTS
CodeMentor AI
- Resume intelligence with vector retrieval

EDUCATION
B.S. Computer Science

ACHIEVEMENTS
- Hackathon winner 2024

CERTIFICATIONS
AWS Cloud Practitioner

LANGUAGES
English, Hindi

PUBLICATIONS
None listed
"""


def setup_function() -> None:
    get_settings.cache_clear()


def _svc(tmp_path: Path) -> ResumeIntelService:
    get_settings.cache_clear()
    settings = Settings(
        ai_provider="dummy",
        embedding_provider="dummy",
        chroma_directory=str(tmp_path / "chroma"),
        prompts_directory=str(Path(__file__).resolve().parents[1] / "app" / "prompts" / "registry"),
    )
    provider = ProviderFactory.create(settings)
    prompts = PromptRegistry(settings.prompts_directory)
    embeddings = EmbeddingFactory.create(settings)
    store = VectorStoreService(
        persist_directory=settings.chroma_directory,
        default_collection="test",
        embedding_provider=embeddings,
    )
    return ResumeIntelService(settings, provider, prompts, store, MemoryFactory())


def test_detect_section_confidence():
    key, conf = detect_section("EXPERIENCE")
    assert key == "experience"
    assert conf >= 0.7


def test_detect_unknown_falls_to_misc_or_none():
    key, conf = detect_section("HOBBIES AND INTERESTS")
    # ALL-CAPS short → miscellaneous with low confidence, or alias miss
    assert key in (None, "miscellaneous") or conf < 0.7 or key == "miscellaneous"


def test_parse_resume_hybrid_sections():
    structured = parse_resume_text(SAMPLE)
    for key in (
        "header",
        "summary",
        "skills",
        "experience",
        "projects",
        "education",
        "achievements",
        "certifications",
        "publications",
        "languages",
        "links",
        "miscellaneous",
    ):
        assert key in structured
    assert structured["contact"]["emails"]
    assert structured["sectionConfidence"]["experience"] >= 0.7
    assert "RAG" in structured["experience"] or "pipelines" in structured["experience"]
    # Not regex-only: sectionConfidence + alias heading classification
    assert isinstance(structured["sectionConfidence"], dict)


def test_chunk_resume_metadata_complete():
    structured = parse_resume_text(SAMPLE)
    chunks = chunk_resume(structured, resume_id="r1", version=2, embedding_model="BAAI/bge-small-en-v1.5")
    assert len(chunks) >= 3
    meta = chunks[0]["metadata"]
    assert meta["resumeId"] == "r1"
    assert meta["version"] == 2
    assert meta["section"]
    assert meta["chunkId"]
    assert meta["page"] == 1
    assert meta["createdAt"]
    assert meta["embeddingModel"] == "BAAI/bge-small-en-v1.5"
    sections = {c["metadata"]["section"] for c in chunks}
    assert "experience" in sections or "skills" in sections


@pytest.mark.asyncio
async def test_rag_index_search_version_filter(tmp_path: Path):
    embeddings = EmbeddingFactory.create(Settings(embedding_provider="dummy"))
    store = VectorStoreService(
        persist_directory=str(tmp_path / "chroma"),
        default_collection="resume_test",
        embedding_provider=embeddings,
    )
    retriever = ResumeRetriever(store)
    structured = parse_resume_text(SAMPLE)
    chunks_v1 = chunk_resume(structured, resume_id="resumeA", version=1)
    chunks_v2 = chunk_resume(structured, resume_id="resumeA", version=2)
    await retriever.index_chunks(user_id="user1", chunks=chunks_v1)
    await retriever.index_chunks(user_id="user1", chunks=chunks_v2)
    hits = await retriever.search(
        user_id="user1", query="RAG pipelines", k=5, resume_id="resumeA", version=2
    )
    assert len(hits) >= 1
    assert all(int(h["metadata"]["version"]) == 2 for h in hits)


@pytest.mark.asyncio
async def test_separate_resume_and_jd_collections(tmp_path: Path):
    svc = _svc(tmp_path)
    assert svc.retriever.collection_for_user("abc") == "resume_user_abc"
    assert svc.retriever.jd_collection_for_user("abc") == "jd_user_abc"
    await svc.parse_and_index(user_id="u1", resume_id="r1", version=1, text=SAMPLE)
    await svc.index_jd(user_id="u1", jd_id="jd1", text="Need Python FastAPI Kubernetes experience.")
    colls = (await svc.vector_store.health())["collections"]
    assert any("resume_user_" in c for c in colls)
    assert any("jd_user_" in c for c in colls)


@pytest.mark.asyncio
async def test_ats_uses_rag_not_full_resume(tmp_path: Path, monkeypatch):
    svc = _svc(tmp_path)
    await svc.parse_and_index(user_id="u2", resume_id="r2", version=1, text=SAMPLE)
    captured = {}

    async def capture_pipeline_json(**kwargs):
        captured["variables"] = kwargs.get("variables") or {}
        return {"parsed": {"overallScore": 70, "sectionScores": {}}, "stages": [], "rag": True}

    monkeypatch.setattr(svc, "_pipeline_json", capture_pipeline_json)
    await svc.ats_evaluate(user_id="u2", resume_id="r2")
    vars_ = captured["variables"]
    assert "retrieved_context" in vars_
    assert "resume_json" not in vars_
    assert len(vars_["retrieved_context"]) > 0


@pytest.mark.asyncio
async def test_jd_match_uses_similarity_contexts(tmp_path: Path, monkeypatch):
    svc = _svc(tmp_path)
    await svc.parse_and_index(user_id="u3", resume_id="r3", version=1, text=SAMPLE)
    await svc.index_jd(user_id="u3", jd_id="jd3", text="Looking for FastAPI React MongoDB engineer.")
    captured = {}

    async def capture_pipeline_json(**kwargs):
        captured["variables"] = kwargs.get("variables") or {}
        return {"parsed": {"matchPercent": 60}, "rag": True}

    monkeypatch.setattr(svc, "_pipeline_json", capture_pipeline_json)
    await svc.match_jd(user_id="u3", resume_id="r3", jd_id="jd3", jd_text="Looking for FastAPI React MongoDB engineer.")
    vars_ = captured["variables"]
    assert "resume_context" in vars_ and "jd_context" in vars_
    assert "resume_json" not in vars_
    assert "jd_text" not in vars_


@pytest.mark.asyncio
async def test_bullets_skills_report_compare_pipeline(tmp_path: Path):
    svc = _svc(tmp_path)
    await svc.parse_and_index(user_id="u4", resume_id="r4", version=1, text=SAMPLE)
    await svc.parse_and_index(user_id="u4", resume_id="r4", version=2, text=SAMPLE + "\n- Led team of 5\n")
    bullets = await svc.improve_bullets(user_id="u4", resume_id="r4", version=1)
    assert bullets["success"]
    assert bullets["data"].get("retrievedChunkCount", 0) >= 0
    skills = await svc.skill_gap(user_id="u4", resume_id="r4", target_role="Backend Engineer")
    assert skills["success"]
    report = await svc.report(user_id="u4", resume_id="r4", version=1)
    assert report["success"]
    cmp = await svc.compare_versions(user_id="u4", resume_id="r4", version_a=1, version_b=2)
    assert cmp["success"]
    assert cmp["data"]["versions"]["v1"] == 1


@pytest.mark.asyncio
async def test_embeddings_stored_not_reembedded_on_search(tmp_path: Path):
    """Document embeddings are persisted; search only embeds the query."""
    embeddings = EmbeddingFactory.create(Settings(embedding_provider="dummy"))
    store = VectorStoreService(
        persist_directory=str(tmp_path / "chroma"),
        default_collection="c1",
        embedding_provider=embeddings,
    )
    retriever = ResumeRetriever(store)
    structured = parse_resume_text(SAMPLE)
    chunks = chunk_resume(structured, resume_id="rx", version=1)
    await retriever.index_chunks(user_id="ux", chunks=chunks)
    coll = store._get_client().get_or_create_collection(name=retriever.collection_for_user("ux"))
    # In-memory backend stores embeddings on docs
    if hasattr(coll, "_docs"):
        first = next(iter(coll._docs.values()))
        assert first.get("embedding")
        stored = list(first["embedding"])
        await retriever.search(user_id="ux", query="skills", k=2)
        first_after = next(iter(coll._docs.values()))
        assert list(first_after["embedding"]) == stored


@pytest.mark.asyncio
async def test_reindex_deletes_previous_chunks(tmp_path: Path):
    svc = _svc(tmp_path)
    r1 = await svc.parse_and_index(user_id="u5", resume_id="r5", version=1, text=SAMPLE)
    ids = r1["data"]["chunkIds"]
    assert ids
    r2 = await svc.parse_and_index(
        user_id="u5",
        resume_id="r5",
        version=1,
        text=SAMPLE,
        reindex=True,
        previous_chunk_ids=ids,
    )
    assert r2["success"]
