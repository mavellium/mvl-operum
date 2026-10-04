# Dev Notes — Comandos úteis (local / VPS)

## VPS

```bash
# Conectar à VPS
ssh root@187.77.236.241

# Resetar senha do postgres no staging
# Alterar a senha interativamente no psql com \password; não guardar credenciais nas notas.
```

## Docker

```bash
# Local dev — sobe apenas infra (postgres, redis, minio) via overlay de dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis minio

# Ver status / logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f postgres

# Derrubar tudo (mantém volumes)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Derrubar tudo e apagar volumes (reset total do banco local)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Staging (na VPS)
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
docker compose -f docker-compose.yml -f docker-compose.staging.yml ps
docker compose -f docker-compose.yml -f docker-compose.staging.yml logs -f app

# Production (na VPS)
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Rodar migrations manualmente (profile "migration")
docker compose -f docker-compose.yml -f docker-compose.staging.yml --profile migration run --rm migrate

# Entrar num container em execução
docker exec -it staging-postgres-1 bash
docker exec -it staging-auth-service-1 sh
```

## Migrations (local — PowerShell)

```powershell
# Auth service
cd C:\temp\ClaudeCode\mvl-operum\auth-service
$env:DATABASE_URL="postgresql://mvluser:M4v3ll1um@localhost:5435/mvloperum?schema=public"
pnpm prisma migrate dev --name init

# File service
cd C:\temp\ClaudeCode\mvl-operum\file-service
$env:DATABASE_URL="postgresql://mvluser:M4v3ll1um@localhost:5435/mvloperum?schema=public"
pnpm prisma migrate dev --name init
```

## Auth service (WSL)

O caminho correto no bash WSL usa `/mnt/c/`:

```bash
cd /mnt/c/temp/ClaudeCode/mvl-operum/auth-service
pnpm start:dev
```

Ou direto no PowerShell/CMD:

```powershell
cd C:\temp\ClaudeCode\mvl-operum\auth-service
pnpm start:dev
```

Verificar se está no ar:
```bash
curl http://localhost:4001/health
```
