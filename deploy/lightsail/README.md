# StudyQuest on AWS Lightsail

Single Ubuntu 24.04 (2 GB, x86_64) Lightsail instance running the whole stack
(`postgres`, `markitdown`, `api`, `caddy`) via Docker Compose. TLS comes from
Caddy + Let's Encrypt against an `sslip.io` hostname that resolves to the
instance's own public IP, so no real domain is required.

## Provision

1. Create the Lightsail instance: Ubuntu 24.04, 2 GB RAM plan, x86_64.
2. Paste `deploy/lightsail/user-data.sh` into the instance's "Launch script"
   field before creating it (Lightsail runs it as cloud-init on first boot).
3. Attach a static IP to the instance.
4. Open ports 80 and 443 in the instance's networking rules (22 is open by
   default for SSH).

## First boot

1. SSH in as `ubuntu` and confirm cloud-init finished:
   ```bash
   cloud-init status --wait
   ```
2. The repo is already cloned to `/opt/studyquest` (branch `dev`) by
   `user-data.sh`. Log out and back in once so the `docker` group membership
   takes effect, or run `newgrp docker`.
3. Work out the instance's `API_DOMAIN`: take the static IP, e.g.
   `203.0.113.10`, and replace dots with dashes:
   `api-203-0-113-10.sslip.io`.

## Fill `.env`

```bash
cd /opt/studyquest
cp deploy/lightsail/.env.production.example deploy/lightsail/.env
vim deploy/lightsail/.env   # set API_DOMAIN, POSTGRES_PASSWORD, JWT_SECRET,
                             # AWS_ACCESS_KEY_ID/SECRET, S3_BUCKET, etc.
```

`deploy/lightsail/.env` is gitignored — it never leaves the instance.

## Deploy

```bash
/opt/studyquest/deploy/lightsail/deploy.sh
```

This pulls `dev`, rebuilds and restarts the stack, runs pending TypeORM
migrations inside the `api` container, and prunes dangling images. Re-run it
for every update; it is safe to run repeatedly.

Check status:

```bash
cd /opt/studyquest
docker compose -f deploy/lightsail/docker-compose.prod.yml --env-file deploy/lightsail/.env ps
```

## Logs

```bash
cd /opt/studyquest
docker compose -f deploy/lightsail/docker-compose.prod.yml --env-file deploy/lightsail/.env logs -f api
docker compose -f deploy/lightsail/docker-compose.prod.yml --env-file deploy/lightsail/.env logs -f caddy
```

## Backups

`deploy/lightsail/backup.sh` runs `pg_dump` (custom format) inside the
`postgres` container, gzips it, and uploads it to
`s3://studyquest-files-493735739644/backups/<key>` with a unique,
timestamped key per run (`studyquest-<UTC timestamp>.dump.gz`).

**IAM note:** the AWS credentials in `deploy/lightsail/.env`
(`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) are scoped to
`s3:PutObject` on `backups/*` only — no `GetObject` or `ListBucket`. That is
intentional: a compromised instance can only write new backups, never read or
enumerate existing ones. Because of this, `backup.sh` never lists or
verifies the upload from the instance; the exact key it wrote is only
available in its own log line (`Backup uploaded to s3://...`), so keep
`/var/log/studyquest-backup.log` around to know which keys exist.

Schedule it with root's crontab (daily at 03:00 UTC):

```bash
sudo crontab -e
# add:
0 3 * * * /opt/studyquest/deploy/lightsail/backup.sh >> /var/log/studyquest-backup.log 2>&1
```

### Restore from a backup

The instance's own AWS credentials cannot download backups (no `GetObject`).
Run the download step from a machine/profile that has broader S3 read access
(e.g. your local AWS CLI with an admin or read-only-on-the-bucket profile),
then copy the decrypted dump over to the instance:

```bash
# on your machine, with a profile that can read the bucket:
aws s3 cp s3://studyquest-files-493735739644/backups/<key-from-the-log> ./restore.dump.gz
scp ./restore.dump.gz ubuntu@<instance-ip>:/tmp/restore.dump.gz
```

```bash
# on the instance:
cd /opt/studyquest
gunzip -c /tmp/restore.dump.gz > /tmp/restore.dump
docker compose -f deploy/lightsail/docker-compose.prod.yml --env-file deploy/lightsail/.env \
  exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < /tmp/restore.dump
```

Stop the `api` container first if you're restoring over a live database
(`docker compose ... stop api`), then start it again after the restore
finishes.

## Rotate keys

- **JWT_SECRET**: update `deploy/lightsail/.env`, then
  `docker compose -f deploy/lightsail/docker-compose.prod.yml --env-file deploy/lightsail/.env up -d api`.
  This invalidates every existing session/token.
- **AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY**: rotate in IAM first, update
  `.env`, then recreate `api` the same way (and `backup.sh` picks up the new
  creds on its next cron run automatically since it reads `.env` each time).
- **POSTGRES_PASSWORD**: change it inside Postgres first
  (`ALTER USER ... WITH PASSWORD ...` via `psql`), then update `.env` and
  recreate `api` (do not recreate `postgres` with the old volume and a new
  password — it won't match the data already on disk).
