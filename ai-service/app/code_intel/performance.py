"""Deterministic performance analysis."""
from __future__ import annotations

import re
from typing import Any


def analyze_performance(code: str, ast: dict[str, Any], complexity: dict[str, Any]) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []

    if (complexity.get("nestedLoopDepth") or 0) >= 2:
        findings.append(
            {
                "rule": "nested_loops",
                "severity": "warning",
                "message": f"Nested loops depth {complexity['nestedLoopDepth']} — likely O(n^{complexity['nestedLoopDepth']})",
                "line": None,
            }
        )

    expensive = [
        (r"\btime\.sleep\b", "Blocking sleep"),
        (r"\bJSON\.parse\s*\(.*JSON\.stringify", "Redundant serialize/parse"),
        (r"\b\.sort\s*\([^\)]*\)\s*\.sort\s*\(", "Repeated sorts"),
        (r"SELECT\s+\*.*IN\s*\(.*SELECT", "Possible N+1 / nested SQL"),
    ]
    for pat, msg in expensive:
        m = re.search(pat, code or "", re.I)
        if m:
            findings.append(
                {
                    "rule": "expensive_operation",
                    "severity": "warning",
                    "message": msg,
                    "line": (code or "").count("\n", 0, m.start()) + 1,
                }
            )

    # Repeated allocations in loops
    if re.search(r"for\s*\([^)]+\)\s*\{[^}]*\bnew\s+", code or "", re.S) or re.search(
        r"for\s+.+:\s*\n(?:\s+.+\n)*?\s+.*=\s*\[\]", code or ""
    ):
        findings.append(
            {
                "rule": "repeated_allocations",
                "severity": "info",
                "message": "Allocations inside loops detected",
                "line": None,
            }
        )

    # String concatenation in loops
    if re.search(r"for\s*.+\n(?:.*\n){0,8}.*\+\s*=\s*['\"]", code or "") or re.search(
        r"for\s*\([^)]+\)\s*\{[^}]*\+=\s*['\"]", code or "", re.S
    ):
        findings.append(
            {
                "rule": "string_concatenation",
                "severity": "warning",
                "message": "String concatenation inside loop (prefer builder/join)",
                "line": None,
            }
        )

    # N+1 style: await/query inside loop
    if re.search(r"for\s*.+\n(?:.*\n){0,12}.*\b(await\s+.*\(|\.query\(|fetch\()", code or ""):
        findings.append(
            {
                "rule": "n_plus_one",
                "severity": "warning",
                "message": "Possible N+1 pattern (async/query inside loop)",
                "line": None,
            }
        )

    # Large copies
    if re.search(r"\b(structuredClone|JSON\.parse\(JSON\.stringify|\.slice\(\)|\.copy\(\)|memcpy)\b", code or ""):
        findings.append(
            {
                "rule": "large_copies",
                "severity": "info",
                "message": "Deep/large copy pattern detected",
                "line": None,
            }
        )

    # Memory inefficiencies
    if re.search(r"\b(readFileSync|loadEntire|buffer\.concat)\b", code or ""):
        findings.append(
            {
                "rule": "memory_inefficiency",
                "severity": "info",
                "message": "Potential memory-heavy API usage",
                "line": None,
            }
        )

    # Repeated computations (same expression assigned/called multiple times)
    repeated = re.findall(r"(\w+\([^)]{0,40}\))", code or "")
    from collections import Counter

    for expr, count in Counter(repeated).items():
        if count >= 4 and len(expr) > 5:
            findings.append(
                {
                    "rule": "repeated_computations",
                    "severity": "info",
                    "message": f"Expression appears {count}x: {expr[:60]}",
                    "line": None,
                }
            )
            break

    return {
        "findingCount": len(findings),
        "findings": findings,
        "nestedLoopDepth": complexity.get("nestedLoopDepth"),
        "bigOEstimated": complexity.get("bigOEstimated"),
    }
