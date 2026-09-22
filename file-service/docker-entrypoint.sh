#!/bin/sh
# ──────────────────────────────────────────────────────────────────────────────
# file-service entrypoint
#
# Aplica `prisma migrate deploy` antes de subir a aplicação (fail-fast).
#
# Contexto: o deploy de producao e acionado por webhook e roda apenas
# `docker compose ... up -d` — os servicos de migracao do compose sao
# agrupados no profile `migration` e NUNCA executam no deploy normal.
# Com o entrypoint, a proxima imagem do file-service aplica migrations
# pendentes (ex.: 20260814000000_fix_attachment_schema, que move a tabela
# "Attachment" de public para o schema files) no startup de qualquer ambiente,
# independentemente de como o container for iniciado.
#
# O servico one-shot `migrate-file-service` (command: prisma migrate deploy)
# tambem continua funcionando: quando invocado como `prisma migrate ...`,
# o entrypoint apenas repassa os argumentos, sem rodar duas vezes.
# ──────────────────────────────────────────────────────────────────────────────
set -e

if [ "$1" = "prisma" ] && [ "$2" = "migrate" ]; then
  # Invocado como servico standalone de migracao (compose migrate-file-service)
  exec "$@"
fi

echo "[entrypoint] Aplicando migrations do Prisma..."
prisma migrate deploy
exec "$@"