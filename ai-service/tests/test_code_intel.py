"""Tests for Code Intelligence — deterministic engines + pipeline."""
import json
import os

os.environ["AI_PROVIDER"] = "dummy"
os.environ["EMBEDDING_PROVIDER"] = "dummy"

from pathlib import Path

import pytest

from app.code_intel.language import detect_language
from app.code_intel.parser import parse_code
from app.code_intel.static import analyze_static
from app.code_intel.complexity import analyze_complexity
from app.code_intel.security import analyze_security
from app.code_intel.performance import analyze_performance
from app.code_intel.quality import score_quality
from app.code_intel.diff import analyze_diff
from app.code_intel.service import CodeIntelService
from app.config.settings import Settings, get_settings
from app.memory.factory import MemoryFactory
from app.prompts.registry import PromptRegistry
from app.providers.factory import ProviderFactory


SAMPLE_PY = '''
def process(items):
    total = 0
    unused = 42
    for i in items:
        for j in items:
            total += i * j
    password = "supersecret123"
    eval("print(1)")
    return total
'''

SAMPLE_JS = '''
function fetchAll(users) {
  for (const u of users) {
    await db.query("SELECT * FROM orders WHERE user=" + u.id);
  }
}
'''


def setup_function() -> None:
    get_settings.cache_clear()


def _svc(tmp_path: Path) -> CodeIntelService:
    get_settings.cache_clear()
    settings = Settings(
        ai_provider="dummy",
        prompts_directory=str(Path(__file__).resolve().parents[1] / "app" / "prompts" / "registry"),
    )
    return CodeIntelService(
        settings,
        ProviderFactory.create(settings),
        PromptRegistry(settings.prompts_directory),
        MemoryFactory(),
    )


def test_detect_python():
    info = detect_language(SAMPLE_PY, "app.py")
    assert info["language"] == "python"
    assert info["confidence"] >= 0.5


def test_detect_javascript():
    info = detect_language(SAMPLE_JS, "x.js")
    assert info["language"] in {"javascript", "typescript"}


def test_detect_unknown():
    info = detect_language("zzzz ???", None)
    assert info["language"] == "unknown"
    assert "confidence" in info


def test_parser_extracts_functions():
    ast = parse_code(SAMPLE_PY, filename="app.py")
    assert ast["language"] == "python"
    assert any(f["name"] == "process" for f in ast["functions"])
    assert ast["parserBackend"] in {"heuristic", "tree-sitter"}
    assert isinstance(ast["callGraph"], list)
    assert isinstance(ast.get("conditionals"), list)


def test_parser_not_tokenizer_only():
    ast = parse_code(SAMPLE_PY, filename="app.py")
    fn = next(f for f in ast["functions"] if f["name"] == "process")
    assert fn.get("startLine") and fn.get("endLine") and fn.get("length", 0) >= 1


def test_static_unused_and_nested():
    ast = parse_code(SAMPLE_PY, filename="app.py")
    static = analyze_static(SAMPLE_PY, ast)
    rules = {f["rule"] for f in static["findings"]}
    assert "unused_variable" in rules or "deep_nesting" in rules or "magic_number" in rules


def test_complexity_metrics():
    ast = parse_code(SAMPLE_PY, filename="app.py")
    c = analyze_complexity(SAMPLE_PY, ast)
    assert c["cyclomaticComplexity"] >= 1
    assert "bigOEstimated" in c
    assert c["nestedLoopDepth"] >= 1


def test_security_detects_eval_and_secret():
    sec = analyze_security(SAMPLE_PY)
    rules = {f["rule"] for f in sec["findings"]}
    assert "unsafe_eval" in rules or "hardcoded_secret" in rules


def test_performance_nested_loops():
    ast = parse_code(SAMPLE_PY, filename="app.py")
    c = analyze_complexity(SAMPLE_PY, ast)
    perf = analyze_performance(SAMPLE_PY, ast, c)
    assert perf["findingCount"] >= 1


def test_quality_scores():
    ast = parse_code(SAMPLE_PY, filename="app.py")
    static = analyze_static(SAMPLE_PY, ast)
    c = analyze_complexity(SAMPLE_PY, ast)
    sec = analyze_security(SAMPLE_PY)
    perf = analyze_performance(SAMPLE_PY, ast, c)
    q = score_quality(ast, static, c, sec, perf)
    assert 0 <= q["overallScore"] <= 100
    assert "maintainability" in q


def test_diff_added_removed():
    d = analyze_diff("a = 1\n", "a = 1\nb = 2\n")
    assert d["addedCount"] >= 1


def test_diff_structural():
    old = "def a():\n  return 1\n"
    new = "def a():\n  return 1\ndef b():\n  return 2\n"
    d = analyze_diff(
        old,
        new,
        old_ast=parse_code(old, filename="a.py"),
        new_ast=parse_code(new, filename="a.py"),
        old_quality={"overallScore": 50},
        new_quality={"overallScore": 60},
    )
    assert "b" in d["structural"]["functionsAdded"]


@pytest.mark.asyncio
async def test_analyze_deterministic_before_ai(tmp_path: Path, monkeypatch):
    svc = _svc(tmp_path)
    called = {}

    async def capture(**kwargs):
        called["vars"] = kwargs.get("variables") or {}
        return {"parsed": {"strengths": ["ok"]}, "stages": ["provider"]}

    monkeypatch.setattr(svc, "_pipeline_json", capture)
    result = await svc.analyze(code=SAMPLE_PY, filename="app.py")
    assert result["success"]
    det = result["data"]["deterministic"]
    assert "static" in det and "complexity" in det and "security" in det
    assert "findings_json" in called["vars"]
    blob = called["vars"]["findings_json"]
    assert "staticFindings" in blob or "cyclomaticComplexity" in blob
    parsed = json.loads(blob)
    assert "codeExcerptSupplemental" not in parsed
    assert "securityFindings" in parsed


@pytest.mark.asyncio
async def test_refactor_and_interview(tmp_path: Path):
    svc = _svc(tmp_path)
    ref = await svc.refactor(code=SAMPLE_PY, filename="app.py")
    assert ref["success"]
    coach = await svc.interview_coach(code=SAMPLE_PY, filename="app.py")
    assert coach["success"]


@pytest.mark.asyncio
async def test_diff_review(tmp_path: Path):
    svc = _svc(tmp_path)
    out = await svc.diff_review(old_code="x=1\n", new_code="x=1\ny=eval('1')\n", filename="a.py")
    assert out["success"]
    assert out["data"]["diff"]["addedCount"] >= 1
    assert "structural" in out["data"]["diff"]


@pytest.mark.asyncio
async def test_det_cache(tmp_path: Path):
    svc = _svc(tmp_path)
    a = svc.run_deterministic(SAMPLE_PY, filename="app.py")
    b = svc.run_deterministic(SAMPLE_PY, filename="app.py")
    assert a is b
