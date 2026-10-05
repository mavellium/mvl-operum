#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077
PREFIX="operum-restore-${GITHUB_RUN_ID:-$$}"
WORK=$(mktemp -d)
cleanup() { docker rm -f "$PREFIX-source" "$PREFIX-target" "$PREFIX-minio" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
docker build -f scripts/validation/Minio.Dockerfile -t operum-minio-validation .
start=$(date +%s)
for name in source target; do
  docker run -d --name "$PREFIX-$name" -e POSTGRES_PASSWORD=validation-only -e POSTGRES_USER=operum -e POSTGRES_DB=operum postgres:17-alpine >/dev/null
  for i in {1..30}; do docker exec "$PREFIX-$name" pg_isready -U operum >/dev/null 2>&1 && break; sleep 1; done
done
docker run -d --name "$PREFIX-minio" -e MINIO_ROOT_USER=validation -e MINIO_ROOT_PASSWORD=validation-only operum-minio-validation server /data >/dev/null
for i in {1..30}; do
  docker exec "$PREFIX-minio" mc alias set local http://127.0.0.1:9000 validation validation-only >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$PREFIX-minio" mc mb local/source >/dev/null
docker exec "$PREFIX-source" psql -U operum -d operum -v ON_ERROR_STOP=1 -c 'CREATE TABLE users(id text primary key, name text); CREATE TABLE projects(id text primary key, owner_id text references users(id)); CREATE TABLE attachments(id text primary key, project_id text references projects(id), object_key text); INSERT INTO users VALUES ('"'"'u-1'"'"','"'"'Synthetic User'"'"'); INSERT INTO projects VALUES ('"'"'p-1'"'"','"'"'u-1'"'"'); INSERT INTO attachments VALUES ('"'"'a-1'"'"','"'"'p-1'"'"','"'"'document.txt'"'"');' >/dev/null
mkdir -p "$WORK/snapshot/objects"
printf 'Synthetic attachment content\n' > "$WORK/snapshot/objects/document.txt"
docker cp "$WORK/snapshot/objects/document.txt" "$PREFIX-minio:/tmp/document.txt"
docker exec "$PREFIX-minio" mc cp /tmp/document.txt local/source/document.txt >/dev/null
# Source objects are read back from MinIO, not only reused from local generation.
docker exec "$PREFIX-minio" mc cat local/source/document.txt > "$WORK/snapshot/objects/document.txt"
docker exec "$PREFIX-source" pg_dump -U operum -d operum --format=custom > "$WORK/snapshot/database.dump"
date -u +%FT%TZ > "$WORK/snapshot/recovery-point.txt"
(cd "$WORK/snapshot" && sha256sum objects/document.txt > objects.sha256)
printf 'validation-only-restic-password-with-entropy\n' > "$WORK/password"
export RESTIC_PASSWORD_FILE="$WORK/password" RESTIC_REPOSITORY="$WORK/repository"
restic init >/dev/null
restic backup "$WORK/snapshot" --tag operum-validation >/dev/null
restic check --read-data >/dev/null
SNAPSHOT=$(restic snapshots --json | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["id"])')
# Simulate losing the source repository and restoring only the independent copy.
cp -a "$WORK/repository" "$WORK/recovery-repository"
rm -rf "$WORK/repository" "$WORK/snapshot"
export RESTIC_REPOSITORY="$WORK/recovery-repository"
bash scripts/backup/restore.sh "$SNAPSHOT" "$WORK/restored"
DUMP=$(find "$WORK/restored" -name database.dump -type f)
ROOT=$(dirname "$DUMP")
docker exec -i "$PREFIX-target" pg_restore --exit-on-error -U operum -d operum < "$DUMP"
RESULT=$(docker exec "$PREFIX-target" psql -U operum -d operum -Atc 'SELECT u.name || '"'"'|'"'"' || p.id || '"'"'|'"'"' || a.object_key FROM users u JOIN projects p ON p.owner_id=u.id JOIN attachments a ON a.project_id=p.id')
[ "$RESULT" = 'Synthetic User|p-1|document.txt' ]
docker exec "$PREFIX-minio" mc mb local/restored >/dev/null
docker cp "$ROOT/objects/document.txt" "$PREFIX-minio:/tmp/restored.txt"
docker exec "$PREFIX-minio" mc cp /tmp/restored.txt local/restored/document.txt >/dev/null
docker exec "$PREFIX-minio" mc cat local/restored/document.txt > "$WORK/restored-object.txt"
cmp "$ROOT/objects/document.txt" "$WORK/restored-object.txt"
printf 'Restored synthetic user/project/attachment integrity; recovery point %s; elapsed %ss.\n' "$(cat "$ROOT/recovery-point.txt")" "$(( $(date +%s)-start ))"
