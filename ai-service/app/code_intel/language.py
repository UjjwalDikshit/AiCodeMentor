"""Language detection — extension + content heuristics with confidence."""
from __future__ import annotations

import re
from typing import Any

EXT_MAP: dict[str, str] = {
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".java": "java",
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".rs": "rust",
    ".cs": "csharp",
    ".sql": "sql",
}

# Order matters for overlapping patterns
CONTENT_HINTS: list[tuple[str, list[re.Pattern[str]], float]] = [
    (
        "python",
        [
            re.compile(r"^\s*def\s+\w+\s*\(", re.M),
            re.compile(r"^\s*(async\s+)?def\s+", re.M),
            re.compile(r"^\s*from\s+\w+\s+import\s+", re.M),
            re.compile(r"^\s*import\s+\w+", re.M),
            re.compile(r":\s*$", re.M),
        ],
        0.25,
    ),
    (
        "typescript",
        [
            re.compile(r"\binterface\s+\w+", re.M),
            re.compile(r":\s*(string|number|boolean|any)\b"),
            re.compile(r"\btype\s+\w+\s*="),
            re.compile(r"\bas\s+const\b"),
        ],
        0.3,
    ),
    (
        "javascript",
        [
            re.compile(r"\bfunction\s+\w+\s*\(", re.M),
            re.compile(r"\bconst\s+\w+\s*="),
            re.compile(r"=>"),
            re.compile(r"\brequire\s*\("),
            re.compile(r"\bmodule\.exports\b"),
        ],
        0.2,
    ),
    (
        "java",
        [
            re.compile(r"\bpublic\s+class\s+\w+"),
            re.compile(r"\bSystem\.out\.println"),
            re.compile(r"\bpublic\s+static\s+void\s+main"),
        ],
        0.35,
    ),
    (
        "go",
        [
            re.compile(r"^\s*package\s+\w+", re.M),
            re.compile(r"\bfunc\s+(\(\w+\s+\*?\w+\)\s+)?\w+\s*\("),
            re.compile(r"\bfmt\."),
        ],
        0.35,
    ),
    (
        "rust",
        [
            re.compile(r"\bfn\s+\w+\s*\("),
            re.compile(r"\blet\s+mut\s+"),
            re.compile(r"\bimpl\s+\w+"),
            re.compile(r"\bprintln!\s*\("),
        ],
        0.35,
    ),
    (
        "csharp",
        [
            re.compile(r"\bnamespace\s+\w+"),
            re.compile(r"\busing\s+System"),
            re.compile(r"\bConsole\.Write"),
        ],
        0.35,
    ),
    (
        "cpp",
        [
            re.compile(r"#include\s*<\w+>"),
            re.compile(r"\bstd::"),
            re.compile(r"\btemplate\s*<"),
            re.compile(r"\bcout\s*<<"),
        ],
        0.3,
    ),
    (
        "c",
        [
            re.compile(r"#include\s*<stdio\.h>"),
            re.compile(r"\bprintf\s*\("),
            re.compile(r"\bint\s+main\s*\("),
        ],
        0.3,
    ),
    (
        "sql",
        [
            re.compile(r"\bSELECT\b.+\bFROM\b", re.I | re.S),
            re.compile(r"\bINSERT\s+INTO\b", re.I),
            re.compile(r"\bCREATE\s+TABLE\b", re.I),
        ],
        0.4,
    ),
]


def detect_language(code: str, filename: str | None = None) -> dict[str, Any]:
    scores: dict[str, float] = {}

    if filename:
        from pathlib import Path

        ext = Path(filename).suffix.lower()
        if ext in EXT_MAP:
            lang = EXT_MAP[ext]
            scores[lang] = scores.get(lang, 0) + 0.55

    sample = (code or "")[:20000]
    for lang, patterns, weight in CONTENT_HINTS:
        hits = sum(1 for p in patterns if p.search(sample))
        if hits:
            scores[lang] = scores.get(lang, 0) + min(1.0, hits * weight)

    if not scores:
        return {"language": "unknown", "confidence": 0.2, "scores": {}}

    language = max(scores, key=scores.get)
    raw = scores[language]
    confidence = round(min(0.99, max(0.35, raw)), 2)
    return {"language": language, "confidence": confidence, "scores": {k: round(v, 2) for k, v in scores.items()}}
