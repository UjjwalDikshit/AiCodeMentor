"""Dummy provider — deterministic responses for tests and local boot without keys."""
from __future__ import annotations

import json
from typing import Any, AsyncIterator

from app.providers.base import BaseAIProvider
from app.utils.tokens import estimate_tokens


class DummyProvider(BaseAIProvider):
    name = "dummy"

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        last_user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
        blob = " ".join(m.get("content", "") for m in messages).lower()
        wants_json = "json" in blob or "return only" in blob

        if wants_json:
            content = json.dumps(
                {
                    "overallScore": 72,
                    "sectionScores": {
                        "formatting": 70,
                        "keywordMatch": 68,
                        "readability": 75,
                        "projects": 72,
                        "experience": 74,
                        "education": 70,
                        "skills": 76,
                        "consistency": 74,
                        "impact": 70,
                        "quantification": 60,
                        "actionVerbs": 65,
                        "structure": 78,
                    },
                    "strengths": ["Clear experience section"],
                    "weaknesses": ["Could quantify more impact"],
                    "recommendations": ["Add metrics to bullets"],
                    "items": [
                        {
                            "original": "Built features",
                            "improved": "Built features serving 10k users",
                            "reason": "Adds quantification",
                            "confidence": 0.8,
                        }
                    ],
                    "missingSkills": ["Kubernetes"],
                    "weakSkills": ["CSS"],
                    "strongSkills": ["Python", "React"],
                    "emergingSkills": ["RAG"],
                    "categories": {
                        "Frontend": ["React"],
                        "Backend": ["Python", "FastAPI"],
                        "Cloud": [],
                        "DevOps": ["Docker"],
                        "AI": ["RAG"],
                        "Database": ["MongoDB"],
                        "Programming": ["Python"],
                    },
                    "matchPercent": 64,
                    "missingKeywords": ["Kubernetes"],
                    "matchedSkills": ["Python", "React"],
                    "recommendedImprovements": ["Add cloud keywords"],
                    "executiveSummary": "Solid mid-level profile.",
                    "technicalSummary": "Strong full-stack foundation.",
                    "recruiterSummary": "Ready for product eng roles.",
                    "added": ["New project"],
                    "removed": [],
                    "improved": ["Experience bullets"],
                    "regressed": [],
                    "summary": "Version 2 is stronger.",
                    "echo": last_user[:200],
                }
            )
        else:
            content = f"[dummy] echo: {last_user}"

        return {
            "content": content,
            "model": model or "dummy-echo",
            "provider": self.name,
            "usage": {
                "prompt_tokens": estimate_tokens(" ".join(m.get("content", "") for m in messages)),
                "completion_tokens": estimate_tokens(content),
            },
        }

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        result = await self.chat(messages, model=model, **kwargs)
        for word in result["content"].split(" "):
            yield word + " "

    async def embeddings(self, texts: list[str], *, model: str | None = None) -> list[list[float]]:
        # Deterministic tiny vectors for infra tests
        return [[float((sum(ord(c) for c in t) % 100) / 100.0)] * 8 for t in texts]

    async def health(self) -> dict[str, Any]:
        return {"status": "ok", "provider": self.name, "details": {"mode": "offline-test"}}

    def token_count(self, text: str) -> int:
        return estimate_tokens(text)
