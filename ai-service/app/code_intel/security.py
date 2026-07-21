"""Deterministic security analysis — pattern-based (not a full SAST)."""
from __future__ import annotations

import re
from typing import Any

RULES: list[tuple[str, re.Pattern[str], str, str]] = [
    ("sql_injection", re.compile(r"(execute|query|cursor\.execute)\s*\(\s*[f\"'].*\+|%\s*\(|\.format\(", re.I), "SQL Injection risk (string-built query)", "high"),
    ("sql_injection", re.compile(r"SELECT\s+.+\s+WHERE\s+.+\+|`\$\{", re.I), "SQL Injection risk (concatenated SQL)", "high"),
    ("command_injection", re.compile(r"\b(os\.system|subprocess\.(call|run|Popen)|exec\(|child_process\.exec|Runtime\.getRuntime\(\)\.exec)\b"), "Command injection risk", "high"),
    ("path_traversal", re.compile(r"(open|readFile|createReadStream|FileInputStream)\s*\([^)]*\+|path\.join\([^)]*req\.", re.I), "Path traversal risk", "medium"),
    ("unsafe_eval", re.compile(r"\b(eval\s*\(|new\s+Function\s*\(|exec\s*\()"), "Unsafe eval/exec", "high"),
    ("hardcoded_secret", re.compile(r"""(?i)(api[_-]?key|secret|password|token|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]"""), "Hardcoded secret", "high"),
    ("weak_randomness", re.compile(r"\b(Math\.random|random\.random)\b"), "Weak randomness for security-sensitive use", "medium"),
    ("unsafe_deserialization", re.compile(r"\b(pickle\.loads|yaml\.load\s*\(|unserialize\s*\(|ObjectInputStream)\b"), "Unsafe deserialization", "high"),
    ("missing_validation", re.compile(r"\b(req\.body|request\.json|request\.args)\b"), "Unvalidated request input usage", "medium"),
    ("insecure_auth", re.compile(r"(?i)(password\s*==|md5\s*\(|sha1\s*\(.*password|basic\s+auth|disable.?ssl|verify\s*=\s*False)"), "Insecure authentication / crypto pattern", "high"),
]


def analyze_security(code: str) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    for rule, pat, message, severity in RULES:
        for m in pat.finditer(code or ""):
            findings.append(
                {
                    "rule": rule,
                    "severity": severity,
                    "message": message,
                    "line": (code or "").count("\n", 0, m.start()) + 1,
                    "snippet": (code or "")[m.start() : m.start() + 80],
                }
            )
            if len(findings) >= 40:
                break
        if len(findings) >= 40:
            break

    high = sum(1 for f in findings if f["severity"] == "high")
    return {
        "findingCount": len(findings),
        "highSeverity": high,
        "findings": findings,
        "score": max(0, 100 - high * 15 - (len(findings) - high) * 5),
    }
