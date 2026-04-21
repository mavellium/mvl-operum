# Dev Notes — Comandos úteis (local / VPS)

## VPS

```bash
# Conectar à VPS
ssh root@187.77.236.241

# Resetar senha do postgres no staging
docker exec staging-postgres-1 psql -U mvluser -d mvloperum -c "ALTER USER mvluser PASSWORD 'M4v3ll1um'"
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
