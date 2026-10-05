#!/usr/bin/env bash
# Usage: bash scripts-rollback.sh /absolute/deploy/path
set -euo pipefail
set +x
umask 077
DEPLOY_PATH=${1:?deploy_path obrigatório}
[[ "$DEPLOY_PATH" == /* && "$DEPLOY_PATH" != / && "$DEPLOY_PATH" != *..* && -d "$DEPLOY_PATH" && ! -L "$DEPLOY_PATH" ]]
cd "$DEPLOY_PATH"
exec 9>.deploy.lock
flock -n 9 || { echo 'Outra implantação está em execução'; exit 1; }
SHA=$(cat .current-release)
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]]
# Legacy deployments recorded only the SHA. New deployments identify the attempt.
DIR=".releases/$SHA"
if [ -f .current-release-record ]; then
  RECORD=$(cat .current-release-record)
  [[ "$RECORD" =~ ^${SHA}\.[A-Za-z0-9]{8}$ ]] || { echo 'Registro de release inválido'; exit 1; }
  DIR=".releases/$RECORD"
fi
[ -d "$DIR" ] && [ ! -L "$DIR" ]
grep -qx 'ROLLBACK_COMPATIBLE=true' release.env || { echo 'Rollback bloqueado: compatibilidade de schema não declarada'; exit 1; }
[ -f "$DIR/previous-release.env" ]
# Database contents/migrations are preserved. Restore exact previous digests.
for f in docker-compose.yml docker-compose.production.yml release.env; do cp "$DIR/previous-$f" "$f"; done
if [ -d "$DIR/previous-observability" ]; then
  rm -rf observability
  cp -a "$DIR/previous-observability" observability
fi
COMPOSE=(docker compose --env-file .env --env-file release.env -f docker-compose.yml -f docker-compose.production.yml)
"${COMPOSE[@]}" config -q
"${COMPOSE[@]}" up -d --wait --wait-timeout 300
if [ -f "$DIR/previous-release-record" ]; then
  cp "$DIR/previous-release-record" .current-release-record
else
  rm -f .current-release-record
fi
sed -n 's/^RELEASE_SHA=//p' release.env > .current-release
printf 'Rollback confirmado: %s\n' "$(cat .current-release)"
