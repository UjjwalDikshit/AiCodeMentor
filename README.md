# CodeMentor AI

**Your Personal AI Software Engineering Coach**

Enterprise-style monorepo scaffold for a production AI coaching platform.  
**Architecture only** — placeholder APIs and pages. No business logic yet.

---

## Architecture overview

```
Browser (React/Vite)
    │  REST + Socket.IO
    ▼
Express API Gateway (:5000)
    │  MongoDB          │  HTTP
    ▼                   ▼
MongoDB (:27017)    FastAPI AI Service (:8000)
                        │
                        ▼
                 LangChain / LangGraph / ChromaDB
```

| Service | Role | Port |
|---------|------|------|
| `frontend` | React SPA (Vite, Tailwind, React Query, Axios) | 5173 |
| `backend` | Express REST + JWT placeholders + Socket.IO | 5000 |
| `ai-service` | FastAPI microservice (LangChain/LangGraph ready) | 8000 |
| `mongo` | MongoDB persistence | 27017 |

**Design rules baked in:** SOLID layering, DI-friendly FastAPI `Depends`, services own business logic, models/repositories own DB access (never controllers), centralized errors, loggers, and response helpers.

---

## Prerequisites

- Node.js **20+**
- Python **3.11+**
- Docker Desktop (recommended)
- MongoDB (only if not using Docker for DB)
- API keys — see [`REQUIRED_SECRETS/`](./REQUIRED_SECRETS/)

---

## 1. Paste secrets before running

This is the folder that tells you **exactly what to paste**:

```text
REQUIRED_SECRETS/
├── README.md
├── checklist.md          ← tick items as you fill them
├── openai.example        → copy to openai.env and paste key
├── jwt.example           → paste long random secrets
├── mongodb.example
├── anthropic.example     (optional)
└── github-oauth.example  (optional)
```

**Steps:**

```powershell
# From project root
copy .env.example .env
```

Then open `.env` and replace:

1. `OPENAI_API_KEY`
2. `JWT_SECRET` / `JWT_REFRESH_SECRET` (32+ random chars each)
3. Confirm `MONGODB_URI` for your run mode (Docker vs local)

Use `REQUIRED_SECRETS/checklist.md` as your pre-flight list.

---

## 2. Run everything with Docker (recommended)

```powershell
docker compose up --build
```

| URL | Service |
|-----|---------|
| http://localhost:5173 | Frontend |
| http://localhost:5000/health | Backend health |
| http://localhost:5000/api/v1/dashboard | Sample API |
| http://localhost:8000/health | AI service |
| http://localhost:8000/docs | FastAPI Swagger |

Stop:

```powershell
docker compose down
```

---

## 3. Run services locally (without Docker)

### A. MongoDB

Either start the compose DB only:

```powershell
docker compose up mongo -d
```

Or use a local MongoDB at `mongodb://localhost:27017/codementor_ai` and set that in `.env`.

### B. Backend

```powershell
cd backend
npm install
npm run dev
```

→ http://localhost:5000

### C. AI Service

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

→ http://localhost:8000/docs

### D. Frontend

```powershell
cd frontend
npm install
npm run dev
```

→ http://localhost:5173

---

## Placeholder API contracts

### Backend (`/api/v1/...`)

| Method | Path | Response |
|--------|------|----------|
| * | `/auth/*` | `{ "success": true, "message": "Coming Soon" }` |
| * | `/user/*` | same |
| GET | `/dashboard` | same |
| * | `/interview` | same |
| * | `/resume` | same |
| * | `/github` | same |
| * | `/chat` | same |
| * | `/planner` | same |
| GET | `/progress` | same |

### AI Service

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | healthy payload |
| POST | `/chat` | Coming Soon |
| POST | `/interview` | Coming Soon |
| POST | `/resume` | Coming Soon |
| POST | `/code-review` | Coming Soon |

### Frontend pages

Dashboard · Login · Register · Profile · AI Chat · Resume Review · Code Review · Interview · Planner · Analytics · 404

---

## Folder purpose (why each exists)

See the **Folder tree & rationale** section below, or open this README after clone for interviewer-ready talking points.

### Frontend `src/`

| Folder | Why it exists |
|--------|----------------|
| `components/` | Reusable UI (shadcn-style). Presentation only. |
| `pages/` | Route-level screens; compose components + hooks. |
| `layouts/` | Shell chrome (sidebar/auth) shared across routes. |
| `hooks/` | React Query / Socket / domain hooks. |
| `services/` | Axios + Socket clients — single place for HTTP. |
| `context/` | Cross-tree state (auth session). |
| `routes/` | Router map + guards. |
| `assets/` | Static images/icons. |
| `utils/` | Pure helpers. |
| `constants/` | Routes, API paths, app metadata. |
| `styles/` | Tailwind + design tokens (CSS variables). |
| `lib/` | Infra helpers (`cn`, QueryClient). |

### Backend `src/`

| Folder | Why it exists |
|--------|----------------|
| `controllers/` | Thin HTTP adapters — no DB calls. |
| `routes/` | URL → controller mapping. |
| `middlewares/` | Auth, validation, rate limit, errors. |
| `models/` | Mongoose schemas only. |
| `config/` | Env, DB, Multer — injectable config. |
| `services/` | Business logic + AI HTTP client. |
| `utils/` | Logger, responses, asyncHandler, AppError. |
| `validators/` | Zod schemas. |
| `sockets/` | Socket.IO event handlers. |

### AI Service `app/`

| Folder | Why it exists |
|--------|----------------|
| `agents/` | LangGraph agent interfaces. |
| `chains/` | LangChain chain builders. |
| `models/` | Pydantic DTOs. |
| `prompts/` | Versioned prompt templates. |
| `embeddings/` | Embedding provider factory. |
| `vectorstore/` | ChromaDB adapter. |
| `routers/` | FastAPI route modules (thin). |
| `services/` | Domain logic (DI via `Depends`). |
| `utils/` | Shared helpers. |
| `core/` | Config, logging, error handlers. |

---

## Complete folder tree

```text
Ai_Platform/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── README.md
├── REQUIRED_SECRETS/
│   ├── README.md
│   ├── checklist.md
│   ├── openai.example
│   ├── anthropic.example
│   ├── jwt.example
│   ├── mongodb.example
│   └── github-oauth.example
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── components.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── assets/
│       ├── components/
│       │   ├── ui/
│       │   └── ComingSoon.jsx
│       ├── constants/
│       ├── context/
│       ├── hooks/
│       ├── layouts/
│       ├── lib/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── styles/
│       └── utils/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── uploads/
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── sockets/
│       ├── utils/
│       └── validators/
└── ai-service/
    ├── Dockerfile
    ├── requirements.txt
    ├── data/chroma/
    └── app/
        ├── main.py
        ├── agents/
        ├── chains/
        ├── core/
        ├── embeddings/
        ├── models/
        ├── prompts/
        ├── routers/
        ├── services/
        ├── utils/
        └── vectorstore/
```

---

## Interview talking points (architecture)

1. **API gateway pattern** — Express owns auth, uploads, sockets; FastAPI owns LLM workloads so they scale independently.
2. **Dependency inversion** — Controllers depend on services; FastAPI injects services via `Depends`.
3. **12-factor config** — Single `.env`, typed settings objects, no scattered `process.env` / `os.getenv`.
4. **Observability-ready** — Structured JSON loggers from day one.
5. **Docker-ready** — Same topology locally and in CI/CD.

---

## Next implementation order (when you are ready)

1. Auth (register/login + real JWT middleware)
2. User profile + Mongo repositories
3. Chat REST + Socket.IO streaming from LangGraph
4. Resume upload (Multer) → AI `/resume`
5. Interview / Code review agents
6. Progress analytics

---

## License

Private learning / portfolio project — CodeMentor AI.
