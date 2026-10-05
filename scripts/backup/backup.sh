#!/usr/bin/env bash
# Operator-only: brief write pause for a consistent DB/object snapshot.
set -euo pipefail
set +x
umask 077
: "${RESTIC_REPOSITORY:?remote encrypted repository required}"
: "${RESTIC_PASSWORD_FILE:?password file required}"
: "${BACKUP_WORKDIR:?private temporary directory required}"
: "${MINIO_BUCKET:?bucket required}"
[[ "$RESTIC_REPOSITORY" =~ ^(s3:|sftp:|rclone:|rest:https://) ]]
[[ "$MINIO_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]]
[[ "$BACKUP_WORKDIR" == /* && "$BACKUP_WORKDIR" != / && "$BACKUP_WORKDIR" != *..* ]]
command -v restic >/dev/null
command -v mc >/dev/null
: "${MC_SOURCE_ALIAS:?preconfigured MinIO alias required}"
[[ "$MC_SOURCE_ALIAS" =~ ^[a-zA-Z0-9_-]+$ ]]
COMPOSE=(docker compose --env-file .env --env-file release.env -f docker-compose.yml -f docker-compose.production.yml)
WRITERS=(app api-gateway auth-service project-service sprint-service notification-service file-service mcp-server)
mkdir -p "$BACKUP_WORKDIR"
SNAPSHOT=$(mktemp -d "$BACKUP_WORKDIR/operum.XXXXXXXX")
paused=false
cleanup() {
  local result=$?
  if $paused; then "${COMPOSE[@]}" start --wait --wait-timeout 300 "${WRITERS[@]}" || result=1; fi
  rm -rf "$SNAPSHOT"
  if [ "$result" -ne 0 ]; then logger -p user.err 'Operum backup failed; investigate immediately'; fi
  exit "$result"
}
trap cleanup EXIT
# Inventory and maintenance window must be completed before enabling a schedule.
paused=true
"${COMPOSE[@]}" stop "${WRITERS[@]}"
"${COMPOSE[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$SNAPSHOT/database.dump"
mc mirror --overwrite "$MC_SOURCE_ALIAS/$MINIO_BUCKET" "$SNAPSHOT/objects"
printf '%s\n' "$(date -u +%FT%TZ)" > "$SNAPSHOT/recovery-point.txt"
cp release.env "$SNAPSHOT/release.env"
(cd "$SNAPSHOT" && find objects -type f -print0 | sort -z | xargs -0 -r sha256sum > objects.sha256)
"${COMPOSE[@]}" start --wait --wait-timeout 300 "${WRITERS[@]}"
paused=false
restic backup "$SNAPSHOT" --tag operum --host operum-vps
restic check
restic forget --tag operum --host operum-vps --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
logger -p user.info 'Operum encrypted off-host backup verified'
