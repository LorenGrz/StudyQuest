# StudyQuest — Claude context

Last validated against the code: 2026-09-26 (AWS migration, throttling + username fixes). When this file and the code disagree, the code wins — then fix this file.
`AGENTS.md` holds the longer operational notes for other agents; keep both in sync.

## What it is

Collaborative study platform: users upload a source document, AI generates a quiz ("quest"), and players study solo or in parties with realtime chat, matchmaking, tournaments, leagues/ELO, skill tree, achievements, cosmetics and a Pro-only study bot.

## Repo layout

| Path | What |
|---|---|
| `backend/` | NestJS 11 API + Socket.IO + TypeORM 0.3 + PostgreSQL 16, Jest |
| `frontend/` | React 19 + TS 5.9 + Vite 8 SPA, React Router 7, Zustand 5, Axios, Socket.IO client, Tailwind 4, Framer Motion, Recharts, Vitest |
| `markitdown-service/` | Python sidecar that converts PDF/DOCX/PPTX/… to markdown for the AI |
| `docker-compose.yml` | local infra (postgres, redis\*, dynamodb-local) and optional full app |
| `deploy/lightsail/` | production: compose (api, markitdown, postgres, caddy), Caddyfile, `deploy.sh`, `backup.sh`, `user-data.sh`, runbook README |
| `openspec/changes/`, `docs/` | specs and handoff notes — may be stale |

pnpm workspace at the root (`pnpm-workspace.yaml`: backend, frontend), but each package is run from its own folder.
\*Redis is in compose but no backend code uses it.

## Backend modules (`backend/src/modules`)

`auth` (JWT) · `users` (profile, avatars, dashboard, recommendations, leaderboard) · `subjects` (universities/careers/subjects, enrollment) · `parties` (study groups, rich chat: text/file/audio) · `quests` (upload → generate → play → results, daily retention job; quiz content in DynamoDB via `quiz-content/QuizContentRepository`) · `ai` (provider facade + Bedrock client + MarkItDown client) · `storage` (S3 `StorageService` + public `GET /api/v1/files/*key` → 302 presigned URL) · `skill-tree` · `tournaments` · `achievements` · `cosmetics` (avatar borders) · `search` (trigram) · `billing` (manual `free`/`pro` plans, promo codes) · `study-bot` (Pro chat grounded in the user's last 5 results).
Shared: `src/common/plans.ts` is the single source of truth for per-plan limits; `common/pro-plan.guard.ts`; `common/leagues.ts`, `careers.ts`, `cors.ts`, `upload.util.ts`.
Realtime: one gateway `src/gateways/matchmaking/matchmaking.gateway.ts` (matchmaking, party presence, chat broadcast, tournament events).

## Key flows

- **Quest generation:** `POST /api/v1/quests` (multipart) → MarkItDown (fallback `pdf-parse`) → chunking (`AI_CHUNK_TOKENS`, `AI_MAX_CHUNKS`) → `AiService` picks provider by `AI_PROVIDER` → `quiz-prompt.ts` → `raw-question.utils.ts` parses/validates/shuffles → saved → `quest.ready` event. Pro plan uses a stronger model tier.
- **AI providers** (`modules/ai/providers`): **bedrock (default, prod)**, gemini, openai, anthropic, groq, mock. Free tier → `BEDROCK_MODEL` (Nova 2 Lite, fallback Nova Lite); Pro tier and study bot → `BEDROCK_MODEL_PRO`/`STUDY_BOT_MODEL` (Claude Haiku 4.5). `AiService.chat()` backs the study bot.
- **Quiz storage:** Postgres keeps `quests` (metadata + `question_count`) and `player_results`; questions/options live in DynamoDB `studyquest-quizzes` (one doc per quest, PK `questId`, stable question/option ids, TTL `expiresAt` = retention + 2 days). Legacy `quiz_questions`/`quiz_options` tables still exist but are unused (drop migration pending).
- **Files:** uploads go to S3 `studyquest-files-493735739644` under `quests/`, `chat/<partyId>/`, `avatars/<userId>/`; DB stores `/api/v1/files/<key>`. The app IAM user has no `s3:ListBucket`, so a missing object is a 403 that the code maps to 404. Cosmetic borders are static files in `backend/static/borders` served at `/static/borders`.
- **Chat:** history over REST, live over Socket.IO; files/audio uploaded via `POST /parties/:id/chat/{file,audio}` then broadcast.
- **Retention:** `QuestRetentionService` (03:00 + on boot) deletes quests older than `QUEST_RETENTION_DAYS` (30) plus their Dynamo docs and S3 objects. S3 lifecycle (30 d on `quests/`/`chat/`) and Dynamo TTL are the safety net.

## Hard constraints

- **Single instance only.** Matchmaking queue, pending confirmations, socket connection map and crons (matchmaking 5 s, tournaments 10 s, billing, retention) are in memory; no Redis adapter.
- Prod runs `TYPEORM_SYNC=false`; schema changes need a migration in `src/database/migrations` (`pnpm migration:run` locally, `deploy.sh` runs them in prod). There is no initial-schema migration: a brand-new DB needs one boot with `TYPEORM_SYNC=true`. `deploy.sh` baselines the `migrations` table so `ResetUsersEloToZero` never re-runs on a synced DB.
- Seeds (`seed.js`) create demo accounts with passwords from the repo — rotate them in any public environment (done in prod 2026-09-26).
- Global prefix `/api/v1` except `/health` and the socket.
- **Rate limiting:** `default` throttler (100/min) runs everywhere; `strict` is opt-in per route via `@Throttle({ strict: … })` (`common/throttle.ts` `onlyWhereDeclared`). `trust proxy` is 1 (Caddy) so limits are per client. Never register a named throttler without a `skipIf`, or it applies to every route.
- **Usernames** are stored lowercase without `@` (`common/username.ts` normalizes register/profile/friend lookup; migration `LowercaseUsernames`). The UI shows a fixed `@` prefix (`Input prefix`) and lowercases as you type (`frontend/src/utils/username.ts`).
- **API errors in the UI:** `services/api.ts` rewrites 429/5xx/network errors into Spanish user-facing text (`utils/apiErrors.ts`); other statuses keep the backend `message`. University fields are selects fed by `GET /subjects/universities`.

## Branches & deploy

- `dev` = default branch; every push to `frontend/**` redeploys the frontend. `master` = stable mirror, merged `--no-ff` from `dev`. Feature branches: `feature/…`, `fix/…`, `docs/…`, merged `--no-ff`.
- **Frontend:** GitHub Actions `.github/workflows/deploy-frontend.yml` → `gh-pages` → `https://lorengrz.github.io/StudyQuest/`. `VITE_API_URL` is set in that workflow; the CSP in `frontend/index.html` must list the API origin (`connect-src`, `media-src`) or the browser blocks it.
- **Backend (AWS, us-east-1, account 493735739644):**
  - Lightsail instance `studyquest` (Ubuntu 24.04, 2 GB, static IP `54.156.9.166`, auto-snapshots 06:00 UTC) running `deploy/lightsail/docker-compose.prod.yml` from `/opt/studyquest`. API: `https://api-54-156-9-166.sslip.io` (Caddy + Let's Encrypt).
  - Deploy = `ssh ubuntu@54.156.9.166 /opt/studyquest/deploy/lightsail/deploy.sh` (pull `dev`, rebuild, migrations). Not automatic on push.
  - Secrets only in `/opt/studyquest/deploy/lightsail/.env` (chmod 600). App IAM user `studyquest-app` + managed policy `studyquest-app-least-privilege` (Bedrock via the 3 `us.*` profiles, S3 object ops on the 3 prefixes + write-only `backups/`, Dynamo item ops on one table).
  - Postgres lives in the compose (`postgres_data` volume); `backup.sh` dumps to `s3://…/backups/` (14-day lifecycle).
  - Budget `monthly-cost-limit` USD 15 (credits excluded) with email alerts. Account is on the AWS Free plan: credits expire 2026-12-30 — upgrade before then.
- Render/Aiven are retired (Render services were suspended in 2026-09; the prod DB was started clean + seed, not migrated).

## Commands

```bash
docker compose up -d postgres dynamodb-local   # local DB + Dynamo
cd backend && pnpm dynamo:create-table
cd backend && pnpm start:dev           # API on :3000, swagger /docs
cd backend && pnpm seed && pnpm seed:skill-tree
cd frontend && pnpm dev                # :5173
cd backend && pnpm test && pnpm build   # pnpm lint is broken: no eslint.config for ESLint 9
cd frontend && pnpm test && pnpm build  # pnpm lint has ~87 pre-existing errors
```

## Env

Root `.env.example` (local) and `deploy/lightsail/.env.production.example` (prod) are the reference: DB, JWT, CORS, plan limits, `AI_PROVIDER` + `BEDROCK_*`, `AWS_*`, `S3_BUCKET`, `DYNAMO_QUIZZES_TABLE`, `DYNAMO_ENDPOINT` (local), `QUEST_RETENTION_DAYS`. Frontend: `VITE_API_URL` (sockets derive from it). Never commit real keys.

## Known issues

- Backend has no ESLint 9 config; frontend lint has pre-existing errors (`react-hooks/set-state-in-effect`, `no-explicit-any`).
- `dashboard.tsx` and `HomeLeaderboardPreview.tsx` render `avatarUrl` without the media resolver, so uploaded avatars break there.
- Legacy `quiz_questions`/`quiz_options` tables still exist (drop migration pending).
- API domain is an sslip.io hostname; moving to a real domain means updating Caddy `API_DOMAIN`, the workflow `VITE_API_URL`, the CSP and `CORS_ALLOWED_ORIGINS`.
- `PlayerResult` stores only aggregate correct answers, so the study bot can't name missed questions.
- `frontend/README.md` and `backend/README.md` are stale.
