# StudyQuest — Agent Context

Single source of truth for every agent (Claude Code, Codex, others) and teammates; `CLAUDE.md` only imports this file. Read it first instead of re-discovering the repo every session.

Last validated against the code: 2026-09-30 (careers catalog + community subjects + admin panel deployed to prod; merged with the former `AGENTS.md`, last validated 2026-05-16, on 2026-10-03). When this file and the code disagree, the code wins — then fix this file.

**Active plans / handoff:** start a new session with `docs/plans/HANDOFF.md` (current state, pending work, how to resume) and the active plan in `docs/plans/` (2026-09: official careers catalog + community-created subjects).

## What it is

Collaborative study platform: users upload a source document, AI generates a quiz ("quest"), and players study solo or in parties with realtime chat, matchmaking, tournaments, leagues/ELO, skill tree, achievements, cosmetics and a Pro-only study bot. Also: user auth, subject enrollment and exploration, party chat with member presence.

## Repo layout

| Path | What |
|---|---|
| `backend/` | NestJS 11 API + Socket.IO + TypeORM 0.3 + PostgreSQL 16, Jest |
| `frontend/` | React 19 + TS 5.9 + Vite 8 SPA, React Router 7, Zustand 5, Axios, Socket.IO client, Tailwind 4, Framer Motion, Recharts, Vitest |
| `markitdown-service/` | Python sidecar that converts PDF/DOCX/PPTX/… to markdown for the AI |
| `docker-compose.yml` | local infra (postgres, dynamodb-local, markitdown) and optional full app (api, web) |
| `docker/` | DB init assets |
| `deploy/lightsail/` | production: compose (api, markitdown, postgres, caddy), Caddyfile, `deploy.sh`, `backup.sh`, `user-data.sh`, runbook README |
| `openspec/changes/`, `docs/` | specs and handoff notes — may be stale |

pnpm workspace at the root (`pnpm-workspace.yaml`: backend, frontend), but each package is run from its own folder with its own `package.json`.

Backend extras not obvious from the module list: Multer for uploads; AI SDKs `@aws-sdk/client-bedrock-runtime` (Bedrock), `@google/generative-ai` (Gemini, optional/legacy), an OpenAI-compatible adapter, and Anthropic via the direct Messages API.

## Current source of truth

When docs and code disagree, prefer these files:

- stack and versions: `backend/package.json`, `frontend/package.json`
- app boot and env wiring: `backend/src/main.ts`, `backend/src/app.module.ts`
- local infra: `docker-compose.yml`
- chat behavior: `frontend/src/components/party/PartyComponents.tsx`, `frontend/src/hooks/useParty.ts`, `backend/src/modules/parties/*`, `backend/src/gateways/matchmaking/matchmaking.gateway.ts`
- quest upload flow: `backend/src/modules/quests/*`, `frontend/src/hooks/useQuests.ts`

## Backend modules (`backend/src/modules`)

`auth` (JWT) · `users` (profile, avatars, dashboard, recommendations, leaderboard: global / by `university_id` / by `career_id`, `careerId` takes precedence over university) · `universities` (official universities/careers catalog, `GET /universities`, `GET /universities/:id/careers`, "Otra" `career_requests`, `mapUsersToCatalog`) · `subjects` (subjects, enrollment; `career_id` is only a tag — one subject per university + normalized name; community subjects: `suggest`, `POST /subjects/community`, reports, 3-layer name validation) · `admin` (`/admin/*`, `Role.ADMIN`: career requests approve/reject, community subjects publish/rename/hide/merge) · `parties` (study groups, rich chat: text/file/audio) · `quests` (upload → generate → play → results, daily retention job; quiz content in DynamoDB via `quiz-content/QuizContentRepository`) · `ai` (provider facade + Bedrock client + MarkItDown client) · `storage` (S3 `StorageService` + public `GET /api/v1/files/*key` → 302 presigned URL) · `skill-tree` · `tournaments` · `achievements` · `cosmetics` (avatar borders) · `search` (trigram) · `billing` (`free`/`pro` plans, promo codes, Mercado Pago payments in `billing/payments`) · `study-bot` (Pro chat grounded in the user's last 5 results).
Shared: `src/common/plans.ts` is the single source of truth for per-plan limits (quests/day, upload MB, instructions length, AI model tier, party size); `common/pro-plan.guard.ts`; `common/leagues.ts`, `subject-name.ts` (`normalizeSubjectName`, dedup key), `university-name.ts` (`universityKey`, UTN alias), `subject-name.validator.ts` + `profanity-es.ts` (layers 1–2 of subject-name validation), `cors.ts`, `upload.util.ts`.
Realtime: one gateway `src/gateways/matchmaking/matchmaking.gateway.ts` (matchmaking queueing and match events, party join/leave presence, chat broadcast, tournament events).

## Key flows

- **Quest generation:** `POST /api/v1/quests` (multipart) → MarkItDown (fallback `pdf-parse`) → chunking (`AI_CHUNK_TOKENS`, `AI_MAX_CHUNKS`) → `AiService` picks provider by `AI_PROVIDER` → `quiz-prompt.ts` → `raw-question.utils.ts` parses/validates/shuffles → saved → `quest.ready` event. Pro plan uses a stronger model tier. Accepted sources: PDF, DOCX/DOC, MD, TXT, RTF, PPTX, CSV, HTML, EPUB, XLSX — anything MarkItDown parses. The optional "instrucciones / temas" text field is question guidance (topics/focus/difficulty), not the study source.
- **AI providers** (`modules/ai/providers`): **bedrock (default, prod)**, gemini, openai, anthropic, groq, mock. Free tier → `BEDROCK_MODEL` (Nova 2 Lite, fallback Nova Lite); Pro tier and study bot → `BEDROCK_MODEL_PRO`/`STUDY_BOT_MODEL` (Claude Haiku 4.5). `AiService.chat()` backs the study bot. `QuestsService` talks to the AI facade, not to a provider SDK directly; provider override is internal to backend code — there is no public API switch.
- **Quiz storage:** Postgres keeps `quests` (metadata + `question_count`) and `player_results`; questions/options live in DynamoDB `studyquest-quizzes` (table `DYNAMO_QUIZZES_TABLE`, one doc per quest, PK `questId`, stable question/option ids, TTL `expiresAt` = retention + 2 days). Access goes through `QuizContentRepository` (`backend/src/modules/quests/quiz-content/`); unit tests use `InMemoryQuizContentRepository`. Write order on generation: Dynamo put → quest `ready`. Deletes (user + retention) remove the Postgres row first, then the Dynamo item. Legacy `quiz_questions`/`quiz_options` tables still exist but are unused (drop migration pending); one-off backfill from them: `pnpm run migrate:quizzes-dynamo -- --dry-run`, then without the flag.
- **Files:** uploads go to S3 `studyquest-files-493735739644` under `quests/`, `chat/<partyId>/`, `avatars/<userId>/`; DB stores `/api/v1/files/<key>`. The app IAM user has no `s3:ListBucket`, so a missing object is a 403 that the code maps to 404. Cosmetic borders are static files in `backend/static/borders` served at `/static/borders`. Quest uploads and chat uploads are different flows — distinguish them.
- **Plans:** `free` / `pro`. Pro comes from a promo code, an admin grant, or a Mercado Pago payment (below). `BillingModule` exposes `GET/POST /billing/*`; `pro` lapses at `planExpiresAt`.
- **Payments (Mercado Pago Checkout Pro, `modules/billing/payments`):** `POST /payments/checkout` creates a `payments` row (`pending`; ARS = `PRO_USD_PRICE` × dolarapi.com oficial venta rounded up to 100, sanity band 0.5×–5× `PRO_PRICE_ARS_FALLBACK`, floor `PRO_PRICE_ARS_FLOOR`) and a 2 h MP preference with `external_reference` = payment id (a fresh unpaid one is reused on repeat clicks; permanent Pro → 409). MP calls `POST /payments/webhook` (public, HMAC `x-signature` with `MP_WEBHOOK_SECRET`, 24 h window). The MP API is the source of truth; grants are idempotent **per MP payment id** (`payment_grants` UNIQUE, row locks): each approved ARS payment ≥ the quote (and `live_mode` unless `MP_SANDBOX`) adds 30 days; refund/charge-back takes them back (`revoked_at`); refunded/charged_back never regress. Anything off is held with `needs_review_reason` (error log, UI shows support). Missed webhooks heal via `GET /payments/:id` (reconciles with MP, ≤ 1 lookup / 30 s, accepts MP's `payment_id` as a verified `hint`) and a 10-min cron over open payments < 7 days. Missing MP env → app boots, checkout 503. Back URL `/plan?pago=ok|pendiente|error`.
- **Catalog:** universities + careers are curated JSON in `backend/src/database/seeds/data/careers/<slug>.json` (7 unis, `pnpm careers:validate`), applied by `careers:sync` (upsert, retires careers that left the source except admin-approved ones — careers are retired, never deleted — then `mapUsersToCatalog` by name/acronym); `deploy.sh` runs it after migrations. Official informática subjects live in `seeds/data/official-subjects.ts` (`pnpm subjects:validate-official`, which rejects generic "Electiva I"-style slots), applied by `subjects:seed-official` (manual, `--dry-run` first; idempotent; never touches active legacy rows or rows hidden by moderation). In prod both scripts run as `node dist/database/scripts/<name>.js`. Registration picks `universityId` + `careerId`, or `careerName` ("Otra") → pending `career_requests` (max 3 per user), resolved in `/admin`.
- **Community subjects (`modules/subjects/community-subjects.*`):** create = normalize → exact match enrolls → similar (≥ 0.6) 409 → daily limit (10/24 h) → format + profanity → Bedrock classifier (`SUBJECT_CLASSIFIER_MODEL`, default Nova Lite, fail-closed, user text delimited as data) → private subject. Public at 3 enrolled users of that university; auto-hidden at 3 reports (never official ones). Results audited in `subjects.moderation` (`select:false`, strip it from responses); every admin action writes it too. Visibility is enforced in one place (`CommunitySubjectsService.resolveReadable`/`resolveAttachable`) — reuse them for any new entry point that takes a `subjectId`: other users' private and hidden subjects are 404 on read, parties, matchmaking and skill nodes; merged ids resolve to their target. `AI_PROVIDER=mock` skips the model locally. Admin panel: frontend `/admin` (ADMIN role) over `backend/src/modules/admin`. Plan and state: `docs/plans/2026-09-community-subjects.md`, `docs/plans/HANDOFF.md`.
- **Chat:** party room UI in `frontend/src/pages/PartyRoomPage.tsx`, components in `frontend/src/components/party/PartyComponents.tsx` and `frontend/src/components/party-chat/*`. History over REST, live chat and member presence over Socket.IO; messages persisted in PostgreSQL via the `ChatMessage` entity (`type`, `text`, `attachment` metadata; types `text`, `file`, `audio`). Text goes over the websocket; files/audio are uploaded via `POST /api/v1/parties/:id/chat/{file,audio}` (stored in S3 under `chat/<partyId>/`, served via `/api/v1/files/*`) then broadcast to the room. The UI renders file links and inline audio players. This implements GitHub issues #34 (voice notes) and #35 (file/PDF attachments); verification files: `frontend/src/services/partyService.ts`, `frontend/src/hooks/useParty.ts`, `backend/src/modules/parties/chat-message.entity.ts`, `backend/src/modules/parties/parties.controller.ts`, the matchmaking gateway.
- **Study bot (Pro):** `POST /study-bot/ask` — free-text chat grounded in the caller's own recent quest history, gated by `ProPlanGuard` (checks `BillingService.getState().effectivePlan === 'pro'`). No vector store: `StudyBotService` fetches the last 5 completed `PlayerResult`s (+ quest/subject) scoped to `userId`, batch-reads their questions from DynamoDB, and formats them as context (`study-history.utils.ts`) — that account-scoped SQL query *is* the retrieval step. Bedrock (`AiService.chat`, `STUDY_BOT_MODEL`) answers using that context (`study-bot-prompt.ts`).
- **Retention:** `QuestRetentionService` (03:00 + on boot) deletes quests older than `QUEST_RETENTION_DAYS` (30) plus their Dynamo docs and S3 objects. S3 lifecycle (30 d on `quests/`/`chat/`) and Dynamo TTL are the safety net.

## Hard constraints

- **Single instance only.** Matchmaking queue, pending confirmations, socket connection map and crons (matchmaking 5 s, tournaments 10 s, billing, retention) are in memory; no Redis adapter.
- Prod runs `TYPEORM_SYNC=false`; schema changes need a migration in `src/database/migrations` (`pnpm migration:run` locally, `deploy.sh` runs them in prod). There is no initial-schema migration: a brand-new DB needs one boot with `TYPEORM_SYNC=true` (the dev default). `deploy.sh` baselines the `migrations` table so `ResetUsersEloToZero` never re-runs on a synced DB.
- Seeds (`seed.js`) create demo accounts with passwords from the repo — rotate them in any public environment (done in prod 2026-09-26).
- Global prefix `/api/v1` except `/health` and the socket. CORS origin defaults to `http://localhost:5173`.
- **Rate limiting:** `default` throttler (100/min) runs everywhere; `strict` is opt-in per route via `@Throttle({ strict: … })` (`common/throttle.ts` `onlyWhereDeclared`). `trust proxy` is 1 (Caddy) so limits are per client. Never register a named throttler without a `skipIf`, or it applies to every route.
- **Usernames** are stored lowercase without `@` (`common/username.ts` normalizes register/profile/friend lookup; migration `LowercaseUsernames`). The UI shows a fixed `@` prefix (`Input prefix`) and lowercases as you type (`frontend/src/utils/username.ts`).
- **API errors in the UI:** `services/api.ts` rewrites 429/5xx/network errors into Spanish user-facing text (`utils/apiErrors.ts`); other statuses keep the backend `message`. University/career fields are selects fed by `GET /universities` and `GET /universities/:id/careers`.

## Branches, worktrees & deploy

- `dev` = default branch; every push to `frontend/**` redeploys the frontend (backend deploy is manual, see below). `master` = stable mirror, merged `--no-ff` from `dev`. Feature branches: `feature/…`, `fix/…`, `docs/…`, one per task, merged back into `dev` with `--no-ff`.
- Prefer a separate git worktree per parallel task; never commit from a detached HEAD.

  ```bash
  git worktree add ../studyquest-<slug> -b feature/<slug> dev
  git -C ../studyquest-<slug> status --short --branch
  ```

- After merging into `master`, update this file if stack, env, deploy, commands or known issues changed.
- **Frontend:** GitHub Actions `.github/workflows/deploy-frontend.yml` → `gh-pages` → `https://lorengrz.github.io/StudyQuest/`. `VITE_API_URL` is set in that workflow; the CSP in `frontend/index.html` must list the API origin (`connect-src`, `media-src`) or the browser blocks it.
- **Backend (AWS, us-east-1, account 493735739644):**
  - Lightsail instance `studyquest` (Ubuntu 24.04, 2 GB, static IP `54.156.9.166`, auto-snapshots 06:00 UTC) running `deploy/lightsail/docker-compose.prod.yml` from `/opt/studyquest`. API: `https://api-54-156-9-166.sslip.io` (Caddy + Let's Encrypt).
  - Deploy = `ssh -i ~/.ssh/studyquest-lightsail.pem ubuntu@54.156.9.166 /opt/studyquest/deploy/lightsail/deploy.sh` (pull `dev`, rebuild, migrations, `careers:sync`). Not automatic on push. Bash runs the pre-pull copy of `deploy.sh`, so a step added in the same deploy only runs from the next one.
  - Secrets only in `/opt/studyquest/deploy/lightsail/.env` (chmod 600). App IAM user `studyquest-app` + managed policy `studyquest-app-least-privilege` (Bedrock via the 3 `us.*` profiles, S3 object ops on the 3 prefixes + write-only `backups/`, Dynamo item ops on one table).
  - Postgres lives in the compose (`postgres_data` volume); `backup.sh` dumps to `s3://…/backups/` (14-day lifecycle).
  - Budget `monthly-cost-limit` USD 15 (credits excluded) with email alerts. Account is on the AWS Free plan: credits expire 2026-12-30 — upgrade before then.
- Render/Aiven are retired (Render services were suspended in 2026-09; the prod DB was started clean + seed, not migrated).

## Run locally

Hybrid dev flow (recommended):

```bash
cp .env.example .env                           # once, at repo root
docker compose up -d postgres dynamodb-local   # local DB + Dynamo (set DYNAMO_ENDPOINT=http://localhost:8000)
cd backend && pnpm install && pnpm dynamo:create-table
cd backend && pnpm migration:run       # existing local DB: BEFORE start:dev (see below)
cd backend && pnpm start:dev           # API on :3000, swagger /docs
cd backend && pnpm seed && pnpm seed:skill-tree   # after the backend has initialized the schema
cd backend && pnpm careers:sync && pnpm subjects:seed-official   # catalog (both accept --dry-run)
cd frontend && pnpm install && pnpm dev                # :5173
cd backend && pnpm test && pnpm test:e2e && pnpm build   # pnpm lint is broken: no eslint.config for ESLint 9
cd frontend && pnpm test && pnpm build  # pnpm lint has ~87 pre-existing errors
```

With an existing local DB, run `pnpm migration:run` before `start:dev`: the sync boot fails adding NOT NULL `subjects.name_normalized` to rows that have no value yet, and sync alone never creates the partial unique index `UQ_subjects_university_name_normalized` nor the GIN trigram index on `subjects` (`synchronize: false`, migration-only). No `migrations` table yet → apply the `deploy.sh` baseline first so `ResetUsersEloToZero` doesn't re-run. A brand-new empty DB can still boot with sync first and run migrations after.

Full Docker flow: `docker compose up --build` (root `pnpm dev` does the same). Exposed by default: frontend `http://localhost:5173`, API `http://localhost:3000/api/v1`, swagger `http://localhost:3000/docs`, postgres `localhost:5432`, dynamodb-local `localhost:8000`.

## Env

Root `.env.example` (local) and `deploy/lightsail/.env.production.example` (prod) are the reference: DB, JWT, CORS, plan limits, Mercado Pago, `AI_PROVIDER` + `BEDROCK_*` (optional `GEMINI_*`/`OPENAI_*`/`ANTHROPIC_*`/`GROQ_*`), `AWS_*`, `S3_BUCKET`, `DYNAMO_QUIZZES_TABLE`, `DYNAMO_ENDPOINT` (local), `QUEST_RETENTION_DAYS`. Frontend: `VITE_API_URL` (sockets derive from it; the `VITE_WS_URL` still set in `docker-compose.yml` is unused by the code). Never commit real keys.

## Known issues

- Backend has no ESLint 9 config; frontend lint has pre-existing errors (`react-hooks/set-state-in-effect`, `no-explicit-any`); the new data-fetching hooks follow the same pattern.
- Any logged-in user can create skill nodes on a subject they can see (no admin check). The admin merge picker only lists subjects of the current tab.
- Users with legacy career strings that aren't official (e.g. the 8 seed accounts, UNC "Ingeniería en Sistemas de Información") point at a `retired` career and must re-pick it in the profile.
- `dashboard.tsx` and `HomeLeaderboardPreview.tsx` render `avatarUrl` without the media resolver, so uploaded avatars break there.
- Legacy `quiz_questions`/`quiz_options` tables still exist (drop migration pending).
- API domain is an sslip.io hostname; moving to a real domain means updating Caddy `API_DOMAIN`, the workflow `VITE_API_URL`, the CSP and `CORS_ALLOWED_ORIGINS`.
- `PlayerResult` stores only aggregate correct answers, so the study bot can't name missed questions.
- Docs drift: `frontend/README.md` (older libraries/versions) and `backend/README.md` (default Nest starter) are stale, as are some other markdown docs. Verify against `package.json` and live code before trusting markdown.

## Workflow checklist for agents

1. Read this file first, then `docs/plans/HANDOFF.md` for in-flight work.
2. Confirm whether the task touches `frontend/`, `backend/`, or both.
3. If the task mentions party chat, check whether it is text, file, or audio behavior.
4. If the task mentions docs, verify against `package.json` and live code because markdown may be stale.
5. If the task involves uploads, distinguish quest uploads from chat uploads — they use different flows.
