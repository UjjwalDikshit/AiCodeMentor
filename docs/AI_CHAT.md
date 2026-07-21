# CodeMentor AI — Part 5 Copilot (extended)

Single AI chat stack on **AIExecutionPipeline**. No second provider stack.

## Architecture

```text
React Copilot UI
  → Express (/conversations, /chat/*)
    → aiClient
      → FastAPI ChatInfraService
        → AIExecutionPipeline
          → Pre → Validation → Prompt Registry → Memory → ProviderFactory → Parser → Post → Telemetry
```

## Database

- **Conversation** — settings, favorite/pin/archive, color/icon, lastOpened/Active, usageStats, titleSource, systemPromptOverride, templateId
- **Message** — content, tokens, latency, requestId, attachments metadata
- **ChatTemplate** — reusable presets (system + user)
- **PromptLibrary** — user prompts with version history → registryKey
- **ChatUsageDaily** — analytics rollups

## Key APIs

| Area | Paths |
|------|-------|
| Conversations | CRUD, duplicate, search, export, import |
| Chat | send, stream, regenerate, retry, stop, attachments, providers, models, analytics |
| Templates | `/chat/templates` CRUD + duplicate |
| Prompts | `/chat/prompts` CRUD + export/import + duplicate |

## Auto-title

After first replies, `chat_title_generator.yaml` is rendered via the pipeline (`system_prompt=chat_title_generator` + variables). No hardcoded title strings in business logic beyond fallback truncate.

## Recovery

`localStorage` key `cm_chat_recovery` stores activeId, draft, scrollPos, provider/model snapshot.

## Frontend pages

- `/chat` — Copilot shell
- `/prompt-library` — Prompt Library
- `/chat-analytics` — usage charts

## Testing

- AI: `pytest tests/ -q`
- Backend validators: `node --test src/validators/chat.validator.test.js`
- Integration: `npm run test:chat` (services up)

## Out of scope (preserved)

Resume Analyzer, GitHub Analyzer, Interview Agent, Code Review, DSA Tutor product, RAG/vector search.
