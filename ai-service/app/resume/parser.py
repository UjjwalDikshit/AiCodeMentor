"""Hybrid resume section detection + parsing (heuristics + structure; LLM enrichment optional)."""
from __future__ import annotations

import re
from typing import Any

SECTION_ALIASES: dict[str, tuple[str, ...]] = {
    "header": ("contact", "profile header"),
    "summary": ("summary", "professional summary", "profile", "objective", "about"),
    "skills": ("skills", "technical skills", "core competencies", "technologies", "tech stack"),
    "experience": ("experience", "work experience", "employment", "professional experience", "work history"),
    "projects": ("projects", "personal projects", "key projects", "selected projects"),
    "education": ("education", "academic", "academics"),
    "achievements": ("achievements", "awards", "honors", "accomplishments"),
    "certifications": ("certifications", "certificates", "licenses"),
    "publications": ("publications", "papers", "research"),
    "links": ("links", "profiles", "social", "portfolio"),
    "languages": ("languages", "language proficiency"),
}


def _normalize(line: str) -> str:
    return re.sub(r"\s+", " ", line.strip().lower())


def detect_section(line: str) -> tuple[str | None, float]:
    """Return (section_key, confidence) for a heading-like line."""
    raw = line.strip()
    if not raw or len(raw) > 80:
        return None, 0.0
    # Heading heuristics: short, title-ish, optional trailing colon
    cleaned = raw.rstrip(":").strip()
    norm = _normalize(cleaned)
    if not norm:
        return None, 0.0

    for key, aliases in SECTION_ALIASES.items():
        for alias in aliases:
            if norm == alias:
                return key, 0.98
            if norm.startswith(alias) and len(norm) < len(alias) + 12:
                return key, 0.85
            if alias in norm and len(norm) <= 40:
                return key, 0.7

    # ALL CAPS short line often a section header
    if raw.isupper() and 2 <= len(raw.split()) <= 5:
        return "miscellaneous", 0.45

    return None, 0.0


def parse_resume_text(text: str) -> dict[str, Any]:
    """
    Hybrid parser:
    1) Split lines
    2) Detect section headers with confidence
    3) Bucket content; unknown → miscellaneous
    4) Extract lightweight contact/links via patterns (not the only strategy)
    """
    lines = [ln.rstrip() for ln in (text or "").splitlines()]
    sections: dict[str, dict[str, Any]] = {
        key: {"content": [], "confidence": 0.0} for key in list(SECTION_ALIASES) + ["miscellaneous"]
    }

    current = "header"
    sections[current]["confidence"] = 0.6

    for ln in lines:
        if not ln.strip():
            continue
        section, conf = detect_section(ln)
        if section and conf >= 0.7:
            current = section if section != "miscellaneous" else current
            if section != "miscellaneous":
                sections[section]["confidence"] = max(sections[section]["confidence"], conf)
                continue
            if conf >= 0.45 and section == "miscellaneous":
                # treat weak ALL-CAPS as misc header switch
                current = "miscellaneous"
                sections["miscellaneous"]["confidence"] = max(sections["miscellaneous"]["confidence"], conf)
                continue
        sections[current]["content"].append(ln)

    # Contact / links helpers (supplemental)
    joined = "\n".join(lines)
    emails = re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", joined)
    phones = re.findall(r"(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}", joined)
    urls = re.findall(r"https?://[^\s)]+|www\.[^\s)]+|linkedin\.com/[^\s)]+|github\.com/[^\s)]+", joined, re.I)

    structured: dict[str, Any] = {
        "header": "\n".join(sections["header"]["content"]).strip(),
        "summary": "\n".join(sections["summary"]["content"]).strip(),
        "skills": "\n".join(sections["skills"]["content"]).strip(),
        "experience": "\n".join(sections["experience"]["content"]).strip(),
        "projects": "\n".join(sections["projects"]["content"]).strip(),
        "education": "\n".join(sections["education"]["content"]).strip(),
        "achievements": "\n".join(sections["achievements"]["content"]).strip(),
        "certifications": "\n".join(sections["certifications"]["content"]).strip(),
        "publications": "\n".join(sections["publications"]["content"]).strip(),
        "links": "\n".join(sections["links"]["content"]).strip() or "\n".join(urls[:10]),
        "contact": {
            "emails": list(dict.fromkeys(emails))[:5],
            "phones": list(dict.fromkeys(phones))[:5],
        },
        "languages": "\n".join(sections["languages"]["content"]).strip(),
        "miscellaneous": "\n".join(sections["miscellaneous"]["content"]).strip(),
        "sectionConfidence": {k: round(v["confidence"], 2) for k, v in sections.items() if v["content"] or v["confidence"]},
        "rawLength": len(text or ""),
    }
    return structured
