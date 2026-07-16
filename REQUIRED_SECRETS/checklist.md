# Pre-run checklist — paste these before `docker compose up`

- [ ] Root `.env` created from `.env.example`
- [ ] `OPENAI_API_KEY` pasted (or set `LLM_PROVIDER` + matching key)
- [ ] `JWT_SECRET` replaced with a random 32+ character string
- [ ] `JWT_REFRESH_SECRET` replaced with a different random 32+ character string
- [ ] `MONGODB_URI` correct for your mode:
  - Docker Compose: `mongodb://mongo:27017/codementor_ai`
  - Local Node only: `mongodb://localhost:27017/codementor_ai`
- [ ] (Optional) `ANTHROPIC_API_KEY`
- [ ] (Optional) `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`
- [ ] CORS_ORIGIN matches frontend URL (`http://localhost:5173`)

## Generate JWT secrets (PowerShell)

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

## Generate JWT secrets (bash)

```bash
openssl rand -base64 48
```
