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

# Run pending TypeORM migrations inside the freshly built api container. The
# production image (backend/Dockerfile, "production" stage) doesn't have pnpm
# on PATH, so call the typeorm CLI binary directly instead of `pnpm run
# migration:run` (that npm script still exists in backend/package.json for
# local/dev use where pnpm is available).
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api \
  node_modules/.bin/typeorm migration:run -d dist/config/typeorm.config.js

docker image prune -f

echo "Deploy done."
