# StudyQuest - Repository Context

## Purpose

Plataforma de estudio colaborativo con matchmaking en tiempo real, salas de estudio (parties), chat enriquecido y quizzes/quests generados dinámicamente por Inteligencia Artificial a partir de apuntes o archivos PDF.

## Stack

- package.json (pnpm) - scripts: dev
- backend/package.json (pnpm) - scripts: build,careers:sync,careers:validate,dynamo:create-table,format,lint,migrate:quizzes-dynamo,migration:run,migration:run:prod,seed,seed:skill-tree,start,start:debug,start:dev,start:prod,subjects:seed-official,subjects:validate-official,test,test:cov,test:debug,test:e2e,test:watch
- frontend/package.json (pnpm) - scripts: build,dev,lint,preview,test

## Commands

See AGENTS.md for detected commands.

## Repo facts

- Owner: LorenGrz
- Base branch: `dev`. Base branch is `dev`; `dev` is separate. See "Workflow contract" in AGENTS.md for the full picture and what's actually enforced.

Last validated: 2026-10-10
