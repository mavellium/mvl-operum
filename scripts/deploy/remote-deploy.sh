#!/usr/bin/env bash
# Token via stdin. Release manifest is generated only after all image scans.
set -euo pipefail
set +x
umask 077
DEPLOY_PATH=${1:?deploy_path obrigatório}
SHA=${2:?sha obrigatório}
GHCR_USER=${3:?ghcr_user obrigatório}
[[ "$DEPLOY_PATH" == /* && "$DEPLOY_PATH" != / && "$DEPLOY_PATH" != *..* && -d "$DEPLOY_PATH" && ! -L "$DEPLOY_PATH" ]]
[[ "$SHA" =~ ^[a-f0-9]{40}$ ]]
[[ "$GHCR_USER" =~ ^[A-Za-z0-9][A-Za-z0-9-]{0,38}(\[bot\])?$ ]]
cd "$DEPLOY_PATH"
exec 9>.deploy.lock
flock -n 9 || { echo 'Outra implantação está em execução'; exit 1; }
INCOMING="$DEPLOY_PATH/.deploy-incoming/$SHA"
# Never source a manifest: validate its complete allowlist before Compose reads it.
python3 - "$INCOMING/release.env" "$SHA" <<'PY'
import re, sys
lines=open(sys.argv[1]).read().splitlines()
values={}
for line in lines:
 key,sep,value=line.partition('=')
 if not sep or key in values: raise SystemExit('Invalid release manifest')
 values[key]=value
services=['APP','API_GATEWAY','AUTH_SERVICE','FILE_SERVICE','NOTIFICATION_SERVICE','PROJECT_SERVICE','SPRINT_SERVICE','MCP_SERVER']
assert set(values)=={'RELEASE_SHA','ROLLBACK_COMPATIBLE'}|{s+'_IMAGE' for s in services}
assert values['RELEASE_SHA']==sys.argv[2]
assert values['ROLLBACK_COMPATIBLE'] in ('true','false')
for service in services:
 assert re.fullmatch(r'ghcr\.io/[a-z0-9-]+/'+service.lower().replace('_','-')+r'@sha256:[a-f0-9]{64}',values[service+'_IMAGE'])
PY
[ -f .env ]
# A failed attempt must never reserve the SHA or overwrite an earlier snapshot.
mkdir -p "$DEPLOY_PATH/.releases"
RELEASE_DIR=$(mktemp -d "$DEPLOY_PATH/.releases/$SHA.XXXXXXXX")
[ ! -f .current-release-record ] || cp -p .current-release-record "$RELEASE_DIR/previous-release-record"
for f in docker-compose.yml docker-compose.production.yml release.env; do
  [ ! -f "$f" ] || cp -p "$f" "$RELEASE_DIR/previous-$f"
  cp "$INCOMING/$f" "$RELEASE_DIR/$f"
done
[ ! -d observability ] || cp -a observability "$RELEASE_DIR/previous-observability"
cp -a "$INCOMING/observability" "$RELEASE_DIR/observability"
cp "$INCOMING/replace-observability.py" "$RELEASE_DIR/replace-observability.py"
restore_config() {
  for f in docker-compose.yml docker-compose.production.yml release.env; do
    [ ! -f "$RELEASE_DIR/previous-$f" ] || cp "$RELEASE_DIR/previous-$f" "$f"
  done
  if [ -d "$RELEASE_DIR/previous-observability" ]; then
    python3 "$RELEASE_DIR/replace-observability.py" "$RELEASE_DIR/previous-observability" "$DEPLOY_PATH" "$RELEASE_DIR"
  fi
}
for f in docker-compose.yml docker-compose.production.yml release.env; do cp "$RELEASE_DIR/$f" "$f"; done
python3 "$RELEASE_DIR/replace-observability.py" "$RELEASE_DIR/observability" "$DEPLOY_PATH" "$RELEASE_DIR"
COMPOSE=(docker compose --env-file .env --env-file release.env -f docker-compose.yml -f docker-compose.production.yml)
if ! "${COMPOSE[@]}" config -q; then restore_config; exit 1; fi
if ! "${COMPOSE[@]}" config --format json | python3 "$INCOMING/configure-observability.py"; then restore_config; exit 1; fi
APP_SERVICES=(app api-gateway auth-service file-service notification-service project-service sprint-service mcp-server)
TMP_DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf "$TMP_DOCKER_CONFIG"' EXIT
PLUGINS_DIR="${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins"
if [ -d "$PLUGINS_DIR" ] && [ ! -L "$PLUGINS_DIR" ] && [ -O "$PLUGINS_DIR" ]; then
  ln -s "$PLUGINS_DIR" "$TMP_DOCKER_CONFIG/cli-plugins"
fi
if ! DOCKER_CONFIG="$TMP_DOCKER_CONFIG" docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null; then restore_config; exit 1; fi
if ! DOCKER_CONFIG="$TMP_DOCKER_CONFIG" "${COMPOSE[@]}" pull --quiet "${APP_SERVICES[@]}"; then restore_config; exit 1; fi
while IFS='=' read -r key image; do
  if [[ "$key" == *_IMAGE ]]; then
    revision=$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image")
    if [ "$revision" != "$SHA" ]; then echo 'Imagem não corresponde ao SHA aprovado'; restore_config; exit 1; fi
  fi
done < release.env
# expand/contract only: never undo schema automatically.
if ! "${COMPOSE[@]}" --profile migration run --rm migrate; then restore_config; exit 1; fi
rollout() {
  "${COMPOSE[@]}" up -d --wait --wait-timeout 300 &&
    "${COMPOSE[@]}" up -d --force-recreate --no-deps --wait --wait-timeout 300 prometheus grafana alloy docker-log-proxy alertmanager
}
# Directory replacement changes bind-mounted inodes. Recreate their consumers.
if ! rollout; then
  echo 'Release sem prontidão; rollback requer compatibilidade de schema declarada.'
  if grep -qx 'ROLLBACK_COMPATIBLE=true' release.env && [ -f "$RELEASE_DIR/previous-release.env" ]; then
    restore_config
    rollout
    echo "Rollback confirmado; implantação $SHA falhou."
  fi
  exit 1
fi
printf '%s\n' "${RELEASE_DIR##*/}" > .current-release-record
printf '%s\n' "$SHA" > .current-release
cp "$INCOMING/rollback.sh" scripts-rollback.sh
cp "$RELEASE_DIR/replace-observability.py" replace-observability.py
"${COMPOSE[@]}" ps
rm -rf "$INCOMING"
echo "Release imutável $SHA pronta."
