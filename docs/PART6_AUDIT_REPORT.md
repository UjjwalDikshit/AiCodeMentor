# Part 6 Audit Report — Resume Intelligence Platform

**Date:** 2026-07-22  
**Method:** Code inspection + targeted fixes + pytest evidence (`22 passed`)  
**Scope:** Audit-only changes; no new product features beyond spec gaps.

---

## Fixes applied during audit

| Gap | Fix |
|-----|-----|
| ATS/JD/skills/report/compare sent full resume JSON to LLM | RAG-only: retrieved chunks → pipeline |
| Chat fell back to whole structured resume | Fallback is empty context only |
| Retriever missing `version` filter | Added `version` (+ `jdId`) filters |
| Chunk metadata missing `createdAt` / `embeddingModel` | Added at chunk + index time |
| ATS scores missing Projects/Experience/Education/Skills | Extended `resume_ats.yaml` schema |
| Rollback missing | `POST /:id/rollback` + UI |
| Compare ignored vector versions | Compare retrieves per-version chunks |
| Tests lacked RAG/JD/compare coverage | Expanded `test_resume_intel.py` |
| Docs claimed RAG while code dumped full resume | Docs + sequence diagrams updated |

---

## 1. Resume Parsing

| | |
|--|--|
| **Status** | **PASS** (with weakness) |
| **Evidence** | `parse_resume_text` buckets lines via `detect_section` alias table + heading heuristics + confidence; contact/URLs are supplemental regex only. Output keys include header, summary, skills, experience, projects, education, achievements, certifications, publications, links, languages, miscellaneous (+ contact). |
| **Files** | `ai-service/app/resume/parser.py` |
| **Weakness** | Hybrid heuristics, not ML/LLM second-pass classification. |
| **Improvement** | Optional pipeline enrichment pass for low-confidence sections. |

---

## 2. Section Detection

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Confidence 0.98/0.85/0.7 for aliases; ALL-CAPS unknown → `miscellaneous` @ 0.45; content without heading stays in current section; `sectionConfidence` returned. |
| **Files** | `parser.py` |
| **Weakness** | Weak ALL-CAPS headings always map to miscellaneous. |

---

## 3. Chunking

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Section-first; experience/projects/achievements bullet-split; character `split_text` only if unit > chunk_size. Metadata: resumeId, version, section, page, chunkId, createdAt, embeddingModel. |
| **Files** | `chunker.py`, test `test_chunk_resume_metadata_complete` |
| **Weakness** | Oversized units still use fixed-length split. |

---

## 4. Embeddings

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | `VectorStoreService.add_documents` → `EmbeddingFactory` provider; vectors stored on collection docs. Search embeds **query only**; test asserts stored doc vectors unchanged after search. |
| **Files** | `vectorstore/service.py`, `embeddings/factory.py`, `rag.py`, test `test_embeddings_stored_not_reembedded_on_search` |
| **Weakness** | No cross-request result cache for identical queries. |

---

## 5. Vector Store

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | `resume_user_{id}` vs `jd_user_{id}`; create via `create_collection`; delete via `delete_documents` / reindex; search; update = delete old chunkIds + re-add. |
| **Files** | `rag.py`, `service.parse_and_index(reindex=...)`, test `test_separate_resume_and_jd_collections` |

---

## 6. RAG (critical)

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | Pre-fix: ATS/JD/skills/report passed `resume_json` / full structured dumps. Post-fix: prompts use `retrieved_context` / `resume_context` / `jd_context` only; monkeypatch tests assert `resume_json` absent. Flow: Retriever → Top-K → Pipeline → LLM. |
| **Files** | `resume/service.py`, `prompts/registry/resume_*.yaml`, tests `test_ats_uses_rag_not_full_resume`, `test_jd_match_uses_similarity_contexts` |

---

## 7. Retriever

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | Filters: section, resumeId, **version**, jdId; top-k after over-fetch; similarity threshold via `1/(1+distance)`. |
| **Files** | `rag.py`, test `test_rag_index_search_version_filter` |

---

## 8. ATS

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | `output_format=json`; schema includes overall + formatting, keywordMatch, readability, projects, experience, education, skills, consistency, impact, quantification (+ actionVerbs/structure). Persisted on version + `atsHistory`. |
| **Files** | `resume_ats.yaml`, `resume.service.js` `runAts` |

---

## 9. Bullet Improvement

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Prompt requires `original/improved/reason/confidence`; bullets sourced from RAG experience/project chunks when list empty. |
| **Files** | `resume_bullets.yaml`, `improve_bullets` |

---

## 10. Skill Gap

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Schema: strong/weak/missing/emerging + Frontend/Backend/Cloud/DevOps/AI/Database/Programming; grounded in retrieved skills/experience chunks. |
| **Files** | `resume_skills.yaml`, `skill_gap` |

---

## 11. Job Description Matching

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | JD indexed to separate collection; match runs similarity on resume + JD stores before pipeline; no full `jd_text`/`resume_json` in prompt vars. |
| **Files** | `index_jd`, `match_jd`, test `test_jd_match_uses_similarity_contexts` |

---

## 12. Resume Chat

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | `resumeSearch` by user message → override with chunks only; uses `chatService` → `/chat` pipeline. No whole-resume fallback. |
| **Files** | `backend/.../resume.service.js` `chat` |

---

## 13. Versioning

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | Multiple versions on Resume model; reindex deletes prior chunkIds; rollback sets `currentVersion`; compare returns structured added/removed/improved/regressed via RAG+pipeline. |
| **Files** | `Resume.model.js`, `rollback`, `compare_versions` |

---

## 14. Analytics

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | `atsHistory`, version list, skillGrowth, keywordCoverage, improvementTimeline from persisted Resume document. |
| **Files** | `analytics()` in resume.service.js, Analytics tab (recharts) |

---

## 15. Reports

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | `resume_report` via `AIExecutionPipeline`; executive/technical/recruiter + strengths/weaknesses/recommendations; markdown/json export (PDF placeholder). |
| **Files** | `report()`, `resume_report.yaml` |

---

## 16. Pipeline

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | All LLM via `AIExecutionPipeline` / `ProviderFactory`; resume package has zero Groq/Ollama imports. Stages: pre → validation → prompt registry → memory → provider → parser → post → telemetry. Retriever precedes pipeline in resume features. |
| **Files** | `pipeline/executor.py`, `resume/service.py` |

---

## 17. Performance

| | |
|--|--|
| **Status** | **PARTIAL PASS** |
| **Evidence** | Async `setImmediate` indexing; list pagination; tab lazy analytics; indexStatus polling; embeddings at index time. |
| **Weakness** | No query-result caching; no worker queue (in-process background only). |
| **Files** | `resume.service.js` upload/indexVersionAsync, frontend poll |

---

## 18. Security

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Global JWT `authenticateUser`; `assertOwner`; multer MIME/size; virus placeholder; `resumeLimiter` 30/min. |
| **Files** | `routes/index.js`, `multer.js`, `resume.routes.js` |
| **Weakness** | Virus scan is placeholder only. |

---

## 19. Testing

| | |
|--|--|
| **Status** | **PASS** (after expansion) |
| **Evidence** | Parser, chunking, embeddings persistence, vector collections, version filter, ATS RAG, JD RAG, bullets/skills/report/compare, reindex — **22 passed** with infra tests. |
| **Weakness** | No Express integration tests; chat RAG covered by code path not HTTP e2e. |
| **Files** | `tests/test_resume_intel.py` |

---

## 20. Documentation

| | |
|--|--|
| **Status** | **PASS** (after update) |
| **Evidence** | Architecture, RAG rule, chunk metadata, APIs, mermaid sequences for ATS/JD in `docs/RESUME_INTELLIGENCE.md`. |
| **Files** | `docs/RESUME_INTELLIGENCE.md` |

---

## Scores

| Dimension | Score | Notes |
|-----------|------:|-------|
| **Overall** | **86 / 100** | Critical RAG violations fixed; residual heuristic/queue gaps |
| **Production Readiness** | **78 / 100** | Needs real virus scan, PDF export, job queue, chroma in prod |
| **Interview Readiness** | **88 / 100** | Clear RAG story + pipeline reuse |
| **RAG Readiness** | **90 / 100** | Features retrieve-first; query embedding each search is correct |
| **Performance** | **72 / 100** | Async index OK; no cache/queue |
| **Code Quality** | **85 / 100** | Consistent DI/pipeline; prompts versioned |
| **Maintainability** | **84 / 100** | Clear module split; docs accurate post-audit |

---

## Remaining known limitations (not blocking Part 6)

1. Virus scan placeholder  
2. PDF report export placeholder  
3. No dedicated background worker (uses `setImmediate`)  
4. Section detection is heuristic (not ML)  
5. No Express/Jest suite for resume routes  
