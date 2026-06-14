> Especificação técnica completa do sistema de autenticação — cobre fluxos de produto, implementação, arquitetura e decisões de design.

---

## 🗺️ Visão Geral

O sistema de autenticação **não usa NextAuth**. É uma solução customizada baseada em JWT RS256, bcrypt e Redis, distribuída em três camadas:

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Frontend | Next.js Server Actions | Formulários, cookie de sessão, redirecionamentos |
| API Gateway | Express (middleware) | Verificação do JWT, injeção de headers de contexto |
| Auth-Service | NestJS | Lógica de autenticação, usuários, senhas, Redis |

**Stack de segurança**: JWT RS256 (prod) / HS256 (dev/legado), bcrypt 12 rounds, cookie `httpOnly SameSite=strict`, revogação de sessão via JTI no Redis, tokenVersion para invalidação em massa.

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                   │
│  LoginForm → loginAction → authServiceLogin()        │
│  Cookie httpOnly "session" (JWT RS256 ou HS256)      │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP + Bearer Token
┌────────────────────┴─────────────────────────────────┐
│ API Gateway (Express)                                │
│  middleware/auth.ts                                  │
│  • Verifica JWT (RS256 → fallback HS256)             │
│  • Consulta Redis: jti revogado?                     │
│  • Injeta headers: x-user-id, x-tenant-id, x-role   │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP interno + x-internal-api-key
┌────────────────────┴─────────────────────────────────┐
│ Auth-Service (NestJS)                                │
│  AuthController → AuthService → JwtService           │
│  • bcrypt verify/hash                                │
│  • Redis: armazena jti → payload (7 dias)            │
│  • Zod: valida todos os DTOs                         │
└────────────────────┬─────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────┴─────────────────────────────────┐
│ PostgreSQL                                           │
│  User (passwordHash, tokenVersion, loginAttempts…)   │
│  Tenant (isolamento multi-tenant)                    │
└──────────────────────────────────────────────────────┘
                     │
                  Redis
          (sessões jti + rate limiting)
```

**Arquivos principais**:
- `app/actions/auth.ts` — Server Actions do Next.js
- `lib/session.ts` — encrypt/decrypt JWT (jose)
- `lib/dal.ts` — `verifySession()` usada em Server Components
- `lib/authClient.ts` — chamadas HTTP ao auth-service
- `auth-service/src/auth/auth.controller.ts` — rotas NestJS
- `auth-service/src/auth/auth.service.ts` — lógica de negócio
- `auth-service/src/auth/jwt.service.ts` — signing/verify RS256
- `api-gateway/src/middleware/auth.ts` — middleware de verificação

---

## 🔄 Fluxos

### 1. Login bem-sucedido

1. [[Usuário]] preenche email + senha em `LoginForm`
2. `loginAction` verifica rate limit por IP (Redis): máx 10 tentativas / 15 min
3. `authServiceLogin()` faz `POST /auth/login` com `{ email, password, subdomain }`
4. Auth-service busca `User` pelo email dentro do [[Tenant]] (subdomínio)
5. Compara senha com `passwordHash` (bcrypt 12 rounds)
6. Sucesso: incrementa `lastLogin`, reseta `loginAttempts`, gera JWT RS256 com JTI único
7. Armazena `jti → payload` no Redis (TTL 7 dias)
8. Retorna `{ token, user, forcePasswordChange }`
9. Next.js seta cookie `session` (httpOnly, SameSite=strict, 7 dias)
10. Redirecionamento:
    - `forcePasswordChange = true` → `/alterar-senha`
    - admin → `/projetos`
    - 1 projeto → `/projetos/{id}/dashboard`
    - 0 projetos → `/no-project`
    - N projetos → `/projetos`

### 2. Login inválido / bloqueio

- Credenciais incorretas: mensagem genérica ("Email ou senha inválidos")
- `loginAttempts` incrementado a cada falha
- Rate limit por IP (Redis): acima de 10 tentativas em 15 min → erro 429 antes de chegar ao auth-service
- Bloqueio de conta: após 10 tentativas, conta bloqueada (`isActive = false` ou `status = 'bloqueado'`) — requer intervenção de suporte
- Sistema não diferencia "email não existe" de "senha incorreta" (proteção contra enumeração)

### 3. Logout

1. `logoutAction` lê o cookie `session`
2. `authServiceLogout(token)` faz `POST /auth/logout` com `Bearer {token}`
3. Auth-service extrai JTI do token e remove a chave do Redis
4. Cookie `session` é deletado
5. Redirecionamento para `/login`

### 4. Recuperação de senha (3 etapas)

**Etapa 1 — Solicitar código** (`requestPasswordResetAction`):
- Rate limit: máx 3 requests por email / 15 min
- `POST /auth/password/request-reset` com `{ email, subdomain }`
- Auth-service gera código de 8 chars alfanuméricos (charset sem caracteres ambíguos)
- Armazena `SHA256(código)` em `resetToken`, expira em 15 minutos (`resetTokenExpiry`)
- Resposta sempre bem-sucedida (não revela se email existe)

**Etapa 2 — Validar código** (`validateResetCodeAction`):
- `POST /auth/password/validate-code` com `{ email, code, subdomain }`
- Auth-service compara `SHA256(code)` com `resetToken` e verifica `resetTokenExpiry`
- Em caso de erro: "Código inválido ou expirado"

**Etapa 3 — Redefinir senha** (`resetPasswordAction`):
- Valida `PasswordSchema` (Zod): mín 8 chars, 1 número, 1 caractere especial
- `POST /auth/password/reset` com `{ email, code, newPassword, subdomain }`
- Auth-service re-valida código, hasheia nova senha, limpa `resetToken/resetTokenExpiry`
- Incrementa `tokenVersion` → invalida todas as sessões anteriores

### 5. Troca de senha forçada (admin-initiated)

1. Admin seta `forcePasswordChange = true` no [[Usuário]]
2. No próximo login, flag é retornada na resposta
3. `loginAction` redireciona para `/alterar-senha` (cookie já está setado)
4. [[Usuário]] submete nova senha via `POST /auth/password/alterar`
5. Auth-service valida, hasheia, reseta `forcePasswordChange = false`
6. Incrementa `tokenVersion` → invalida sessão atual
7. Cookie deletado — [[Usuário]] é forçado a fazer login novamente

---

## 🌐 Multi-Tenant

- Subdomínio identifica o [[Tenant]] automaticamente (ex: `nairim.operum.com.br`)
- `@@unique([email, tenantId])` — mesmo email pode existir em múltiplos tenants com credenciais independentes
- Login negado se [[Usuário]] não tem vínculo ativo com o tenant do subdomínio
- Sistema não revela se o erro é credencial ou tenant (mensagem genérica)

**Fluxo de troca de tenant** (`switchTenantAction`):
1. Verifica se usuário é membro do tenant destino (client-side guard)
2. Invalida sessão anterior no Redis (fire-and-forget)
3. `POST /auth/switch-tenant` com `{ targetTenantId }` gera novo JWT para o tenant destino
4. Seta novo cookie `session`, revalida layout, redireciona para `/projetos`

**Fluxo de adesão a tenant** (`POST /auth/join-tenant`):
- Cria novo `User` no tenant com senha separada
- Permite acesso cruzado com credenciais distintas por tenant

---

## 🖥️ Componentes de UI

| Componente | Arquivo | Página | Descrição |
|-----------|---------|--------|-----------|
| `LoginForm` | `components/auth/LoginForm.tsx` | `/login` | Email + senha, exibe erros inline |
| `RegisterForm` | `components/auth/RegisterForm.tsx` | `/login` | Cadastro (exige `DEFAULT_TENANT_ID`) |
| `RecuperarSenhaForm` | `components/auth/RecuperarSenhaForm.tsx` | `/recuperar-senha` | Wizard 3 etapas: email → código → nova senha |
| Página alterar-senha | `app/alterar-senha/page.tsx` | `/alterar-senha` | Troca de senha forçada |

---

## 📡 Endpoints da API

**Base URL**: `AUTH_SERVICE_URL` (padrão: `http://auth-service:4001`)

### Públicos (`@Public` — sem autenticação)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/login` | Login com email/senha |
| `GET` | `/auth/verify` | Verifica validade do token |
| `POST` | `/auth/password/request-reset` | Solicita código de recuperação |
| `POST` | `/auth/password/validate-code` | Valida código de recuperação |
| `POST` | `/auth/password/reset` | Redefine senha com código |

### Protegidos (requerem JWT válido via API Gateway)

| Método | Rota | Descrição | Guard extra |
|--------|------|-----------|-------------|
| `POST` | `/auth/register` | Cria usuário | `x-internal-api-key` |
| `POST` | `/auth/logout` | Logout, invalida JTI | — |
| `GET` | `/auth/me` | Perfil do usuário atual | — |
| `PATCH` | `/auth/me` | Atualiza perfil | — |
| `POST` | `/auth/password/change` | Altera senha (requer senha atual) | — |
| `POST` | `/auth/password/alterar` | Troca senha forçada | — |
| `GET` | `/auth/my-tenants` | Lista tenants do usuário | — |
| `POST` | `/auth/switch-tenant` | Troca de tenant ativo | — |
| `POST` | `/auth/join-tenant` | Ingressa em novo tenant | — |
| `POST` | `/auth/provision-tenant-admin` | Provisiona admin em tenant | `AdminGuard` |

---

## 🗄️ Modelo de Dados

Campos do `model User` relevantes para autenticação (`prisma/schema.prisma`):

```prisma
model User {
  id                  String    @id @default(cuid())
  tenantId            String
  email               String
  passwordHash        String          // bcrypt 12 rounds
  role                String    @default("member")
  isActive            Boolean   @default(true)
  status              String    @default("active")

  // Controle de sessão
  tokenVersion        Int       @default(0)  // incrementado no change/reset de senha
  lastLogin           DateTime?
  loginAttempts       Int       @default(0)

  // Fluxo de senha forçada
  forcePasswordChange Boolean   @default(false)

  // Recuperação de senha
  resetToken          String?           // SHA256(código)
  resetTokenExpiry    DateTime?         // expira em 15 min

  // 2FA (infra pronta, não implementado)
  mfaEnabled          Boolean   @default(false)
  mfaSecret           String?

  // Soft delete
  deletedAt           DateTime?

  @@unique([email, tenantId])
}
```

**Invariante importante**: `@@unique([email, tenantId])` — o mesmo email pode existir em múltiplos tenants com registros de `User` distintos.

---

## 🔐 Segurança

### Senhas
- bcrypt com **12 rounds** (`BCRYPT_ROUNDS` constante em `auth-service/src/lib/crypto.ts`)
- `PasswordSchema` (Zod): mínimo 8 chars, ao menos 1 número, ao menos 1 caractere especial
- Nunca armazenada em plaintext — apenas `passwordHash`

### Tokens / Sessão
- **RS256** (produção): chaves PEM 4096 bits em `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`
- **HS256** (dev/legado): fallback via `SESSION_SECRET` — aceito durante transição (7 dias máx)
- `decrypt()` em `lib/session.ts` tenta RS256 primeiro, depois HS256
- Sessão armazenada em cookie `session`: `httpOnly`, `SameSite=strict`, `Secure` em prod
- JWT contém: `userId`, `role`, `tenantId`, `tokenVersion`, `jti` (UUID v4), `expiresAt`
- TTL: **7 dias**

### Revogação de Sessão (Redis)
- JTI armazenado como chave `session:{jti}` no Redis com TTL 7 dias
- API Gateway verifica JTI no Redis em todas as requisições (prod)
- Logout deleta a chave imediatamente
- Troca de senha / troca de tenant invalida JTI anterior

### Rate Limiting (Redis)
- **Login por IP**: máx 10 tentativas / 15 min → chave `login_rate:{ip}`
- **Reset de senha por email**: máx 3 requests / 15 min → chave `reset_rate:{email}`
- Fail-open: se Redis indisponível, limite não é aplicado

### Proteções adicionais
- **Enumeração de usuário**: reset de senha retorna sucesso mesmo se email não existe
- **Mensagem genérica**: falha de login não diferencia "email não existe" de "senha errada"
- **Bloqueio de conta**: 10 tentativas falhas — conta bloqueada, requer suporte
- **tokenVersion**: incrementado a cada troca de senha → invalida todas as sessões anteriores
- **Soft delete**: `deletedAt` verificado nas queries — usuários nunca hard-deletados
- **AdminGuard**: re-verifica `x-internal-api-key` independentemente (defense-in-depth)

---

## ⚙️ Variáveis de Ambiente

| Variável | Obrigatório | Descrição | Exemplo |
|----------|------------|-----------|---------|
| `JWT_PRIVATE_KEY` | Prod | Chave privada RS256 (PEM, `\n` como separador) | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `JWT_PUBLIC_KEY` | Prod | Chave pública RS256 (PEM) | `-----BEGIN PUBLIC KEY-----\n...` |
| `SESSION_SECRET` | Dev | Segredo HS256 (mín 32 chars) | `change-me-at-least-32-characters` |
| `REDIS_HOST` | Prod | Host do Redis | `redis` |
| `REDIS_PORT` | Prod | Porta do Redis | `6379` |
| `REDIS_PASSWORD` | Prod | Senha do Redis | `change-me-redis-password` |
| `AUTH_SERVICE_URL` | Sim | URL interna do auth-service | `http://auth-service:4001` |
| `INTERNAL_API_KEY` | Sim | Chave para chamadas service-to-service | `change-me-internal-api-key` |
| `DEFAULT_TENANT_ID` | Sim | Tenant padrão para auto-cadastro | `cuid...` |
| `API_GATEWAY_INTERNAL_URL` | Sim | URL interna do API Gateway | `http://api-gateway:4000` |

**Geração de chaves RS256**:
```bash
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem
# Para env vars (inline com \n):
JWT_PRIVATE_KEY="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem)"
JWT_PUBLIC_KEY="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem)"
```

---

## 🧪 Testes

| Arquivo | Tipo | Cobertura |
|---------|------|-----------|
| `__tests__/unit/services/authService.test.ts` | Unit | register, login, email único, bcrypt, tentativas, usuário inativo |
| `__tests__/integration/actions/auth.actions.test.ts` | Integration | signupAction, loginAction, logoutAction — cookie, redirect, erros |
| `__tests__/components/auth/LoginForm.test.tsx` | Component | Render, submit, exibição de erros |
| `__tests__/components/auth/RegisterForm.test.tsx` | Component | Render, validação de campos |
| `__tests__/unit/lib/validation/authSchemas.test.ts` | Unit | PasswordSchema, SignupSchema — edge cases |
| `__tests__/unit/lib/session.test.ts` | Unit | encrypt/decrypt RS256 e HS256, payload roundtrip |

---

## 🧠 BDD

### Login bem-sucedido

```gherkin
Dado que o Usuário está ativo no tenant "nairim"
E possui credenciais válidas (email + senha)
Quando acessar "nairim.operum.com.br" e submeter o formulário
Então o sistema deve criar uma sessão JWT RS256 (7 dias)
E redirecionar para o dashboard ou /projetos
E registrar o lastLogin
```

### Bloqueio por tentativas

```gherkin
Dado que o Usuário tentou login com senha incorreta 10 vezes
Quando tentar novamente
Então o sistema deve retornar mensagem genérica de erro
E bloquear a conta (sem revelar o motivo específico)
```

### Rate limit por IP

```gherkin
Dado que o IP "1.2.3.4" realizou 10 tentativas de login em 14 minutos
Quando o mesmo IP tentar login pela 11ª vez
Então o sistema deve retornar "Muitas tentativas de login. Aguarde 15 minutos."
Sem consultar o auth-service
```

### Recuperação de senha

```gherkin
Dado que o Usuário esqueceu a senha
Quando solicitar recuperação com email cadastrado
Então o sistema deve gerar código de 8 chars e armazenar SHA256 no banco
E retornar sucesso independente de o email existir ou não

Quando submeter o código correto dentro de 15 minutos
Então o código é validado com sucesso

Quando submeter nova senha que atende os critérios
Então a senha é atualizada e tokenVersion incrementado
E todas as sessões anteriores são invalidadas
```

### Senha forçada

```gherkin
Dado que admin configurou forcePasswordChange = true para o Usuário
Quando o Usuário fizer login com credenciais válidas
Então o sistema deve redirecionar para /alterar-senha
E o Usuário só acessa o sistema após trocar a senha
```

### Switch de tenant

```gherkin
Dado que o Usuário tem acesso ao tenant "A" e ao tenant "B"
Quando solicitar troca para tenant "B"
Então o sistema deve invalidar a sessão do tenant "A" no Redis
E emitir novo JWT para o tenant "B"
E redirecionar para /projetos
```

---

## 🧬 SDD — Decisões de Arquitetura

- **JWT puro sem NextAuth**: controle total sobre payload, algoritmo e revogação; NextAuth adicionaria complexidade desnecessária para um sistema multi-tenant customizado
- **RS256 com fallback HS256**: produção usa par de chaves assimétricas (auth-service assina, API Gateway verifica com public key); HS256 aceito temporariamente para sessões antigas de até 7 dias pós-migração
- **JTI + Redis para revogação**: JWTs são stateless por padrão; armazenar JTI no Redis permite logout imediato e troca de tenant sem esperar o JWT expirar
- **tokenVersion em vez de blacklist individual**: ao trocar senha, incrementar `tokenVersion` invalida todas as sessões ativas sem precisar listar e deletar cada JTI
- **Sem refresh token separado**: o JWT de 7 dias serve como token de acesso e sessão; ao expirar, usuário re-autentica
- **2FA declarado, não implementado**: campos `mfaEnabled` e `mfaSecret` existem no schema — infraestrutura pronta para TOTP, mas sem rotas de setup/verificação ainda
- **Soft delete de usuários**: `deletedAt` preserva histórico de cards, comentários e auditoria; usuário deletado não pode autenticar
- **Constraint `@@unique([email, tenantId])`**: mesmo email pode ter senhas e permissões diferentes por tenant — modelo fundamental para o multi-tenancy

---

## 🔗 Ver também

- [[Login]] — especificação da tela (UX)
- [[Recuperação de Senha]] — fluxo de recuperação (UX)
- [[Usuário]] — modelo de domínio completo
- [[Tenant]] — contexto multi-tenant
