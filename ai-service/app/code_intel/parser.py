"""
Code structure parser — Tree-sitter when available, heuristic fallback otherwise.
Extracts functions, classes, imports, loops, recursion signals, comments, call graph edges.
"""
from __future__ import annotations

import re
from typing import Any

from app.code_intel.language import detect_language


def _try_tree_sitter(code: str, language: str) -> dict[str, Any] | None:
    """Optional Tree-sitter path — extract structural symbols when bindings exist."""
    try:
        import tree_sitter_languages  # type: ignore

        lang_key = "cpp" if language == "cpp" else language
        if language == "csharp":
            lang_key = "c_sharp"
        parser = tree_sitter_languages.get_parser(lang_key)
        tree = parser.parse(bytes(code, "utf8"))
        root = tree.root_node
        symbols = _walk_tree_sitter(root, code.encode("utf8"))
        return {
            "backend": "tree-sitter",
            "rootType": root.type,
            "nodeCount": _count_nodes(root),
            "rawAvailable": True,
            "symbols": symbols,
        }
    except Exception:  # noqa: BLE001
        return None


def _walk_tree_sitter(node: Any, source: bytes) -> dict[str, list[dict[str, Any]]]:
    """Pull function/class/method-like nodes from a Tree-sitter CST."""
    interesting = {
        "function_definition",
        "function_declaration",
        "method_definition",
        "method_declaration",
        "class_definition",
        "class_declaration",
        "interface_declaration",
        "struct_specifier",
        "function_item",  # rust
        "method_declaration",
    }
    out: dict[str, list[dict[str, Any]]] = {"functions": [], "classes": [], "methods": []}
    stack = [node]
    while stack:
        n = stack.pop()
        stack.extend(reversed(list(getattr(n, "children", []) or [])))
        if n.type not in interesting:
            continue
        name = None
        for child in getattr(n, "children", []) or []:
            if child.type in {"identifier", "type_identifier", "property_identifier", "name"}:
                try:
                    name = source[child.start_byte : child.end_byte].decode("utf8", errors="ignore")
                except Exception:  # noqa: BLE001
                    name = None
                if name:
                    break
        entry = {
            "name": name or n.type,
            "startLine": n.start_point[0] + 1,
            "endLine": n.end_point[0] + 1,
            "kind": n.type,
        }
        if "class" in n.type or "interface" in n.type or "struct" in n.type:
            out["classes"].append({**entry, "kind": "interface" if "interface" in n.type else "class"})
        elif "method" in n.type:
            out["methods"].append({**entry, "isMethod": True, "length": entry["endLine"] - entry["startLine"] + 1, "params": [], "snippet": ""})
        else:
            out["functions"].append({**entry, "isMethod": False, "length": entry["endLine"] - entry["startLine"] + 1, "params": [], "snippet": ""})
    return out


def _count_nodes(node: Any) -> int:
    n = 1
    for child in getattr(node, "children", []) or []:
        n += _count_nodes(child)
    return n


FUNC_PATTERNS: dict[str, re.Pattern[str]] = {
    "python": re.compile(r"^\s*(async\s+)?def\s+(\w+)\s*\(([^)]*)\)\s*:", re.M),
    "javascript": re.compile(
        r"(?:(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)|const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>)",
        re.M,
    ),
    "typescript": re.compile(
        r"(?:(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)|const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>|"
        r"(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{)",
        re.M,
    ),
    "java": re.compile(
        r"(?:public|private|protected|static|\s)+\s*[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)\s*\{",
        re.M,
    ),
    "go": re.compile(r"func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(([^)]*)\)", re.M),
    "rust": re.compile(r"fn\s+(\w+)\s*\(([^)]*)\)", re.M),
    "c": re.compile(r"^\s*[\w\s\*]+?\s+(\w+)\s*\(([^;{]*)\)\s*\{", re.M),
    "cpp": re.compile(r"^\s*[\w\s:\*<>,]+?\s+(\w+)\s*\(([^;{]*)\)\s*\{", re.M),
    "csharp": re.compile(
        r"(?:public|private|protected|internal|static|\s)+\s*[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)\s*\{",
        re.M,
    ),
}

CLASS_PATTERNS: dict[str, re.Pattern[str]] = {
    "python": re.compile(r"^\s*class\s+(\w+)\s*(?:\([^)]*\))?\s*:", re.M),
    "javascript": re.compile(r"\bclass\s+(\w+)", re.M),
    "typescript": re.compile(r"\b(?:class|interface)\s+(\w+)", re.M),
    "java": re.compile(r"\b(?:class|interface)\s+(\w+)", re.M),
    "csharp": re.compile(r"\b(?:class|interface)\s+(\w+)", re.M),
    "cpp": re.compile(r"\b(?:class|struct)\s+(\w+)", re.M),
    "c": re.compile(r"\bstruct\s+(\w+)", re.M),
    "rust": re.compile(r"\b(?:struct|trait|impl)\s+(\w+)", re.M),
    "go": re.compile(r"\btype\s+(\w+)\s+struct\b", re.M),
}

IMPORT_PATTERNS: dict[str, re.Pattern[str]] = {
    "python": re.compile(r"^\s*(?:from\s+([\w.]+)\s+import\s+.+|import\s+([\w.]+))", re.M),
    "javascript": re.compile(r"(?:import\s+.+?\s+from\s+['\"]([^'\"]+)['\"]|require\(['\"]([^'\"]+)['\"]\))", re.M),
    "typescript": re.compile(r"import\s+.+?\s+from\s+['\"]([^'\"]+)['\"]", re.M),
    "java": re.compile(r"^\s*import\s+([\w.]+);", re.M),
    "go": re.compile(r'^\s*"([^"]+)"', re.M),
    "rust": re.compile(r"^\s*use\s+([\w:]+)", re.M),
    "c": re.compile(r'#include\s*[<"]([^>"]+)[>"]', re.M),
    "cpp": re.compile(r'#include\s*[<"]([^>"]+)[>"]', re.M),
    "csharp": re.compile(r"^\s*using\s+([\w.]+);", re.M),
    "sql": re.compile(r"\bFROM\s+(\w+)", re.I),
}


def parse_code(code: str, language: str | None = None, filename: str | None = None) -> dict[str, Any]:
    detected = detect_language(code, filename)
    lang = language or detected["language"]
    if lang == "unknown":
        lang = "javascript"  # soft fallback for regex patterns

    ts_meta = _try_tree_sitter(code, lang)

    # Prefer Tree-sitter symbols when available; else heuristic extraction
    ts_symbols = (ts_meta or {}).get("symbols") or {}
    functions = ts_symbols.get("functions") or _extract_functions(code, lang)
    classes = ts_symbols.get("classes") or _extract_classes(code, lang)
    ts_methods = ts_symbols.get("methods") or []
    if ts_methods:
        for m in ts_methods:
            functions.append(m)
    imports = _extract_imports(code, lang)
    variables = _extract_variables(code, lang)
    loops = _extract_loops(code)
    conditionals = _extract_conditionals(code)
    comments = _extract_comments(code, lang)
    recursion = _detect_recursion(functions, code)
    call_graph = _build_call_graph(functions, code)

    return {
        "language": detected["language"] if not language else lang,
        "languageConfidence": detected["confidence"],
        "languageScores": detected.get("scores") or {},
        "parserBackend": (ts_meta or {}).get("backend", "heuristic"),
        "treeSitter": {k: v for k, v in (ts_meta or {}).items() if k != "symbols"} if ts_meta else None,
        "functions": functions,
        "classes": classes,
        "interfaces": [c for c in classes if c.get("kind") == "interface"],
        "methods": [f for f in functions if f.get("isMethod")] or ts_methods,
        "imports": imports,
        "variables": variables,
        "loops": loops,
        "conditionals": conditionals,
        "recursion": recursion,
        "comments": comments,
        "callGraph": call_graph,
        "lineCount": len((code or "").splitlines()),
        "charCount": len(code or ""),
    }


def _line_of(code: str, index: int) -> int:
    return code.count("\n", 0, index) + 1


def _extract_functions(code: str, lang: str) -> list[dict[str, Any]]:
    pat = FUNC_PATTERNS.get(lang) or FUNC_PATTERNS.get("javascript")
    assert pat is not None
    out: list[dict[str, Any]] = []
    for m in pat.finditer(code):
        groups = [g for g in m.groups() if g is not None]
        name = groups[0] if groups else "anonymous"
        params = groups[1] if len(groups) > 1 else ""
        # Handle JS arrow: groups may be name, params from alternate branch
        if lang in {"javascript", "typescript"} and len(groups) >= 3 and groups[2]:
            name = groups[2]
            params = groups[3] if len(groups) > 3 else ""
        start = _line_of(code, m.start())
        body_start = m.end()
        end = _estimate_block_end(code, body_start, lang)
        body = code[m.start() : end]
        out.append(
            {
                "name": name,
                "params": [p.strip() for p in params.split(",") if p.strip()],
                "startLine": start,
                "endLine": _line_of(code, max(end - 1, m.start())),
                "length": body.count("\n") + 1,
                "isMethod": False,
                "snippet": body[:400],
            }
        )
    return out[:80]


def _estimate_block_end(code: str, start: int, lang: str) -> int:
    if lang == "python":
        # Indentation-based: until dedent to column 0-ish after def
        lines = code[start:].splitlines(keepends=True)
        if not lines:
            return start
        end = start
        for i, ln in enumerate(lines):
            end += len(ln)
            if i > 0 and ln.strip() and not ln.startswith((" ", "\t")) and not ln.startswith("#"):
                return end - len(ln)
        return end

    depth = 0
    seen = False
    i = start
    while i < len(code):
        ch = code[i]
        if ch == "{":
            depth += 1
            seen = True
        elif ch == "}":
            depth -= 1
            if seen and depth <= 0:
                return i + 1
        i += 1
    return min(len(code), start + 2000)


def _extract_classes(code: str, lang: str) -> list[dict[str, Any]]:
    pat = CLASS_PATTERNS.get(lang)
    if not pat:
        return []
    out = []
    for m in pat.finditer(code):
        name = m.group(1)
        kind = "interface" if "interface" in m.group(0) else "class"
        if "trait" in m.group(0) or "struct" in m.group(0):
            kind = "struct" if "struct" in m.group(0) else "trait"
        out.append({"name": name, "kind": kind, "startLine": _line_of(code, m.start())})
    return out[:40]


def _extract_imports(code: str, lang: str) -> list[str]:
    pat = IMPORT_PATTERNS.get(lang)
    if not pat:
        return []
    imports: list[str] = []
    for m in pat.finditer(code):
        val = next((g for g in m.groups() if g), None)
        if val:
            imports.append(val)
    return list(dict.fromkeys(imports))[:60]


def _extract_variables(code: str, lang: str) -> list[dict[str, Any]]:
    patterns = [
        re.compile(r"\b(?:const|let|var)\s+(\w+)\s*=", re.M),
        re.compile(r"\b(\w+)\s*=\s*[^=]", re.M),
    ]
    if lang == "python":
        patterns = [re.compile(r"^\s*(\w+)\s*=\s*", re.M)]
    names: list[dict[str, Any]] = []
    seen: set[str] = set()
    for pat in patterns:
        for m in pat.finditer(code):
            name = m.group(1)
            if name in seen or name in {"if", "for", "while", "return", "import", "from", "def", "class"}:
                continue
            seen.add(name)
            names.append({"name": name, "line": _line_of(code, m.start())})
            if len(names) >= 80:
                return names
    return names


def _extract_loops(code: str) -> list[dict[str, Any]]:
    out = []
    for kind, pat in [
        ("for", re.compile(r"\bfor\s*\(", re.M)),
        ("for", re.compile(r"^\s*for\s+\w+\s+in\s+", re.M)),
        ("while", re.compile(r"\bwhile\s*\(", re.M)),
        ("while", re.compile(r"^\s*while\s+", re.M)),
    ]:
        for m in pat.finditer(code):
            out.append({"kind": kind, "line": _line_of(code, m.start())})
    return out[:50]


def _extract_conditionals(code: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    patterns = [
        ("if", re.compile(r"\bif\s*\(", re.M)),
        ("if", re.compile(r"^\s*if\s+", re.M)),
        ("elif", re.compile(r"^\s*elif\s+", re.M)),
        ("else_if", re.compile(r"\belse\s+if\b", re.M)),
        ("switch", re.compile(r"\bswitch\s*\(", re.M)),
        ("ternary", re.compile(r"\?[^=].*:")),
        ("match", re.compile(r"^\s*match\s+", re.M)),
    ]
    for kind, pat in patterns:
        for m in pat.finditer(code or ""):
            out.append({"kind": kind, "line": _line_of(code, m.start())})
            if len(out) >= 80:
                return out
    return out


def _extract_comments(code: str, lang: str) -> dict[str, Any]:
    line_comments = len(re.findall(r"^\s*(//|#)", code, re.M))
    block = len(re.findall(r"/\*[\s\S]*?\*/", code))
    docstrings = len(re.findall(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'', code)) if lang == "python" else 0
    return {"lineComments": line_comments, "blockComments": block, "docstrings": docstrings}


def _detect_recursion(functions: list[dict[str, Any]], code: str) -> list[dict[str, Any]]:
    recursive = []
    for fn in functions:
        name = fn["name"]
        body = fn.get("snippet") or ""
        # Call to self inside body
        if re.search(rf"\b{re.escape(name)}\s*\(", body[len(name) + 5 :] if len(body) > 10 else body):
            recursive.append({"function": name, "startLine": fn["startLine"]})
    return recursive


def _build_call_graph(functions: list[dict[str, Any]], code: str) -> list[dict[str, str]]:
    names = [f["name"] for f in functions]
    edges: list[dict[str, str]] = []
    for fn in functions:
        body = fn.get("snippet") or ""
        for other in names:
            if other == fn["name"]:
                continue
            if re.search(rf"\b{re.escape(other)}\s*\(", body):
                edges.append({"from": fn["name"], "to": other})
    return edges[:100]
