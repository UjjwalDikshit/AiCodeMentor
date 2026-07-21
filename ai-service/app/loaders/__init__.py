"""Document loaders — prepare parsers; no product RAG pipelines."""
from __future__ import annotations

from pathlib import Path
from typing import Any


def load_txt(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8", errors="ignore")


def load_markdown(path: str | Path) -> str:
    return load_txt(path)


def load_json(path: str | Path) -> Any:
    import json

    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_csv(path: str | Path) -> list[dict[str, str]]:
    import csv

    with Path(path).open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def load_pdf(path: str | Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is required for PDF loading") from exc
    reader = PdfReader(str(path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def load_docx(path: str | Path) -> str:
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError("python-docx is required for DOCX loading") from exc
    doc = Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs)


def load_directory(path: str | Path, patterns: tuple[str, ...] = ("*.txt", "*.md")) -> list[dict[str, str]]:
    root = Path(path)
    docs: list[dict[str, str]] = []
    for pattern in patterns:
        for file in root.rglob(pattern):
            docs.append({"path": str(file), "content": load_txt(file)})
    return docs


def github_loader_placeholder(repo_url: str) -> dict[str, Any]:
    """Placeholder — real GitHub ingestion arrives in a later module."""
    return {
        "success": True,
        "message": "Coming Soon",
        "meta": {"loader": "github", "repo_url": repo_url},
    }


LOADERS = {
    "txt": load_txt,
    "md": load_markdown,
    "markdown": load_markdown,
    "json": load_json,
    "csv": load_csv,
    "pdf": load_pdf,
    "docx": load_docx,
    "directory": load_directory,
    "github": github_loader_placeholder,
}
