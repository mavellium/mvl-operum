#!/usr/bin/env bash
# Deploy de produção — executado NA VPS pelo job `deploy` de
# .github/workflows/deploy-production.yml (via SSH).
#
# Uso: printf '%s' "$GHCR_TOKEN" | remote-deploy.sh <deploy_path> <sha> <ghcr_user>
#
# 1. Sincroniza os docker-compose*.yml do repositório (enviados para
#    <deploy_path>/.deploy-incoming/), com backup e validação.
# 2. Baixa as imagens :prod da aplicação usando uma credencial temporária do
#    GHCR (não sobrescreve a credencial Docker que já existe no servidor).
# 3. Aplica as migrations do app (serviço one-shot `migrate`).
# 4. Sobe os serviços e espera todos ficarem saudáveis.
#
# Migrations: as do auth-service/file-service rodam no entrypoint dos
# containers; as do app (schema public) rodam aqui, no serviço one-shot
# `migrate`, antes de trocar os containers. Sem isso, migrations novas do app
# nunca chegavam à produção (ex.: EapDocument/EapTemplate, set/2026).
set -euo pipefail
set +x          # nunca ecoar comandos (o token chega por stdin)
umask 077       # arquivos temporários (credencial do GHCR) só legíveis pelo dono

DEPLOY_PATH=${1:?deploy_path obrigatório}
SHA=${2:?sha obrigatório}
GHCR_USER=${3:?ghcr_user obrigatório}

# Os argumentos vêm do workflow, mas são validados antes de qualquer rm/cp.
case "$DEPLOY_PATH" in
  /*) ;;
  *) echo "::error::deploy_path precisa ser absoluto"; exit 1 ;;
esac
if [[ "$DEPLOY_PATH" == *".."* || "$DEPLOY_PATH" == "/" ]]; then
  echo "::error::deploy_path inválido"; exit 1
fi
[ -d "$DEPLOY_PATH" ] && [ ! -L "$DEPLOY_PATH" ] || { echo "::error::deploy_path não é um diretório"; exit 1; }
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "::error::sha inválido"; exit 1; }
[[ "$GHCR_USER" =~ ^[A-Za-z0-9][A-Za-z0-9-]{0,38}(\[bot\])?$ ]] || { echo "::error::ghcr_user inválido"; exit 1; }

INCOMING="$DEPLOY_PATH/.deploy-incoming"
BACKUP_ROOT="$DEPLOY_PATH/.deploy-backup"
BACKUP="$BACKUP_ROOT/$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:7}"
KEEP_BACKUPS=10
FILES=(docker-compose.yml docker-compose.production.yml)
# Só as imagens da aplicação: um `pull` geral atualizaria tags flutuantes de
# terceiros (ex.: postgres:17-alpine) e reiniciaria o banco sem querer.
APP_SERVICES=(app api-gateway auth-service file-service notification-service project-service sprint-service mcp-server)
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.production.yml)

cd "$DEPLOY_PATH"
[ -f .env ] || { echo "::error::.env não encontrado em $DEPLOY_PATH"; exit 1; }
for f in "${FILES[@]}"; do
  [ -f "$INCOMING/$f" ] || { echo "::error::$INCOMING/$f não foi enviado"; exit 1; }
done

# ── 1. Compose files: backup, troca e validação ──────────────────────────────
mkdir -p "$BACKUP"
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then cp -p "$f" "$BACKUP/"; fi
done
restore_compose() {
  for f in "${FILES[@]}"; do
    if [ -f "$BACKUP/$f" ]; then cp -p "$BACKUP/$f" "$f"; fi
  done
}
for f in "${FILES[@]}"; do cp "$INCOMING/$f" "$f"; done

if ! "${COMPOSE[@]}" config -q; then
  echo "::error::docker compose config inválido — arquivos anteriores restaurados"
  restore_compose
  exit 1
fi
echo "Compose sincronizado (backup em $BACKUP)"

# ── 2. Pull com credencial temporária ────────────────────────────────────────
TMP_DOCKER_CONFIG=$(mktemp -d)
cleanup() { rm -rf "$TMP_DOCKER_CONFIG"; }
trap cleanup EXIT INT TERM
# Mantém os plugins do Docker (ex.: compose instalado em ~/.docker/cli-plugins),
# só se for um diretório real do usuário — nunca segue symlink.
PLUGINS_DIR="${DOCKER_CONFIG:-$HOME/.docker}/cli-plugins"
if [ -d "$PLUGINS_DIR" ] && [ ! -L "$PLUGINS_DIR" ] && [ -O "$PLUGINS_DIR" ]; then
  ln -s "$PLUGINS_DIR" "$TMP_DOCKER_CONFIG/cli-plugins"
fi
DOCKER_CONFIG="$TMP_DOCKER_CONFIG" docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
DOCKER_CONFIG="$TMP_DOCKER_CONFIG" "${COMPOSE[@]}" pull --quiet "${APP_SERVICES[@]}"
cleanup

# ── 3. Migrations do app ─────────────────────────────────────────────────────
# Roda antes do `up -d`: se falhar, os containers em execução continuam os
# mesmos (versão anterior) e o deploy aborta.
echo "Aplicando migrations do app (prisma migrate deploy)"
if ! "${COMPOSE[@]}" --profile migration run --rm migrate; then
  echo "::error::prisma migrate deploy falhou — deploy abortado, serviços não foram trocados"
  exit 1
fi

# ── 4. Subida e espera por health ────────────────────────────────────────────
if ! "${COMPOSE[@]}" up -d --wait --wait-timeout 300; then
  echo "::error::serviços não ficaram saudáveis em 300s"
  "${COMPOSE[@]}" ps
  for s in "${APP_SERVICES[@]}"; do
    echo "── logs: $s"
    "${COMPOSE[@]}" logs --no-color --tail 40 "$s" || true
  done
  echo "Compose anterior em $BACKUP. Para voltar a imagem de um serviço, re-tagueie ghcr.io/<owner>/<serviço>:<sha anterior> como :prod e rode o deploy de novo."
  exit 1
fi

"${COMPOSE[@]}" ps
rm -rf "$INCOMING"
# Mantém só os backups mais recentes.
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -print0 | sort -rz | tail -z -n +$((KEEP_BACKUPS + 1)) | xargs -0 -r rm -rf --
docker image prune -f >/dev/null || true
echo "Deploy ${SHA:0:7} concluído."
