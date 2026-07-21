"""Resume knowledge-base chunking strategy — section/bullet semantic units first."""
from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any

from app.chains.langchain_infra import split_text

CHUNKABLE_SECTIONS = (
    "summary",
    "skills",
    "experience",
    "projects",
    "education",
    "achievements",
    "certifications",
    "publications",
    "languages",
    "miscellaneous",
)


def _bullets(text: str) -> list[str]:
    parts = re.split(r"(?:\n\s*[-*•]|\n(?=[A-Z]))", text)
    out = [p.strip(" -\n\t•*") for p in parts if p and p.strip()]
    return out or ([text.strip()] if text.strip() else [])


def chunk_resume(
    structured: dict[str, Any],
    *,
    resume_id: str,
    version: int,
    chunk_size: int = 600,
    chunk_overlap: int = 80,
    embedding_model: str = "",
) -> list[dict[str, Any]]:
    """
    Semantic chunking by section (and bullets for experience/projects/achievements).
    Only falls back to character split when a semantic unit exceeds chunk_size.
    """
    created_at = datetime.now(timezone.utc).isoformat()
    chunks: list[dict[str, Any]] = []
    for section in CHUNKABLE_SECTIONS:
        body = structured.get(section) or ""
        if isinstance(body, dict):
            body = str(body)
        body = str(body).strip()
        if not body:
            continue

        units = _bullets(body) if section in {"experience", "projects", "achievements"} else [body]
        for unit in units:
            # Keep short semantic units intact; split only oversized units
            pieces = [unit] if len(unit) <= chunk_size else split_text(unit, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            for i, piece in enumerate(pieces):
                digest = hashlib.sha1(f"{resume_id}:{version}:{section}:{i}:{piece[:64]}".encode()).hexdigest()[:16]
                chunk_id = f"{resume_id}_v{version}_{section}_{digest}"
                chunks.append(
                    {
                        "chunkId": chunk_id,
                        "content": piece,
                        "metadata": {
                            "resumeId": resume_id,
                            "version": int(version),
                            "section": section,
                            "page": 1,
                            "chunkId": chunk_id,
                            "createdAt": created_at,
                            "embeddingModel": embedding_model or "",
                        },
                    }
                )
    return chunks
