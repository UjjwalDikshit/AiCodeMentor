"""Deterministic static analysis — runs BEFORE AI."""
from __future__ import annotations

import re
from collections import Counter
from typing import Any


def analyze_static(code: str, ast: dict[str, Any]) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    lines = (code or "").splitlines()

    # Unused variables (heuristic: declared then never referenced again)
    for var in ast.get("variables") or []:
        name = var["name"]
        # skip short / common
        if len(name) <= 1 or name in {"i", "j", "k", "n", "x", "y", "id", "e", "err"}:
            continue
        occurrences = len(re.findall(rf"\b{re.escape(name)}\b", code))
        if occurrences <= 1:
            findings.append(
                {
                    "rule": "unused_variable",
                    "severity": "warning",
                    "message": f"Variable '{name}' appears unused",
                    "line": var.get("line"),
                }
            )

    # Long functions
    for fn in ast.get("functions") or []:
        length = fn.get("length") or 0
        if length >= 50:
            findings.append(
                {
                    "rule": "long_function",
                    "severity": "warning",
                    "message": f"Function '{fn['name']}' is long ({length} lines)",
                    "line": fn.get("startLine"),
                }
            )

    # Deep nesting
    max_depth, deep_line = _max_brace_depth(code)
    if max_depth >= 5:
        findings.append(
            {
                "rule": "deep_nesting",
                "severity": "warning",
                "message": f"Deep nesting detected (depth {max_depth})",
                "line": deep_line,
            }
        )

    # Magic numbers
    for m in re.finditer(r"(?<![\w.])(?<!0x)([2-9]\d{2,}|\d{4,})(?![\w.])", code):
        # skip years-ish and common ports lightly
        val = m.group(1)
        if val in {"100", "200", "404", "500", "1000", "1024"}:
            continue
        findings.append(
            {
                "rule": "magic_number",
                "severity": "info",
                "message": f"Magic number {val}",
                "line": code.count("\n", 0, m.start()) + 1,
            }
        )
        if len([f for f in findings if f["rule"] == "magic_number"]) >= 15:
            break

    # Large classes (many methods nearby — approximate by class count + function count)
    if len(ast.get("classes") or []) >= 1 and len(ast.get("functions") or []) >= 15:
        findings.append(
            {
                "rule": "large_class",
                "severity": "warning",
                "message": "Possible large class / many methods in file",
                "line": (ast["classes"][0] or {}).get("startLine"),
            }
        )

    # Duplicate logic — identical non-trivial lines
    stripped = [ln.strip() for ln in lines if len(ln.strip()) > 25 and not ln.strip().startswith(("#", "//"))]
    counts = Counter(stripped)
    for text, count in counts.items():
        if count >= 3:
            findings.append(
                {
                    "rule": "duplicate_logic",
                    "severity": "info",
                    "message": f"Repeated line ({count}x): {text[:80]}",
                    "line": None,
                }
            )
            if len([f for f in findings if f["rule"] == "duplicate_logic"]) >= 5:
                break

    # Repeated conditions
    conds = re.findall(r"if\s*\(([^)]{5,80})\)", code)
    for cond, count in Counter(conds).items():
        if count >= 3:
            findings.append(
                {
                    "rule": "repeated_condition",
                    "severity": "info",
                    "message": f"Condition repeated {count}x: {cond.strip()[:60]}",
                    "line": None,
                }
            )

    # Exception handling issues
    if re.search(r"except\s*:", code) or re.search(r"catch\s*\(\s*\w*\s*\)\s*\{\s*\}", code, re.S):
        findings.append(
            {
                "rule": "exception_handling",
                "severity": "warning",
                "message": "Bare/empty exception handler detected",
                "line": None,
            }
        )
    if "except Exception" in code and "pass" in code:
        findings.append(
            {
                "rule": "exception_handling",
                "severity": "warning",
                "message": "Broad Exception catch with pass",
                "line": None,
            }
        )

    # Input validation hints
    if re.search(r"\b(request\.|req\.|input\(|scanf|gets\()", code) and not re.search(
        r"\b(validate|sanitize|schema|zod|joi|isinstance)\b", code, re.I
    ):
        findings.append(
            {
                "rule": "input_validation",
                "severity": "warning",
                "message": "User/input handling without obvious validation",
                "line": None,
            }
        )

    # Dead code after return
    for i, ln in enumerate(lines[:-1]):
        if re.match(r"^\s*return\b", ln) and lines[i + 1].strip() and not lines[i + 1].strip().startswith(
            ("}", "#", "//", "def ", "class ", "function ", "case ", "default")
        ):
            # only if same indent roughly
            if len(lines[i + 1]) - len(lines[i + 1].lstrip()) >= len(ln) - len(ln.lstrip()):
                findings.append(
                    {
                        "rule": "dead_code",
                        "severity": "info",
                        "message": "Possible code after return",
                        "line": i + 2,
                    }
                )
                break

    return {
        "findingCount": len(findings),
        "findings": findings[:80],
        "summary": Counter(f["rule"] for f in findings),
    }


def _max_brace_depth(code: str) -> tuple[int, int | None]:
    depth = 0
    max_d = 0
    deep_line = 1
    line = 1
    for ch in code:
        if ch == "\n":
            line += 1
        elif ch == "{":
            depth += 1
            if depth > max_d:
                max_d = depth
                deep_line = line
        elif ch == "}":
            depth = max(0, depth - 1)
    # Python indent depth approx
    if max_d == 0:
        for i, ln in enumerate(code.splitlines(), 1):
            if not ln.strip():
                continue
            indent = len(ln) - len(ln.lstrip(" "))
            d = indent // 4
            if d > max_d:
                max_d = d
                deep_line = i
    return max_d, deep_line
