#!/usr/bin/env bash
# Run on the Lightsail instance to deploy/update StudyQuest.
# Usage: /opt/studyquest/deploy/lightsail/deploy.sh
set -euo pipefail

REPO_DIR="/opt/studyquest"
COMPOSE_FILE="deploy/lightsail/docker-compose.prod.yml"
ENV_FILE="deploy/lightsail/.env"

cd "$REPO_DIR"

git fetch origin
git checkout dev
git pull --ff-only origin dev

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

# Baseline guard: the DB restored from Render/Aiven was managed with
# TYPEORM_SYNC=true and has no `migrations` table. Without this, the first
# migration:run would re-apply ResetUsersEloToZero and wipe every user's ELO.
# Only runs when the table does not exist yet.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
DO $$
BEGIN
  IF to_regclass('public.migrations') IS NULL
     AND to_regclass('public.users') IS NOT NULL THEN
    CREATE TABLE migrations (
      id SERIAL PRIMARY KEY,
      "timestamp" bigint NOT NULL,
      name varchar NOT NULL
    );
    INSERT INTO migrations ("timestamp", name)
    VALUES (1752624000000, 'ResetUsersEloToZero1752624000000');
  END IF;
END $$;
SQL

# Run pending TypeORM migrations inside the freshly built api container. The
# production image (backend/Dockerfile, "production" stage) doesn't have pnpm
# on PATH, so call the typeorm CLI binary directly instead of `pnpm run
# migration:run` (that npm script still exists in backend/package.json for
# local/dev use where pnpm is available).
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api \
  node_modules/.bin/typeorm migration:run -d dist/config/typeorm.config.js

# Apply the official careers catalog (backend/src/database/seeds/data/careers).
# Idempotent: upserts, retires careers that left the source, never deletes.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api \
  node dist/database/scripts/careers-sync.js

docker image prune -f

echo "Deploy done."
