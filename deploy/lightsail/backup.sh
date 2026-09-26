#!/usr/bin/env bash
# Dumps the postgres container to a gzip'd pg_dump custom-format file and
# uploads it to S3. Meant to run from cron on the Lightsail instance.
#
# Crontab (root, daily at 03:00 UTC):
#   0 3 * * * /opt/studyquest/deploy/lightsail/backup.sh >> /var/log/studyquest-backup.log 2>&1
set -euo pipefail

REPO_DIR="/opt/studyquest"
COMPOSE_FILE="deploy/lightsail/docker-compose.prod.yml"
ENV_FILE="deploy/lightsail/.env"
S3_BUCKET="studyquest-files-493735739644"
DATE="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
DUMP_NAME="studyquest-${DATE}.dump.gz"
TMP_DIR="$(mktemp -d)"
DUMP_PATH="${TMP_DIR}/${DUMP_NAME}"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cd "$REPO_DIR"

POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  | gzip > "$DUMP_PATH"

docker run --rm \
  --env-file "$ENV_FILE" \
  -v "${TMP_DIR}:/backup:ro" \
  amazon/aws-cli s3 cp "/backup/${DUMP_NAME}" "s3://${S3_BUCKET}/backups/${DUMP_NAME}"

echo "Backup uploaded to s3://${S3_BUCKET}/backups/${DUMP_NAME}"
