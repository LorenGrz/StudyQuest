# StudyQuest — Claude context

Last validated against the code: 2026-09-25. When this file and the code disagree, the code wins — then fix this file.
`AGENTS.md` holds the longer operational notes for other agents; keep both in sync.

## What it is

Collaborative study platform: users upload a source document, AI generates a quiz ("quest"), and players study solo or in parties with realtime chat, matchmaking, tournaments, leagues/ELO, skill tree, achievements, cosmetics and a Pro-only study bot.

## Repo layout

| Path | What |
|---|---|
| `backend/` | NestJS 11 API + Socket.IO + TypeORM 0.3 + PostgreSQL 16, Jest |
| `frontend/` | React 19 + TS 5.9 + Vite 8 SPA, React Router 7, Zustand 5, Axios, Socket.IO client, Tailwind 4, Framer Motion, Recharts, Vitest |
| `markitdown-service/` | Python sidecar that converts PDF/DOCX/PPTX/… to markdown for the AI |
| `docker-compose.yml` | local infra (postgres, redis\*) and optional full app |
| `render.yaml` | current (legacy) Render blueprint |
| `openspec/changes/`, `docs/` | specs and handoff notes — may be stale |

pnpm workspace at the root (`pnpm-workspace.yaml`: backend, frontend), but each package is run from its own folder.
\*Redis is in compose but no backend code uses it.

## Backend modules (`backend/src/modules`)

`auth` (JWT) · `users` (profile, avatars, dashboard, recommendations, leaderboard) · `subjects` (universities/careers/subjects, enrollment) · `parties` (study groups, rich chat: text/file/audio) · `quests` (upload → generate → play → results, daily retention job) · `ai` (provider facade + MarkItDown client) · `skill-tree` · `tournaments` · `achievements` · `cosmetics` (avatar borders) · `search` (trigram) · `billing` (manual `free`/`pro` plans, promo codes) · `study-bot` (Pro chat grounded in the user's last 5 results).
Shared: `src/common/plans.ts` is the single source of truth for per-plan limits; `common/pro-plan.guard.ts`; `common/leagues.ts`, `careers.ts`, `cors.ts`, `upload.util.ts`.
Realtime: one gateway `src/gateways/matchmaking/matchmaking.gateway.ts` (matchmaking, party presence, chat broadcast, tournament events).

## Key flows

- **Quest generation:** `POST /api/v1/quests` (multipart) → MarkItDown (fallback `pdf-parse`) → chunking (`AI_CHUNK_TOKENS`, `AI_MAX_CHUNKS`) → `AiService` picks provider by `AI_PROVIDER` → `quiz-prompt.ts` → `raw-question.utils.ts` parses/validates/shuffles → saved → `quest.ready` event. Pro plan uses a stronger model tier.
- **AI providers** (`modules/ai/providers`): gemini (current prod), openai, anthropic, groq, mock. `study-bot` and the temporary `GET /api/v1/ai-test` still call Gemini directly.
- **Chat:** history over REST, live over Socket.IO; files/audio uploaded via `POST /parties/:id/chat/{file,audio}` then broadcast.
- **Retention:** `QuestRetentionService` (03:00 + on boot) deletes quests older than `QUEST_RETENTION_DAYS` and their files.

## Hard constraints

- **Single instance only.** Matchmaking queue, pending confirmations, socket connection map and crons (matchmaking 5 s, tournaments 10 s, billing, retention) are in memory; no Redis adapter.
- Uploads go to local `./uploads` → ephemeral on any container host.
- `TYPEORM_SYNC=true` currently syncs schema in prod; migrations live in `src/database/migrations` and `config/typeorm.config.ts` only understands `POSTGRES_*` (not `DATABASE_URL`).
- Global prefix `/api/v1` except `/health` and the socket.

## Branches & deploy

- `dev` = default branch; every push deploys. `master` = stable mirror (merged 2026-09-25). Feature branches: `feature/…`, `fix/…`, merged `--no-ff`.
- **Frontend:** GitHub Actions `.github/workflows/deploy-frontend.yml` → `gh-pages` → `https://lorengrz.github.io/StudyQuest/`. `VITE_API_URL` is set in that workflow.
- **Backend (legacy, down):** Render free — `studyquest-api-sjc1` and `studyquest-markitdown` are **suspended since 2026-09**; DB on Aiven free Postgres (`DATABASE_URL` only in the Render dashboard).
- **Target (in progress):** AWS — Lightsail instance (Docker Compose: api + markitdown + postgres + caddy), S3 for files (30-day lifecycle), DynamoDB for quiz content, Bedrock (Nova 2 Lite free / Claude Haiku 4.5 Pro + study bot). Plan: `~/.claude/plans/harmonic-sprouting-magpie.md`. Update this section when the cutover lands.

## Commands

```bash
docker compose up -d postgres          # local DB
cd backend && pnpm start:dev           # API on :3000, swagger /docs
cd backend && pnpm seed && pnpm seed:skill-tree
cd frontend && pnpm dev                # :5173
cd backend && pnpm lint && pnpm test && pnpm build
cd frontend && pnpm lint && pnpm test && pnpm build
```

## Env

Root `.env.example` is the reference (DB, JWT, CORS, plan limits, `AI_PROVIDER` + provider keys/models, `QUEST_RETENTION_DAYS`, `QUEST_DAILY_LIMIT`). Frontend: `VITE_API_URL`, `VITE_WS_URL`. Never commit real keys.

## Known issues

- `GET /api/v1/ai-test` is a temporary debug endpoint — remove.
- Old PDFs referenced by `sourcePdfUrl` 404 after redeploys (ephemeral disk).
- `PlayerResult` stores only aggregate correct answers, so the study bot can't name missed questions.
- `frontend/README.md`, `backend/README.md` and parts of `AGENTS.md` are stale.
