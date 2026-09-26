# StudyQuest Agent Context

Last validated against the codebase on 2026-05-16 (branch/worktree section updated 2026-09-25). See `CLAUDE.md` for the current deploy/infra state.

## Purpose

StudyQuest is a collaborative study platform with:

- user auth
- subject enrollment and exploration
- realtime matchmaking
- study parties
- party chat and member presence
- AI-generated quests/quizzes from text or PDFs
- skill tree progression
- leaderboard / ELO-style league work already present in the repo

This file is meant to give AI assistants and teammates a fast operational overview without re-discovering the repo every session.

## Repo Shape

- `backend/`: NestJS API + Socket.IO + TypeORM + PostgreSQL
- `frontend/`: React + TypeScript + Vite SPA
- `docker-compose.yml`: local infra and optional full app containers
- `docs/`: project docs
- `docker/`: DB init assets

There is no monorepo workspace manager configured. `backend/` and `frontend/` are independent Node projects with their own `package.json`.

## Actual Stack In Use

### Backend

- NestJS 11
- TypeORM 0.3
- PostgreSQL 16
- Socket.IO via Nest websockets
- JWT auth
- Multer for file uploads
- AI provider abstraction for quiz generation
- AWS Bedrock provider (default: Nova 2 Lite free tier, Claude Haiku 4.5 Pro + study bot) via `@aws-sdk/client-bedrock-runtime`
- Gemini provider via `@google/generative-ai` (optional/legacy)
- AWS S3 for uploads, DynamoDB for quiz content
- OpenAI-compatible providers via configurable backend adapter
- Anthropic provider via direct Messages API integration
- Jest for tests

Primary backend areas:

- `backend/src/modules/auth`
- `backend/src/modules/users`
- `backend/src/modules/subjects`
- `backend/src/modules/parties`
- `backend/src/modules/quests`
- `backend/src/modules/skill-tree`
- `backend/src/modules/billing`
- `backend/src/modules/study-bot`
- `backend/src/gateways/matchmaking`

### Frontend

- React 19
- TypeScript 5.9
- Vite 8
- React Router 7
- Zustand 5
- Axios
- Socket.IO Client
- Framer Motion

Important: some markdown docs in the repo still mention older frontend tooling such as Tailwind, React Query, React Hook Form, and React Router 6. Do not assume those docs are current. Prefer the code and `frontend/package.json`.

## Current Source Of Truth

When docs and code disagree, prefer these files:

- stack and versions: `backend/package.json`, `frontend/package.json`
- app boot and env wiring: `backend/src/main.ts`, `backend/src/app.module.ts`
- local infra: `docker-compose.yml`
- chat behavior: `frontend/src/components/PartyComponents.tsx`, `frontend/src/hooks/useParty.ts`, `backend/src/modules/parties/*`, `backend/src/gateways/matchmaking/matchmaking.gateway.ts`
- quest upload flow: `backend/src/modules/quests/*`, `frontend/src/hooks/useQuests.ts`

## How To Run Locally

### Recommended hybrid dev flow

1. Copy env file at repo root:

```bash
cp .env.example .env
```

2. Start infra only:

```bash
docker compose up -d postgres dynamodb-local
```

3. Start backend:

```bash
cd backend
pnpm install
pnpm run start:dev
```

4. Seed base data after backend has initialized the schema:

```bash
cd backend
pnpm run seed
```

Optional extra seed:

```bash
pnpm run seed:skill-tree
```

5. Start frontend:

```bash
cd frontend
pnpm install
pnpm run dev
```

### Full Docker flow

If needed, the whole app can run from Compose:

```bash
docker compose up --build
```

Services exposed by default:

- frontend: `http://localhost:5173`
- backend API: `http://localhost:3000/api/v1`
- swagger: `http://localhost:3000/docs`
- postgres: `localhost:5432`
- dynamodb-local: `localhost:8000`

## Environment Notes

Root `.env.example` currently defines:

- PostgreSQL credentials
- Redis password
- JWT secret
- AI provider selection
- AWS region/keys, Bedrock models, S3 bucket, DynamoDB table (Gemini/OpenAI keys optional)
- OpenAI API key and model

AI provider notes:

- `AI_PROVIDER` controls the default quiz provider globally
- supported values: `bedrock` (default), `gemini`, `openai`, `anthropic`, `groq`, `mock`
- `QuestsService` talks to the AI facade, not to a provider SDK directly
- provider override is internal to backend code for now; there is no public API switch yet

Backend defaults and important runtime settings:

- global prefix: `/api/v1`
- CORS origin defaults to `http://localhost:5173`
- `TYPEORM_SYNC=true` creates/syncs schema in dev

Frontend uses:

- `VITE_API_URL`
- `VITE_WS_URL`

In Docker Compose those are already provided for the `web` service.

## Architecture Notes

### Parties and chat

- Party room UI lives in `frontend/src/pages/PartyRoomPage.tsx`
- Main party UI components live in `frontend/src/components/PartyComponents.tsx` and `frontend/src/components/party-chat/*`
- Party chat history is fetched over REST
- Realtime chat and member presence come through Socket.IO
- Chat messages are persisted in PostgreSQL via `ChatMessage` entity
- Chat supports `text`, `file`, and `audio` rich messages
- Text is sent over websocket and binary messages are uploaded over REST then broadcast to the room

### Quests

- Users create quests by uploading a source document (PDF, DOCX/DOC, MD, TXT, RTF, PPTX, CSV, HTML, EPUB, XLSX — anything MarkItDown parses). The optional "instrucciones / temas" text field is question guidance (topics/focus/difficulty), not the study source.
- Subscription plans are manual tiers (`free` / `pro`) — no payment processor. `src/common/plans.ts` is the single source of truth for per-plan limits (quests/day, upload MB, instructions length, AI model tier, party size). `BillingModule` exposes `GET/POST /billing/*`; `pro` is granted by a promo code or an admin and lapses at `planExpiresAt`.
- Party chat also supports file and audio uploads
- Backend stores uploaded quest source files in S3 (`quests/<uuid>.<ext>`), exposed as `/api/v1/files/<key>` (302 to a presigned URL)
- Quiz content (questions + options) lives in DynamoDB, one document per quest (table `DYNAMO_QUIZZES_TABLE`, PK `questId`, TTL `expiresAt`). Postgres keeps `Quest` metadata (incl. `question_count`) and `PlayerResult`. Access goes through `QuizContentRepository` (`backend/src/modules/quests/quiz-content/`); unit tests use `InMemoryQuizContentRepository`. Write order on generation: Dynamo put → quest `ready`. Deletes (user + retention) remove the Postgres row first, then the Dynamo item.
- Local: `docker compose up -d dynamodb-local`, set `DYNAMO_ENDPOINT=http://localhost:8000`, then `pnpm run dynamo:create-table`. One-off backfill from the legacy `quiz_questions`/`quiz_options` tables: `pnpm run migrate:quizzes-dynamo -- --dry-run`, then without the flag.

### Study bot (Pro)

- `POST /study-bot/ask` — a free-text chat grounded in the caller's own recent quest history. Gated by `ProPlanGuard` (`backend/src/common/pro-plan.guard.ts`), which checks `BillingService.getState().effectivePlan === 'pro'`.
- No vector store: `StudyBotService` fetches the last 5 completed `PlayerResult`s (+ quest/subject) scoped to `userId`, batch-reads their questions from DynamoDB, and formats them as context (`study-history.utils.ts`) — that SQL query, already scoped to the account, *is* the retrieval step. Bedrock (`AiService.chat`, `STUDY_BOT_MODEL`) answers using that context (`study-bot-prompt.ts`).
- Known limit: `PlayerResult` only stores an aggregate correct-answer count, not which specific questions were right or wrong, so the bot can report a quest's score but not name the exact question that was missed.

### Matchmaking

- Socket.IO gateway handles queueing and match events
- Party join/leave presence is also emitted from the matchmaking gateway

## Important Known Notes

### GitHub issues #34 and #35 are implemented through rich party chat messages

Validated on 2026-05-16 against the local codebase:

- Issue `#34`: party voice notes are implemented via audio chat messages
- Issue `#35`: file/PDF attachments in party chat are implemented

Implementation notes:

- `ChatMessage` now has `type`, `text`, and `attachment` metadata
- file uploads are exposed at `POST /api/v1/parties/:id/chat/file`
- audio uploads are exposed at `POST /api/v1/parties/:id/chat/audio`
- uploaded assets live in S3 under `chat/<partyId>/` and are served via `/api/v1/files/*`
- the chat UI renders file links and inline audio players

Useful verification files:

- `frontend/src/services/partyService.ts`
- `frontend/src/hooks/useParty.ts`
- `frontend/src/components/PartyComponents.tsx`
- `backend/src/modules/parties/chat-message.entity.ts`
- `backend/src/modules/parties/parties.controller.ts`
- `backend/src/gateways/matchmaking/matchmaking.gateway.ts`

### Docs drift exists

Some existing docs are outdated relative to the code. Examples:

- `frontend/README.md` describes older versions and libraries not reflected in `frontend/package.json`
- `backend/README.md` is mostly the default Nest starter README

Use code as the source of truth before trusting older markdown.

## Useful Commands

Backend:

```bash
cd backend
pnpm run start:dev
pnpm run test
pnpm run test:e2e
pnpm run lint
pnpm run seed
pnpm run seed:skill-tree
```

Frontend:

```bash
cd frontend
pnpm run dev
pnpm run build
pnpm run lint
```

Infra:

```bash
docker compose up -d postgres dynamodb-local
docker compose up --build
```

## Suggested Workflow For AI Assistants

1. Read this file first.
2. Confirm whether the task touches `frontend/`, `backend/`, or both.
3. If the task mentions party chat, check whether it is text, file, or audio behavior.
4. If the task mentions docs, verify against `package.json` and live code because markdown may be stale.
5. If the task involves uploads, distinguish quest uploads from chat uploads because both now exist and use different flows.

## Git And Worktree Convention

- `dev` is the default branch and every push to it deploys; `master` is the stable mirror (merge `dev` → `master` with `--no-ff`).
- Work on a named branch per task (`feature/<slug>`, `fix/<slug>`, `docs/<slug>`), merged back into `dev` with `--no-ff`.
- Prefer a separate git worktree per parallel task; never commit from a detached HEAD.
- After merging into `master`, update `CLAUDE.md` / this file if stack, env, deploy, commands or known issues changed.

```bash
git worktree add ../studyquest-<slug> -b feature/<slug> dev
git -C ../studyquest-<slug> status --short --branch
```
