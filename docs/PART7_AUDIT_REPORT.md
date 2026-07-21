# Part 7 Audit Report — Code Intelligence Platform

**Date:** 2026-07-22  
**Method:** Code inspection → gap fixes → pytest evidence (`16 passed`)  
**Rule:** Only missing/incorrect spec items were changed.

---

## Fixes applied during this audit

| Gap | Fix |
|-----|-----|
| Conditionals not extracted | `_extract_conditionals` + AST field |
| Tree-sitter only counted nodes | Walk CST for function/class/method symbols when available; heuristic otherwise |
| AI received large raw `codeExcerpt` | Review/interview: findings-only; refactor: capped supplemental + `original_code` |
| Multi-file AI got raw code dump | Aggregate findings only |
| Missing prompts `security_review`, `performance_review`, `refactor`, `diff_review`, `chat` | Added YAML prompts + service wiring |
| Refactor missing Original/Risk aliases | Prompt requires `originalCode`, `improvedCode`, `risk`/`riskLevel`, `confidence`, complexity fields |
| Diff was text-only before AI | Deterministic AST/quality deltas in `analyze_diff(..., old_ast=, new_ast=)` |
| No repeated_computations rule | Added in `performance.py` |
| No deterministic analysis cache | In-process SHA1 cache on `run_deterministic` |
| Weak zip validation | Path traversal reject, entry/size limits |
| Analytics missing quality/security history fields | `qualityTrend`, `securityHistory`, `complexityHistory`, `reviewHistory` |
| Chat prompt name | Uses canonical `chat` |

---

## 1. Language Detection

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Deterministic `EXT_MAP` + `CONTENT_HINTS` scoring; returns `language`, `confidence`, `scores`. Supports c/cpp/java/python/javascript/typescript/go/rust/csharp/sql/unknown. Not prompt-based. |
| **Files** | `ai-service/app/code_intel/language.py` |
| **Weakness** | Heuristic overlap (JS vs TS) possible without extension. |
| **Improvement** | Weight extension higher when present (already +0.55). |

---

## 2. Parser

| | |
|--|--|
| **Status** | **PASS** (with weakness) |
| **Evidence** | Builds structural AST dict: functions (name/params/lines/length), classes, interfaces, methods, imports, variables, loops, **conditionals**, recursion, comments, callGraph. Tree-sitter walk extracts symbols when `tree_sitter_languages` installed; else heuristic regex/structure. Tests assert not tokenizer-only (`startLine`/`endLine`/`length`). |
| **Files** | `parser.py`, tests `test_parser_*` |
| **Weakness** | Default install has no Tree-sitter packages — production uses heuristic unless installed. Call graph is name-based heuristic. |
| **Improvement** | Ship optional `tree-sitter-languages` in Docker image. |

---

## 3. Static Analysis

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Pure Python rules in `static.py`: unused_variable, dead_code, duplicate_logic, long_function, large_class, deep_nesting, magic_number, repeated_condition, input_validation, exception_handling. No LLM. |
| **Files** | `static.py` |
| **Weakness** | Heuristic unused-var (occurrence count) has false positives/negatives. |

---

## 4. Complexity Engine

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Deterministic decision-pattern counts → cyclomatic; cognitive from decisions×nesting; maintainability formula; Big-O from nested loop depth; memory heuristic; function lengths; recursion note. |
| **Files** | `complexity.py` |
| **Weakness** | Big-O / memory are estimated heuristics, not formal analysis — still deterministic, not LLM. |

---

## 5. Security Engine

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Pattern rules: sql_injection, command_injection, path_traversal, unsafe_eval, hardcoded_secret, weak_randomness, unsafe_deserialization, missing_validation, insecure_auth. |
| **Files** | `security.py` |

---

## 6. Performance Engine

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | nested_loops, expensive_operation, repeated_allocations, string_concatenation, n_plus_one, large_copies, memory_inefficiency, **repeated_computations**. |
| **Files** | `performance.py` |

---

## 7. AI Review

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | `run_deterministic` always first; AI gets `findings_json` with quality/complexity/static/security/performance/astSummary. Review/interview omit raw code. Monkeypatch test asserts no `codeExcerptSupplemental` on analyze. Prompt instructs not to recompute metrics. |
| **Files** | `service.py`, `code_review.yaml`, test `test_analyze_deterministic_before_ai` |
| **Weakness** | Refactor still needs code to rewrite (by design) via `original_code`. |

---

## 8. Prompt Registry

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | Versioned YAML: `code_review`, `security_review`, `performance_review`, `refactor`, `diff_review`, `chat` (+ `code_interview`, legacy `code_*` retained). |
| **Files** | `app/prompts/registry/*.yaml` |

---

## 9. Pipeline

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Product path: Request → deterministic engines → Prompt Builder → `AIExecutionPipeline` (pre → validation → prompt registry → memory → provider → parser → post → telemetry). Zero Groq/Ollama imports in `code_intel/`. |
| **Files** | `service.py`, `pipeline/executor.py` |
| **Note** | Parser/static/complexity happen in CodeIntelService *before* pipeline (correct for Part 7), not as internal pipeline stages. |

---

## 10. Refactoring

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | `refactor.yaml` requires originalCode, improvedCode, reason, expectedImprovement, complexityDifference/Change, risk/riskLevel, confidence. |
| **Files** | `refactor.yaml`, `service.refactor` |

---

## 11. Diff Review

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | Old/New → `run_deterministic` each → `analyze_diff` (unified + structural AST/quality deltas) → AI `diff_review` explains JSON (not raw old+new dump). |
| **Files** | `diff.py`, `service.diff_review` |

---

## 12. Code Chat

| | |
|--|--|
| **Status** | **PARTIAL** |
| **Evidence** | Reuses `chatService.send` → `/chat` pipeline + ProviderFactory + memory window + telemetry. Analysis context injected via override. Uses prompt `chat`. |
| **Weakness** | Chat path uses non-streaming `send`, not SSE stream (review streaming exists separately via `/analyze/stream`). |
| **Files** | `backend/.../codeIntel.service.js` `chat` |

---

## 13. Analytics

| | |
|--|--|
| **Status** | **PASS** (after fix) |
| **Evidence** | Backend aggregates persisted `CodeReview` + `reviewHistory`: languagesReviewed, reviewHistory, securityHistory, complexityHistory/Trends, qualityTrend, averageQuality. Frontend calls `GET /analytics`. |
| **Files** | `codeIntel.service.js` `analytics`, `CodeReviewPage` analytics tab |

---

## 14. Database

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | `CodeReview` stores code, deterministic findings/metrics, aiReview, refactor, interviewCoach, diffResult, reviewHistory, conversationId, userId ownership. |
| **Files** | `CodeReview.model.js` |

---

## 15. Streaming

| | |
|--|--|
| **Status** | **PARTIAL** |
| **Evidence** | `/code-intel/analyze/stream` + Express proxy: analysis event then `pipeline.stream` tokens (requestId/provider/model/latency/tokens from Part 4/5 pipeline). AbortController on client disconnect. |
| **Weakness** | Code chat itself not SSE; token telemetry only on stream path. |

---

## 16. Performance

| | |
|--|--|
| **Status** | **PARTIAL** |
| **Evidence** | Background `setImmediate` analyze; list pagination; det cache; lazy analytics tab; incremental complexity/security/performance endpoints. |
| **Weakness** | No dedicated worker queue; cache is in-process only. |

---

## 17. Security

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | JWT global; assertOwner; multer allowlist + size; zip path traversal + size limits; codeIntelLimiter; GitHub raw URL allowlist. |
| **Files** | `multer.js`, `unpack_inputs`, `routes/index.js` |

---

## 18. Frontend

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | Editor/metrics/security/performance/diff/chat/history/analytics tabs call `codeIntelService` APIs (create/analyze/refactor/interview/diff/chat/analytics). |
| **Files** | `CodeReviewPage.jsx`, `codeIntelService.js` |

---

## 19. Testing

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | 16 tests covering detection, parser structure, static, complexity, security, performance, quality, diff structural, analyze-before-AI, refactor, interview, cache. Not HTTP-status-only. |
| **Weakness** | No Express e2e for chat/analytics HTTP. |
| **Files** | `tests/test_code_intel.py` |

---

## 20. Documentation

| | |
|--|--|
| **Status** | **PASS** |
| **Evidence** | `docs/CODE_INTELLIGENCE.md` architecture, sequence, APIs; updated for prompt names and findings-first AI. |
| **Files** | `docs/CODE_INTELLIGENCE.md`, this report |

---

## Scores

| Dimension | Score | Notes |
|-----------|------:|-------|
| **Overall** | **84 / 100** | Spec-aligned after fixes; Tree-sitter optional |
| **Production Readiness** | **76 / 100** | Need Tree-sitter in image, worker queue, chat SSE |
| **Interview Readiness** | **88 / 100** | Clear det→AI story |
| **Static Analysis Readiness** | **86 / 100** | Solid rules; heuristic limits |
| **AI Review Readiness** | **90 / 100** | Findings-first enforced in tests |
| **Performance** | **72 / 100** | Cache + async; no queue |
| **Code Quality** | **84 / 100** | Clear module split |
| **Maintainability** | **85 / 100** | Engines isolated from pipeline |

---

## Explicit answers

### 1. Does deterministic analysis happen BEFORE AI?
**Yes.** `run_deterministic(...)` always runs before `_pipeline_json` / `pipeline.stream`.

### 2. Is AI only explaining structured findings instead of discovering them?
**Yes for review/interview/security/performance/diff.** Prompts forbid recomputing rules; payload is `findings_json`. Refactor receives code to rewrite (necessary), still grounded in findings.

### 3. Is Tree-sitter actually used? If not, where does fallback occur?
**Only if `tree_sitter_languages` is installed.** `_try_tree_sitter` walks the CST for symbols; on any failure, `parserBackend="heuristic"` and regex/structure extractors run. Default Windows/dev env typically uses **heuristic**.

### 4. Can this architecture scale to GitHub Repository Analyzer without changes?
**Not without changes.** Need repo clone/crawl, multi-file indexing at scale, worker queue, incremental file hashing, and likely vector/repo knowledge store. Current zip/multi-file path is a starting point, not a repo analyzer.

### 5. Can Interview Agent reuse this pipeline without duplication?
**Yes.** Reuse `AIExecutionPipeline` + Prompt Registry + (optionally) `CodeIntelService.run_deterministic` / `interview_coach` / chat conversation pattern — no need to reimplement providers.

### 6. Is any part still pretending to be deterministic while relying on the LLM?
**No for metrics/rules.** Complexity/security/static/performance are code rules. AI only narrates. Big-O/memory labels say “estimated” but are rule-based, not LLM.

### 7. Which remaining weaknesses would materially affect interview quality?
1. Heuristic parser misses complex language constructs → wrong function boundaries.  
2. Without Tree-sitter in prod, structural fidelity drops.  
3. Security rules are pattern-based (false negatives on sophisticated sinks).  
4. Code chat not streaming → weaker live-coach UX.  
5. No worker for large zips → timeouts under load.

---

## Remaining known limitations (not blocking Part 7)

- Tree-sitter optional dependency not installed by default  
- No Celery/RQ worker  
- Chat SSE not wired (review stream is)  
- No Express Jest suite  
