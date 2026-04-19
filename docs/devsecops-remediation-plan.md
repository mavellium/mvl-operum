# Plano de Remediação DevSecOps — MVL Operum

**Auditoria realizada em:** 2026-04-19  
**Decisão do Enforcer:** 🔴 BLOCKED  
**Branch auditada:** `develop`  
**Total de achados:** 3 Critical · 8 High · 5 Medium · 4 Low

---

## Visão Geral das Fases

| Fase | Escopo | Prazo | Pré-requisito para deploy? |
|------|--------|-------|---------------------------|
| [Fase 1](#fase-1) | Segredos expostos + credenciais | Imediato (hoje) | ✅ Sim |
| [Fase 2](#fase-2) | Auth e autorização da API | 2–3 dias | ✅ Sim |
| [Fase 3](#fase-3) | Infraestrutura e containers | 3–5 dias | ✅ Sim |
| [Fase 4](#fase-4) | CI/CD e pipeline de segurança | 7 dias | ⚠️ Sim (gate de testes) |
| [Fase 5](#fase-5) | Hardening de médio prazo | 30 dias | ❌ Não |

---

## Fase 1 — Segredos Expostos e Credenciais Comprometidas {#fase-1}

> **Urgência: CRÍTICA. Fazer antes de qualquer outra coisa.**  
> Credenciais de banco de dados, tokens e chave RSA privada estão expostos. Tratar como comprometidos independentemente de confirmação.

### 1.1 — Revogar todas as credenciais expostas

- [ ] Rotacionar senha do banco Neon (`npg_WSRQGUaq25bM`) — acessar painel Neon e resetar
- [ ] Revogar token do Vercel Blob (`vercel_blob_rw_EzTxPMZTldvx4PhO_...`) — painel Vercel → Storage → Tokens
- [ ] Rotacionar senha do PostgreSQL de staging (`mvluser:mvlpass` em `187.77.236.241:5435`)
- [ ] Rotacionar senha do PostgreSQL de produção
- [ ] Gerar novo par de chaves RS256 para staging e produção

```bash
# Gerar novo par RS256
openssl genrsa -out /tmp/new-private.pem 4096
openssl rsa -in /tmp/new-private.pem -pubout -out /tmp/new-public.pem
# Copiar conteúdo para VPS .env e GitHub Secrets — NUNCA commitar os arquivos
```

### 1.2 — Remover arquivos sensíveis do repositório

- [ ] Deletar `private.pem` do disco e reescrever histórico git

```bash
# Remover da árvore e do histórico
git filter-repo --path private.pem --invert-paths
git filter-repo --path .env --invert-paths   # se .env já foi commitado alguma vez
git push --force-with-lease origin develop main
```

- [ ] Verificar se `.env` está no histórico: `git log --all --full-history -- .env`
- [ ] Confirmar que `.env`, `*.pem`, `*.key` estão no `.gitignore`
- [ ] Adicionar `.next/standalone/.env` ao `.dockerignore`

### 1.3 — Remover secret hardcoded no código

**Arquivo:** [lib/session.ts:9-11](lib/session.ts#L9)

```typescript
// ❌ ANTES
const HS256_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'kanban-dev-secret-key-change-in-production-32c',
)

// ✅ DEPOIS
if (!process.env.SESSION_SECRET && !process.env.JWT_PRIVATE_KEY) {
  throw new Error(
    'FATAL: Neither SESSION_SECRET nor JWT_PRIVATE_KEY is set.',
  )
}
const HS256_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET ?? '')
```

### 1.4 — Incrementar tokenVersion de todos os usuários

Após rotacionar as chaves, invalidar todas as sessões ativas:

```sql
UPDATE "User" SET "tokenVersion" = "tokenVersion" + 1;
```

---

## Fase 2 — Autenticação e Autorização da API {#fase-2}

> **Urgência: CRÍTICA/ALTA. Exploração ativa possível em produção.**

### 2.1 — Adicionar autenticação ao notification-service (C-3)

**Arquivo:** `notification-service/src/notification/notification.controller.ts`

O serviço está exposto sem qualquer autenticação. Qualquer container na rede Docker pode criar, ler ou deletar notificações de qualquer usuário.

- [ ] Criar um `InternalAuthGuard` que valida header `X-Internal-Api-Key`
- [ ] Gerar secret aleatório: `openssl rand -hex 32` → salvar em `.env` como `INTERNAL_API_KEY`
- [ ] Aplicar guard globalmente em `notification-service/src/main.ts`
- [ ] Atualizar o monolito para enviar o header nas chamadas HTTP ao serviço

```typescript
// notification-service/src/guards/internal-auth.guard.ts
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    return req.headers['x-internal-api-key'] === process.env.INTERNAL_API_KEY
  }
}
```

### 2.2 — Corrigir vazamento de dados entre tenants na busca (H-5)

**Arquivo:** [app/api/search/route.ts:18](app/api/search/route.ts#L18)

```typescript
// ❌ ANTES — sem escopo de tenant
const cards = await prisma.card.findMany({
  where: {
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      ...
    ],
  },
})

// ✅ DEPOIS — escopo obrigatório pelo tenant da sessão
const cards = await prisma.card.findMany({
  where: {
    sprint: { project: { tenantId: session.tenantId as string } },
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      ...
    ],
  },
})
```

### 2.3 — Adicionar autorização no upload de arquivos (H-6)

**Arquivo:** [app/api/uploads/route.ts](app/api/uploads/route.ts)

- [ ] Antes de aceitar o upload, verificar que o `cardId` pertence ao tenant da sessão autenticada

```typescript
// Inserir após validação do cardId:
const card = await prisma.card.findUnique({
  where: { id: cardId },
  select: { sprint: { select: { project: { select: { tenantId: true } } } } },
})
if (!card || card.sprint.project.tenantId !== session.tenantId) {
  return Response.json({ error: 'Acesso negado' }, { status: 403 })
}
```

### 2.4 — Corrigir geração de código de reset de senha (H-3 + H-4)

**Arquivo:** [app/actions/auth.ts:95-121](app/actions/auth.ts#L95)

```typescript
// ❌ ANTES
import { randomInt } from 'crypto'  // não importado

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
// ...
console.info(`[DEV] Reset code for ${email}: ${code}`)  // vaza em produção

// ✅ DEPOIS
import { randomInt } from 'crypto'

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[randomInt(0, chars.length)]).join('')
}
// ...
if (process.env.NODE_ENV !== 'production') {
  console.info(`[DEV] Reset code for ${email}: ${code}`)
}
```

### 2.5 — Adicionar lockout de login (H-2)

**Arquivo:** [services/authService.ts:54-71](services/authService.ts#L54)

- [ ] Adicionar verificação do contador `loginAttempts` antes do `bcrypt.compare`
- [ ] Bloquear conta após 10 tentativas (`isActive: false`)
- [ ] Admin pode desbloquear via painel `/admin/users`

```typescript
const MAX_LOGIN_ATTEMPTS = 10
if ((user.loginAttempts ?? 0) >= MAX_LOGIN_ATTEMPTS) {
  throw new AuthError('Conta bloqueada por excesso de tentativas. Contate o suporte.')
}
```

### 2.6 — Aplicar verificação de tokenVersion nas rotas de API (L-4)

**Arquivos:** [app/api/csv/route.ts](app/api/csv/route.ts) · [app/api/search/route.ts](app/api/search/route.ts)

Ambas as rotas usam `decrypt()` diretamente, pulando a verificação de `tokenVersion`. Criar utilitário compartilhado para Route Handlers:

```typescript
// lib/routeAuth.ts
export async function verifyRouteSession(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionToken = cookieHeader.match(/session=([^;]+)/)?.[1]
  const session = await decrypt(sessionToken)
  if (!session?.userId) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { tokenVersion: true, isActive: true, deletedAt: true },
  })
  if (
    !dbUser ||
    dbUser.deletedAt !== null ||
    !dbUser.isActive ||
    (session.tokenVersion !== undefined && dbUser.tokenVersion !== session.tokenVersion)
  ) return null

  return session
}
```

---

## Fase 3 — Infraestrutura e Containers {#fase-3}

> **Urgência: ALTA. Alguns itens são exploráveis por containers comprometidos.**

### 3.1 — Remover Docker socket direto do Traefik (IaC HIGH)

**Arquivo:** [docker-compose.traefik.yml](docker-compose.traefik.yml)

```yaml
# ❌ ANTES
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro

# ✅ DEPOIS — usar socket proxy
services:
  socket-proxy:
    image: tecnativa/docker-socket-proxy:latest
    environment:
      CONTAINERS: 1
      NETWORKS: 1
      SERVICES: 1
      TASKS: 1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket-proxy

  traefik:
    environment:
      - DOCKER_HOST=tcp://socket-proxy:2375
    # remover volumes do socket
```

### 3.2 — Remover containers rodando como root (IaC CRITICAL)

- [ ] `docker-compose.yml` — serviço `migrate`: remover `user: "0"`, usar usuário não-root
- [ ] `docker-compose.production.yml` — Prometheus, Loki, Grafana: adicionar `user: "65534:65534"` (nobody)
- [ ] Adicionar `security_opt: [no-new-privileges:true]` a todos os serviços

```yaml
# Adicionar a cada serviço em docker-compose.yml e overrides:
security_opt:
  - no-new-privileges:true
```

### 3.3 — Restringir portas expostas

**Arquivo:** [docker-compose.staging.yml:37](docker-compose.staging.yml#L37)

```yaml
# ❌ ANTES
ports:
  - "5435:5432"   # exposto em 0.0.0.0 — qualquer IP pode conectar

# ✅ DEPOIS (se realmente necessário em staging)
ports:
  - "127.0.0.1:5435:5432"   # só acessível via SSH tunnel
```

- [ ] Remover exposição do PostgreSQL em produção (não deve ter `ports:` algum)
- [ ] Restringir console MinIO: `127.0.0.1:9001:9001`

### 3.4 — Adicionar senha ao Redis

- [ ] Gerar: `openssl rand -hex 32` → salvar como `REDIS_PASSWORD` no `.env`
- [ ] Atualizar `docker-compose.yml`: `command: redis-server --requirepass ${REDIS_PASSWORD} ...`
- [ ] Atualizar `REDIS_HOST`/`REDIS_URL` no monolito e no notification-service para incluir senha

### 3.5 — Corrigir permissões de arquivo no deploy (H-8)

**Arquivo:** `.github/workflows/deploy-staging.yml:110` · `deploy-production.yml:128`

```bash
# ❌ ANTES
chmod 644 .env   # world-readable

# ✅ DEPOIS
chmod 600 .env   # só o owner lê
```

### 3.6 — Fixar imagem do MinIO e adicionar healthchecks

```yaml
# docker-compose.yml
minio:
  image: minio/minio:RELEASE.2025-04-08T15-41-24Z   # pinnar versão específica

app:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3

notification-service:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:4004/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 3.7 — Substituir hash placeholder do Traefik dashboard (M-4)

**Arquivo:** [traefik/dynamic/middlewares.yml:28](traefik/dynamic/middlewares.yml#L28)

```bash
# Gerar hash real (rodar localmente, não commitar o resultado)
htpasswd -nb admin $(openssl rand -base64 24)
# Salvar output como TRAEFIK_DASHBOARD_AUTH no .env do VPS
```

```yaml
# Referenciar variável de ambiente em vez de hardcodar:
- "traefik.http.middlewares.dashboard-auth.basicauth.users=${TRAEFIK_DASHBOARD_AUTH}"
```

---

## Fase 4 — CI/CD e Pipeline de Segurança {#fase-4}

> **Urgência: ALTA. Sem gates de segurança, código comprometido pode chegar à produção sem barreira.**

### 4.1 — Fazer o job de testes realmente rodar testes (H-7)

**Arquivo:** `.github/workflows/deploy-staging.yml` · `deploy-production.yml`

```yaml
# ❌ ANTES
- name: Install dependencies
  run: pnpm install

# ✅ DEPOIS
- name: Install dependencies
  run: pnpm install

- name: Lint
  run: pnpm lint

- name: Run tests
  run: pnpm test:run

- name: Dependency audit
  run: pnpm audit --audit-level=high
```

### 4.2 — Remover DATABASE_URL dos logs do CI (L-2)

**Arquivo:** Ambos os workflows

```bash
# ❌ ANTES
cat .env | grep DATABASE_URL || (echo "❌ DATABASE_URL missing" && exit 1)

# ✅ DEPOIS
grep -q "^DATABASE_URL=" .env || (echo "❌ DATABASE_URL missing" && exit 1)
```

### 4.3 — Adicionar scan de secrets no CI (C-1, C-2)

```yaml
- name: Scan for secrets
  uses: trufflesecurity/trufflehog-actions-scan@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
```

### 4.4 — Adicionar SAST com CodeQL

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript-typescript

- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

### 4.5 — Adicionar DAST contra staging (após deploy)

```yaml
- name: DAST — OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: 'https://staging.operum.mavellium.com.br'
    fail_action: true
```

### 4.6 — Adicionar scan de imagens Docker com Trivy

```yaml
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE_NAME }}:${{ env.IMAGE_TAG }}
    format: 'table'
    exit-code: '1'
    severity: 'CRITICAL,HIGH'
```

---

## Fase 5 — Hardening de Médio Prazo {#fase-5}

> **Prazo: 30 dias. Não bloqueia deploy mas aumenta postura de segurança.**

### 5.1 — Content Security Policy (M-1)

**Arquivo:** [next.config.ts](next.config.ts)

```typescript
headers: async () => [{
  source: '/(.*)',
  headers: [
    {
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self'; img-src 'self' data: https://*.mavellium.com.br; connect-src 'self'",
    },
  ],
}],
```

### 5.2 — Rate limiting no reset de senha (M-3)

**Arquivo:** [app/actions/auth.ts](app/actions/auth.ts)

Server Actions não passam pelo middleware do Traefik. Implementar controle com Redis:

```typescript
// Antes de gerar o código:
const key = `reset_rate:${email}`
const attempts = await redis.incr(key)
await redis.expire(key, 900) // 15 minutos
if (attempts > 3) {
  throw new Error('Muitas tentativas. Aguarde 15 minutos.')
}
```

### 5.3 — Padronizar bcrypt cost para 12 (M-5)

**Arquivos:** [services/authService.ts](services/authService.ts) · [services/adminService.ts](services/adminService.ts)

```typescript
// lib/crypto.ts
export const BCRYPT_ROUNDS = 12
```

Substituir todos os `bcrypt.hash(password, 10)` por `bcrypt.hash(password, BCRYPT_ROUNDS)`.

### 5.4 — Remover senha hardcoded do seed (M-2)

**Arquivo:** [prisma/seed.ts:24](prisma/seed.ts#L24)

```typescript
// ❌ ANTES
const password = 'senha123'

// ✅ DEPOIS
const password = process.env.SEED_ADMIN_PASSWORD
  ?? (() => { throw new Error('SEED_ADMIN_PASSWORD required') })()
```

### 5.5 — Trocar email pessoal do ACME (L-3)

**Arquivo:** [traefik/traefik.yml](traefik/traefik.yml)

Substituir `tegbe.projetoia@gmail.com` por alias da organização (ex: `ops@mavellium.com.br`) configurado como variável de ambiente.

### 5.6 — Implementar envio real de email no reset de senha

Atualmente o código de reset só é logado em dev e não é entregue ao usuário em produção. Integrar provedor transacional (Resend, SendGrid, SES) e hashear o código no banco antes de armazenar.

---

## Checklist de Re-Auditoria Antes do Próximo Deploy

Após concluir as Fases 1–3, re-executar:

```
rode o fluxo DevSecOps completo
```

O Enforcer deve emitir **APPROVED** com estes controles passando:

- [ ] Nenhum `private.pem` ou `.env` no repositório ou histórico git
- [ ] notification-service retorna 401 sem `X-Internal-Api-Key`
- [ ] `GET /api/search?q=teste` não retorna cards de outros tenants
- [ ] Upload para `cardId` de outro tenant retorna 403
- [ ] `lib/session.ts` sem fallback hardcoded
- [ ] CI executa `pnpm test:run` e falha o build em erro
- [ ] `.env` com `chmod 600` no VPS
- [ ] PostgreSQL sem porta exposta em produção
- [ ] Redis com `--requirepass`
- [ ] Nenhum container rodando como root

---

*Documento gerado automaticamente pela auditoria DevSecOps em 2026-04-19.*  
*Próxima re-auditoria agendada: após conclusão da Fase 3.*
