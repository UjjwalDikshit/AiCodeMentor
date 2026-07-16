# REQUIRED SECRETS — Paste Before Running
#
# This folder is your pre-flight checklist.
# Copy each `*.example` file to the matching name WITHOUT `.example`,
# then paste your real values. Never commit filled files.
#
# Quick start:
#   1. Copy root `.env.example` → `.env`
#   2. Fill files in this folder (see list below)
#   3. Mirror those values into root `.env`
#   4. Run `docker compose up --build` OR start services locally
#
# Files to create from examples:
#   ├── openai.example          → openai.env
#   ├── anthropic.example       → anthropic.env   (optional)
#   ├── jwt.example             → jwt.env
#   ├── mongodb.example         → mongodb.env
#   ├── github-oauth.example    → github-oauth.env (optional)
#   └── checklist.md            → track what you've filled
#
# See checklist.md for the full paste list.

## What goes where

| Secret | Where it ends up | Required to boot? |
|--------|------------------|-------------------|
| OpenAI / LLM API key | `.env` → `OPENAI_API_KEY` | Yes (for AI features later) |
| JWT secrets | `.env` → `JWT_SECRET`, `JWT_REFRESH_SECRET` | Yes |
| MongoDB URI | `.env` → `MONGODB_URI` | Yes |
| Anthropic key | `.env` → `ANTHROPIC_API_KEY` | No |
| GitHub OAuth | `.env` → `GITHUB_CLIENT_*` | No |

Architecture note: services read only from the root `.env` (and Vite `VITE_*` vars).
These example files exist so you know exactly what to paste before you run.
