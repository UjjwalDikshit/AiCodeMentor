"""Deterministic diff analysis (old vs new) — text + AST/metric deltas before AI."""
from __future__ import annotations

import difflib
from typing import Any


def analyze_diff(
    old_code: str,
    new_code: str,
    *,
    old_ast: dict[str, Any] | None = None,
    new_ast: dict[str, Any] | None = None,
    old_quality: dict[str, Any] | None = None,
    new_quality: dict[str, Any] | None = None,
) -> dict[str, Any]:
    old_lines = (old_code or "").splitlines()
    new_lines = (new_code or "").splitlines()
    diff = list(
        difflib.unified_diff(old_lines, new_lines, fromfile="old", tofile="new", lineterm="")
    )
    added = [ln[1:] for ln in diff if ln.startswith("+") and not ln.startswith("+++")]
    removed = [ln[1:] for ln in diff if ln.startswith("-") and not ln.startswith("---")]

    regressions: list[str] = []
    improvements: list[str] = []
    breaking: list[str] = []

    dangerous_add = ("eval(", "os.system", "password=", "SELECT *", "innerHTML")
    for ln in added:
        if any(d in ln for d in dangerous_add):
            regressions.append(f"Risky addition: {ln.strip()[:80]}")
        if "try:" in ln or "validate" in ln.lower() or "timeout" in ln.lower():
            improvements.append(f"Possible hardening: {ln.strip()[:80]}")

    for ln in removed:
        if "def " in ln or "function " in ln or "export " in ln:
            breaking.append(f"Removed symbol line: {ln.strip()[:80]}")

    # Structural comparison from parsed ASTs
    old_fns = {f.get("name") for f in ((old_ast or {}).get("functions") or []) if f.get("name")}
    new_fns = {f.get("name") for f in ((new_ast or {}).get("functions") or []) if f.get("name")}
    structural = {
        "functionsAdded": sorted(new_fns - old_fns),
        "functionsRemoved": sorted(old_fns - new_fns),
        "lineCountDelta": (new_ast or {}).get("lineCount", 0) - (old_ast or {}).get("lineCount", 0),
        "qualityDelta": None,
    }
    if old_quality and new_quality:
        structural["qualityDelta"] = round(
            float(new_quality.get("overallScore") or 0) - float(old_quality.get("overallScore") or 0),
            1,
        )
        if structural["qualityDelta"] < -5:
            regressions.append(f"Quality score dropped by {abs(structural['qualityDelta'])}")
        elif structural["qualityDelta"] > 5:
            improvements.append(f"Quality score improved by {structural['qualityDelta']}")

    for name in structural["functionsRemoved"]:
        breaking.append(f"Function removed: {name}")

    return {
        "addedCount": len(added),
        "removedCount": len(removed),
        "added": added[:80],
        "removed": removed[:80],
        "regressions": regressions[:20],
        "improvements": improvements[:20],
        "breakingChanges": breaking[:20],
        "structural": structural,
        "unifiedDiff": "\n".join(diff[:400]),
    }
