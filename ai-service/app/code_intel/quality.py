"""Deterministic code quality scoring from analysis outputs."""
from __future__ import annotations

from typing import Any


def score_quality(
    ast: dict[str, Any],
    static: dict[str, Any],
    complexity: dict[str, Any],
    security: dict[str, Any],
    performance: dict[str, Any],
) -> dict[str, Any]:
    maintainability = float(complexity.get("estimatedMaintainability") or 50)
    comments = (ast.get("comments") or {})
    comment_n = comments.get("lineComments", 0) + comments.get("docstrings", 0)
    lines = max(1, ast.get("lineCount") or 1)
    doc_ratio = min(1.0, comment_n / max(5, lines / 10))

    readability = max(0, min(100, 90 - (complexity.get("cognitiveComplexity") or 0) * 1.2 - (static.get("findingCount") or 0)))
    naming = 75.0
    # penalize single-letter vars beyond loops
    short_vars = [v for v in (ast.get("variables") or []) if len(v.get("name") or "") <= 1]
    naming = max(40, naming - len(short_vars) * 2)

    modularity = max(30, min(100, 100 - max(0, (complexity.get("maxFunctionLength") or 0) - 40) * 0.8))
    documentation = round(40 + doc_ratio * 60, 1)
    testability = max(30, min(100, 90 - len(ast.get("recursion") or []) * 5 - (complexity.get("nestedLoopDepth") or 0) * 8))
    reusability = max(30, min(100, 70 + len(ast.get("functions") or []) * 2 - len(ast.get("classes") or []) * 1))

    security_pen = min(40, (security.get("highSeverity") or 0) * 10)
    perf_pen = min(20, (performance.get("findingCount") or 0) * 3)

    overall = round(
        (
            maintainability * 0.2
            + readability * 0.15
            + naming * 0.1
            + modularity * 0.15
            + documentation * 0.1
            + testability * 0.1
            + reusability * 0.1
            + (100 - security_pen) * 0.05
            + (100 - perf_pen) * 0.05
        ),
        1,
    )

    return {
        "overallScore": overall,
        "maintainability": round(maintainability, 1),
        "readability": round(readability, 1),
        "naming": round(naming, 1),
        "modularity": round(modularity, 1),
        "documentation": documentation,
        "testability": round(testability, 1),
        "reusability": round(reusability, 1),
    }
