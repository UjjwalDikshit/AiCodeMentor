"""Deterministic complexity analysis."""
from __future__ import annotations

import re
from typing import Any


DECISION_PATTERNS = [
    re.compile(r"\bif\b"),
    re.compile(r"\belif\b"),
    re.compile(r"\belse\s+if\b"),
    re.compile(r"\bfor\b"),
    re.compile(r"\bwhile\b"),
    re.compile(r"\bcase\b"),
    re.compile(r"\bcatch\b"),
    re.compile(r"\b&&\b"),
    re.compile(r"\b\|\|\b"),
    re.compile(r"\?\s*[^:]+\s*:"),
]


def analyze_complexity(code: str, ast: dict[str, Any]) -> dict[str, Any]:
    decisions = sum(len(p.findall(code)) for p in DECISION_PATTERNS)
    cyclomatic = max(1, decisions + 1)

    # Cognitive: weight nested decisions lightly using brace depth
    cognitive = 0
    depth = 0
    for ch in code:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)
    # Approximate cognitive as decisions * (1 + avg nesting factor)
    avg_nest = min(4, depth / max(1, code.count("{") or 1))
    cognitive = int(decisions * (1 + avg_nest * 0.5)) + len(ast.get("recursion") or [])

    functions = ast.get("functions") or []
    lengths = [f.get("length") or 0 for f in functions] or [ast.get("lineCount") or 0]
    max_fn_len = max(lengths) if lengths else 0
    avg_fn_len = round(sum(lengths) / len(lengths), 1) if lengths else 0

    # Maintainability index-ish (0-100)
    maintainability = max(
        0,
        min(
            100,
            100
            - (cyclomatic * 1.5)
            - (max_fn_len * 0.15)
            - (len(ast.get("loops") or []) * 0.5)
            + (min(10, (ast.get("comments") or {}).get("lineComments", 0)) * 0.5),
        ),
    )

    # Big-O estimate from nested loops
    loop_nest = _nested_loop_depth(code)
    big_o = "O(1)"
    if loop_nest >= 3:
        big_o = "O(n^3) or worse (estimated)"
    elif loop_nest == 2:
        big_o = "O(n^2) (estimated)"
    elif loop_nest == 1:
        big_o = "O(n) (estimated)"
    if ast.get("recursion"):
        big_o = big_o + " + recursive"

    memory = "O(1) (estimated)"
    if re.search(r"\b(append|push|realloc|new\s+|malloc|list\(|dict\(|\[\]|\{\})", code):
        memory = "O(n) (estimated, allocations present)"

    recursion_depth = "unknown"
    if ast.get("recursion"):
        recursion_depth = "self-recursive functions present (runtime depth unknown)"

    per_function = []
    for fn in functions[:30]:
        body = fn.get("snippet") or ""
        d = sum(len(p.findall(body)) for p in DECISION_PATTERNS)
        per_function.append(
            {
                "name": fn["name"],
                "cyclomatic": max(1, d + 1),
                "length": fn.get("length"),
                "startLine": fn.get("startLine"),
            }
        )

    return {
        "cyclomaticComplexity": cyclomatic,
        "cognitiveComplexity": cognitive,
        "estimatedMaintainability": round(maintainability, 1),
        "bigOEstimated": big_o,
        "memoryComplexity": memory,
        "recursionDepth": recursion_depth,
        "maxFunctionLength": max_fn_len,
        "avgFunctionLength": avg_fn_len,
        "nestedLoopDepth": loop_nest,
        "perFunction": per_function,
    }


def _nested_loop_depth(code: str) -> int:
    # crude: count consecutive for/while openings before closes in a window
    tokens = re.findall(r"\b(for|while)\b|[\{\}]", code)
    depth = 0
    max_d = 0
    for t in tokens:
        if t in {"for", "while"}:
            depth += 1
            max_d = max(max_d, depth)
        elif t == "}":
            depth = max(0, depth - 1)
    # Python
    if max_d == 0:
        indent_loops = []
        for ln in code.splitlines():
            if re.match(r"^\s*(for|while)\b", ln):
                indent_loops.append((len(ln) - len(ln.lstrip(" "))) // 4)
        if indent_loops:
            # count how many increasing indents
            max_d = 1
            for i in range(1, len(indent_loops)):
                if indent_loops[i] > indent_loops[i - 1]:
                    max_d += 1
    return max_d
