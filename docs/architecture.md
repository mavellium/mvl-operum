# Arquitetura do Projeto — MVL Operum

## Visão Geral

Plataforma de gerenciamento de projetos multi-tenant com board Kanban por sprint, rastreamento de tempo, controle de membros por projeto, dashboard analítico, auditoria, notificações e controle de acesso por papel. Construída com Next.js 16 App Router, PostgreSQL via Prisma e Tailwind CSS 4.

---

## Stack Tecnológica

### Monolito (Next.js)

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19.2.4 |
| Linguagem | TypeScript 5 |
| Banco de dados | PostgreSQL 17 |
| ORM | Prisma 7 (`prisma.config.ts`, gera em `lib/generated/prisma`) |
| Estilização | Tailwind CSS 4 + PostCSS |
| Drag & Drop | @hello-pangea/dnd 18.0.1 |
| Autenticação | JWT RS256 via `jose` + `bcryptjs` (HS256 fallback em dev) |
| Armazenamento | MinIO (S3-compatible) via `@aws-sdk/client-s3` |
| Filas | BullMQ (publisher) via Redis |
| Validação | Zod 4.3.6 |
| Gráficos | Recharts 3.8.1 |
| CSV | papaparse 5.5.3 |
| Testes | Vitest 4.1.2, Testing Library, MSW, JSDOM |

### Infraestrutura

| Componente | Tecnologia |
|------------|------------|
| Containerização | Docker + Docker Compose |
| Reverse proxy / TLS | Traefik v2.11 (Let's Encrypt automático) |
| Gerenciador de pacotes | pnpm 10 via corepack |
| CI/CD | GitHub Actions (SSH deploy para VPS) |
| Servidor | VPS Hostinger (8 GB RAM, Ubuntu) |
| Cache / Fila | Redis 7 |
| Object storage | MinIO (S3-compatible) |
| Observabilidade (prod) | Prometheus + Loki + Grafana |

### Microserviços

| Serviço | Framework | Porta |
|---------|-----------|-------|
| notification-service | NestJS 11 + Prisma 7 + BullMQ (consumer) | 4004 |

---

## Ambientes de Deploy

### URLs de Acesso

| Ambiente | Aplicação | MinIO (storage) |
|----------|-----------|-----------------|
| **Staging** | https://staging.operum.mavellium.com.br | https://storage-staging.operum.mavellium.com.br |
| **Produção** | https://operum.mavellium.com.br | https://storage-prod.operum.mavellium.com.br |

### Bancos de Dados (VPS `187.77.236.241`)

| Ambiente | Host interno (Docker) | Porta externa | Nome do banco |
|----------|----------------------|---------------|---------------|
| Staging | `postgres:5432` | `5435` | `mvloperum` |
| Produção | `postgres:5432` | não exposta | `mvloperum_prod` |

> Para acessar o banco de produção localmente via Prisma Studio, use SSH tunnel:
> ```bash
> # 1. Obter IP do container (no VPS)
> docker inspect mvloperum-prod-postgres-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
> # 2. Alternativa: expor via socat
> docker run --rm -it --network mvloperum-prod_internal -p 15432:5432 alpine/socat TCP-LISTEN:5432,fork,reuseaddr TCP:postgres:5432
> # 3. Tunnel SSH (local)
> ssh -L 15433:localhost:15432 root@187.77.236.241 -N
> # DATABASE_URL para Studio:
> # postgresql://mvluser:<SENHA>@localhost:15433/mvloperum_prod
> ```

### Layout no VPS

```
/opt/mvloperum/
├── shared/          # traefik (docker-compose.traefik.yml)
├── staging/         # docker-compose.yml + docker-compose.staging.yml + .env
└── prod/            # docker-compose.yml + docker-compose.production.yml + .env
```

### Variáveis de Ambiente por Ambiente

| Variável | Staging | Produção |
|----------|---------|----------|
| `COMPOSE_PROJECT_NAME` | `staging` (default pelo dir) | `mvloperum-prod` |
| `IMAGE_TAG` | `staging` | `prod` |
| `DATABASE_URL` | `postgresql://...@postgres:5432/mvloperum` | `postgresql://...@postgres:5432/mvloperum_prod` |
| `MINIO_BUCKET` | `mvloperum` | `mvloperum-prod` |
| `MINIO_PUBLIC_URL` | `https://storage-staging.operum.mavellium.com.br` | `https://storage-prod.operum.mavellium.com.br` |
| `JWT_PRIVATE_KEY` | Chave RS256 exclusiva | Chave RS256 exclusiva |
| `JWT_PUBLIC_KEY` | Chave RS256 exclusiva | Chave RS256 exclusiva |

### Traefik Compartilhado

Traefik roda em `/opt/mvloperum/shared` conectado à rede externa `traefik-public`. Ambos os ambientes se conectam a essa rede via `networks: traefik-public: external: true`. A configuração crítica é `--providers.docker.network=traefik-public` para que o Traefik descubra os containers corretos.

---

## Estrutura de Diretórios

```
mvl-operum/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rotas públicas (sem sidebar)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── recuperar-senha/page.tsx
│   ├── actions.ts                # Server Actions de nível raiz (ex-board/column)
│   ├── actions/                  # Server Actions por domínio
│   │   ├── admin.ts              # CRUD de usuários pelo admin
│   │   ├── alterarSenha.ts       # Troca de senha obrigatória
│   │   ├── attachments.ts        # Upload/remoção de anexos
│   │   ├── auth.ts               # Login, registro, logout
│   │   ├── cardResponsible.ts    # Responsáveis por card
│   │   ├── comentarios.ts        # Comentários em cards
│   │   ├── dashboard.ts          # Métricas e analytics
│   │   ├── departments.ts        # CRUD de departamentos (renomeado de departamentos.ts)
│   │   ├── migration.ts          # Migrações de dados
│   │   ├── notificacoes.ts       # Leitura/arquivamento de notificações
│   │   ├── profile.ts            # Edição de perfil
│   │   ├── projects.ts           # CRUD de projetos (novo, en)
│   │   ├── projetos.ts           # CRUD de projetos e membros (legado)
│   │   ├── roles.ts              # CRUD de roles/permissões
│   │   ├── sprintBoard.ts        # Ações do board (cards, colunas)
│   │   ├── sprints.ts            # CRUD de sprints
│   │   ├── tags.ts               # CRUD de tags
│   │   ├── time.ts               # Controle de tempo
│   │   └── users.ts              # Listagem de usuários
│   ├── api/                      # Rotas REST (FormData / consumo direto)
│   │   ├── csv/route.ts
│   │   ├── me/route.ts
│   │   ├── notificacoes/count/route.ts
│   │   ├── search/route.ts
│   │   └── uploads/route.ts
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Hub de navegação do admin
│   │   ├── dashboard/page.tsx    # Métricas por projeto (admin)
│   │   └── users/page.tsx        # Gerenciamento de usuários
│   ├── alterar-senha/page.tsx    # Troca de senha forçada
│   ├── arquivos/page.tsx         # Galeria de anexos
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── sprint/[sprintId]/page.tsx
│   ├── no-project/page.tsx       # Tela para usuários sem projeto vinculado
│   ├── notificacoes/page.tsx
│   ├── perfil/page.tsx
│   ├── projetos/
│   │   ├── page.tsx              # Lista de projetos
│   │   ├── novo/page.tsx         # Criar projeto
│   │   └── [projetoId]/
│   │       ├── layout.tsx
│   │       ├── page.tsx          # Detalhe do projeto
│   │       ├── dashboard/page.tsx
│   │       ├── departamentos/page.tsx  # Departamentos do projeto
│   │       ├── documentacao/page.tsx   # Documentação do projeto
│   │       ├── funcoes/page.tsx        # Funções/papéis do projeto
│   │       ├── membros/page.tsx        # Gerenciar membros
│   │       └── sprints/
│   │           ├── page.tsx            # Lista de sprints do projeto
│   │           ├── nova/page.tsx       # Criar sprint no projeto
│   │           └── [sprintId]/page.tsx # Board Kanban
│   ├── sprints/
│   │   └── [sprintId]/page.tsx   # Board Kanban (acesso global)
│   ├── layout.tsx
│   ├── page.tsx                  # Redireciona para /sprints
│   └── globals.css
├── components/
│   ├── admin/                    # AdminCreateUserModal, AdminEditUserModal, UsersTable
│   ├── arquivos/                 # ArquivosClient
│   ├── auth/                     # Formulários de login/registro
│   ├── board/                    # Column, ColumnHeader, ColumnList, BoardActionMenu
│   ├── card/                     # Card, CardModal, CardTimer, CardAttachments, etc.
│   ├── csv/                      # CsvImportModal
│   ├── dashboard/                # KPICard, SprintDashboard (Recharts), tabelas
│   ├── layout/                   # BottomNav
│   ├── notificacoes/             # NotificacaoList
│   ├── profile/                  # AvatarUpload, ProfileForm, ChangePasswordForm
│   ├── projetos/                 # ProjetoMembrosClient
│   ├── search/                   # GlobalSearch
│   ├── sprint/                   # SprintBoard, SprintHeader, SprintManager, etc.
│   ├── tag/                      # TagBadge, TagManager, TagSelector
│   ├── ui/                       # Button, Modal, ConfirmDialog, InlineEdit
│   └── user/                     # UserAvatar, UserSelector
├── lib/
│   ├── generated/prisma/         # Cliente Prisma gerado (não editar)
│   ├── validation/               # Schemas Zod por domínio (pt + en em coexistência)
│   ├── dal.ts                    # verifySession() — proteção de todas as rotas
│   ├── defaultData.ts            # Colunas padrão do board
│   ├── kanbanReducer.ts          # Reducer de drag-and-drop otimista
│   ├── prisma.ts                 # Singleton do cliente Prisma
│   ├── reorderUtils.ts           # Utilitários de reordenação
│   └── session.ts                # Encrypt/decrypt JWT
├── services/                     # Camada de negócio
│   ├── adminService.ts
│   ├── auditoriaService.ts
│   ├── authService.ts
│   ├── cardResponsibleService.ts
│   ├── comentarioService.ts
│   ├── csvImportService.ts
│   ├── dashboardMetricService.ts
│   ├── dashboardService.ts
│   ├── departamentoService.ts    # legado
│   ├── departmentService.ts      # renomeado (en)
│   ├── fileUploadService.ts
│   ├── migrationService.ts
│   ├── notificacaoService.ts
│   ├── permissionService.ts
│   ├── projectRoleService.ts     # papéis por projeto (ex: getOrCreateGerenteProjetoRole)
│   ├── projectService.ts         # CRUD de projetos (en)
│   ├── projetoService.ts         # legado
│   ├── roleService.ts
│   ├── sprintColumnService.ts
│   ├── sprintFeedbackService.ts
│   ├── sprintService.ts
│   ├── tagService.ts
│   ├── tenantService.ts
│   ├── timeService.ts
│   └── userService.ts
├── types/
│   ├── auth.ts                   # SessionPayload, tipos de sessão
│   └── kanban.ts                 # Card, Column, Sprint, etc.
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── __tests__/
│   ├── api/, components/, integration/, middleware/, unit/
├── proxy.ts
└── [config files]
```

---

## Multi-Tenancy

Toda entidade do sistema está vinculada a um `Tenant`. O fluxo é:

1. No login, o sistema busca o primeiro tenant active no banco e inclui o `tenantId` no JWT.
2. `verifySession()` em `lib/dal.ts` descriptografa o JWT e retorna `{ userId, tenantId, role, ... }`.
3. Todas as Server Actions chamam `verifySession()` e passam o `tenantId` para isolar os dados.

```
Tenant 1 ─┬─ Users ─┬─ Projetos ─ Sprints ─ Cards
           │         └─ UsuarioProjeto
           ├─ Tags
           ├─ Departamentos
           ├─ Roles
           └─ Auditorias
```

> Na prática atual o sistema opera com um único tenant. A estrutura já suporta múltiplos.

---

## Papéis e Controle de Acesso

### Role global (campo `User.role`)

| Valor | Acesso |
|-------|--------|
| `admin` | Painel `/admin/*`, gerenciamento de usuários e projetos |
| `gerente` | Gerenciamento de membros em projetos que participa |
| `member` | Apenas operações no board e perfil próprio |

### Role por projeto (`UserProjectRole`)

Além do papel global, cada usuário pode ter um papel específico dentro de um projeto, gerenciado pela tabela `UserProjectRole` (userId + projetoId + roleId). Os roles de projeto são criados pelo admin e têm `escopo = PROJETO`.

### Restrição na navegação

- `/admin/*` — verificado em `app/admin/layout.tsx` e nas actions via `requireAdmin()`
- `/projetos/:id/membros` — apenas `admin` ou `gerente`
- Demais rotas — qualquer usuário autenticado

---

## Schema do Banco de Dados

### Tenant

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| nome | String | Nome do tenant |
| subdominio | String (único) | Identificador único |
| status | Enum | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `REMOVED` |
| config | Json? | Configurações customizáveis |

### User

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| tenantId | String | Tenant ao qual pertence |
| name | String | Nome completo |
| email | String | Único por tenant `(email, tenantId)` |
| passwordHash | String | Senha com bcrypt |
| role | String | `"admin"`, `"gerente"`, `"member"` |
| avatarUrl | String? | URL da imagem de perfil |
| cargo | String? | Cargo global (pode ser sobrescrito por projeto) |
| departamento | String? | Departamento global |
| valorHora | Float | Custo/hora global |
| isActive | Boolean | Bloqueia login sem excluir dados |
| forcePasswordChange | Boolean | Força troca de senha no próximo login |
| tokenVersion | Int | Invalida sessões ao incrementar |
| loginAttempts | Int | Controle de tentativas de login |
| mfaEnabled / mfaSecret | Boolean/String? | Campos para MFA (reservado) |

### Projeto

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| tenantId | String | Tenant |
| nome | String | Único por tenant `(nome, tenantId)` |
| descricao | String? | Descrição |
| status | Enum | `ACTIVE`, `INACTIVE`, `CONCLUIDO`, `ARQUIVADO` |

### UsuarioProjeto

Tabela de junção entre User e Projeto. Armazena dados **contextuais ao projeto** — campos que variam por projeto, não por usuário globalmente.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| userId | String | Usuário |
| projetoId | String | Projeto |
| active | Boolean | Membro active no projeto |
| cargo | String? | Cargo neste projeto |
| departamento | String? | Departamento neste projeto |
| valorHora | Float? | Custo/hora neste projeto |
| dataEntrada | DateTime | Quando entrou no projeto |
| dataSaida | DateTime? | Quando saiu (histórico) |

> **Regra**: tudo que varia por projeto fica em `UsuarioProjeto`, não em `User`.

### Departamento / UsuarioDepartamento

Departamentos globais do tenant. Um usuário pode pertencer a múltiplos departamentos via `UsuarioDepartamento`.

### Role / Permission / RolePermission / UserProjectRole

Sistema RBAC:
- `Role` — papel com escopo `TENANT` ou `PROJETO`, pertence a um tenant
- `Permission` — ação sobre recurso (`recurso + acao`, único globalmente)
- `RolePermission` — M2M entre Role e Permission
- `UserProjectRole` — atribui um Role de escopo PROJETO a um usuário em um projeto específico

### Sprint

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| projetoId | String? | Projeto ao qual pertence (opcional para legado) |
| name | String | Nome do sprint |
| status | Enum | `PLANNED`, `ACTIVE`, `COMPLETED` |
| startDate / endDate | DateTime? | Período |
| createdBy | String? | Usuário criador |

### SprintColumn / Card / CardTag / CardResponsible

Estrutura do board Kanban (igual à versão anterior). Cards têm título, descrição, cor, prioridade, datas, múltiplos responsáveis, tags e anexos.

### TimeEntry

Entradas de tempo por usuário/card. Suporta timer active (`isRunning`) e entradas manuais (`isManual`).

### Comentario / Notificacao

- `Comentario` — texto com tipo `COMENTARIO` ou `FEEDBACK`, vinculado a card + usuário
- `Notificacao` — notificação para um usuário com tipo, título, mensagem e status (`NAO_LIDA`, `LIDA`, `ARQUIVADA`)

### Auditoria

Log imutável de ações no sistema. Campos: `tenantId`, `userId?`, `acao`, `entidade`, `entidadeId?`, `detalhes (Json?)`, `timestamp`.

### DashboardMetric

Cache de métricas por sprint + usuário: `horas`, `tarefasPendentes`, `custoTotal`, `rankingPosicao`.

### SprintFeedback

Avaliação por usuário ao encerrar um sprint: `qualidade` e `dificuldade` (1–5) + campos texto. Único por `(sprintId, userId)`.

### Tag / Attachment

- `Tag` — etiqueta por usuário, vinculada a cards via `CardTag`
- `Attachment` — arquivo anexado a card (MinIO), pode ser capa do card

---

## Fluxo de Dados

### Fluxo padrão (ação do usuário)

```
Componente React (Client)
       ↓
Server Action (app/actions/*.ts)
  - verifySession() → tenantId, userId, role
  - Validação Zod do input
       ↓
Service Layer (services/*.ts)
  - Lógica de negócio + consultas Prisma
       ↓
PostgreSQL
       ↓
revalidatePath() → Next.js revalida a rota
       ↓
Retorno ao componente
```

### Fluxo de autenticação

```
Login:
  → Zod valida email/senha
  → authService busca usuário no banco (por email + tenantId)
  → bcrypt compara senha
  → JWT gerado com { userId, tenantId, role, tokenVersion }
  → Cookie httpOnly "session" setado (7 dias)
  → Se forcePasswordChange=true → redirect /alterar-senha
  → Senão → redirect /sprints

Cada requisição protegida (verifySession):
  → Lê cookie "session"
  → jose descriptografa JWT
  → Busca usuário no banco
  → Verifica isActive, tokenVersion e forcePasswordChange
  → Se forcePasswordChange=true → redirect /alterar-senha
  → Retorna { userId, tenantId, role, ... }
```

### Fluxo de troca de senha forçada

```
Admin cria usuário com forcePasswordChange=true
  → No próximo login, redirectiona para /alterar-senha
  → alterarSenhaAction lê cookie diretamente (bypass de verifySession para evitar loop)
  → Atualiza passwordHash + forcePasswordChange=false + incrementa tokenVersion
  → Deleta cookie de sessão → redirect /login?changed=1
```

### Gerenciamento de estado do board

1. **useReducer + kanbanReducer** — atualização otimista local para drag-and-drop (evita flickering)
2. **Server Actions + revalidatePath** — todas as mutações persistem no banco e revalidam a rota

---

## Rotas de API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/me` | Dados do usuário autenticado |
| `GET` | `/api/search?q=query` | Busca global em cards e sprints |
| `GET` | `/api/notificacoes/count` | Contagem de notificações não lidas |
| `POST` | `/api/csv` | Importação de cards via CSV (multipart) |
| `POST` | `/api/uploads` | Upload de arquivo (MinIO) |
| `DELETE` | `/api/uploads?id=attachmentId` | Remove arquivo e registro |

A maioria das operações usa **Server Actions**, sem API REST. As rotas acima existem para `FormData` (uploads, CSV) ou polling de baixo custo (contagem de notificações).

---

## Páginas e Funcionalidades

### `/admin`
Hub central do admin com links para: gerenciamento de usuários, projetos, configurações e dashboard.

### `/admin/dashboard`
Métricas por projeto: % conclusão de cards, horas acumuladas, custo estimado, sprints actives. Dados calculados em tempo real via `getSprintMetrics`.

### `/admin/users`
Tabela de usuários com:
- Criar usuário (nome, email, senha, isAdmin, forcePasswordChange)
- Editar usuário: dados básicos (nome, email, senha, role global) + seção **Projetos** (ativar/desativar por projeto, editar cargo/departamento/valorHora por projeto, adicionar a novo projeto)
- Ativar/desativar conta

### `/no-project`
Tela exibida quando o usuário autenticado não está vinculado a nenhum projeto ativo. Oferece opção de logout.

### `/projetos`
Lista de projetos do tenant com status e contagem de sprints.

### `/projetos/novo`
Formulário de criação de projeto (nome, descrição).

### `/projetos/:id`
Detalhe do projeto: dados básicos, status, ações (dashboard, membros, sprints, departamentos, funções).

### `/projetos/:id/membros`
Gerenciamento de membros com dados **por projeto** (lidos de `UsuarioProjeto`):
- Listagem: nome, email, role global, cargo, departamento, valorHora do projeto
- Edição inline por membro: cargo, departamento, valorHora
- Adicionar membro da lista de usuários disponíveis
- Remover membro (seta `active=false` em `UsuarioProjeto`)

### `/projetos/:id/departamentos`
Departamentos vinculados ao projeto. Usa `departmentService` (en) e schemas `departmentSchemas`.

### `/projetos/:id/funcoes`
Papéis/funções do projeto (RBAC por projeto). Verifica se o usuário é gerente via `isProjectManager()` de `projectRoleService`.

### `/projetos/:id/documentacao`
Documentação colaborativa do projeto (lista de membros e contribuições).

### `/projetos/:id/sprints`
Lista de sprints do projeto com criação inline. Sprint individual abre o board Kanban em `/projetos/:id/sprints/:sprintId`.

### `/sprints/:id`
Board Kanban — acesso global, sem contexto de projeto na URL.

### `/dashboard/sprint/:id`
Dashboard de sprint com:
- PieChart de cards por coluna (Recharts)
- BarChart de horas por usuário (Recharts)
- Tabela de ranking por usuário: horas, custo, cards concluídos
- Lista de cards atrasados
- SprintFeedback: qualidade/dificuldade médias + detalhes por usuário

### `/notificacoes`
Lista de notificações com filtros por status, marcar como lida, arquivar.

### `/arquivos`
Galeria de todos os anexos do usuário, com preview e download.

### `/alterar-senha`
Página exclusiva para troca de senha forçada pelo admin. Inacessível via navegação normal — só via redirect automático.

---

## Serviços (`services/`)

Cada serviço é responsável por um domínio:

| Serviço | Responsabilidade |
|---------|-----------------|
| `authService` | Login, registro, hash de senha |
| `adminService` | CRUD de usuários pelo admin |
| `projectService` | CRUD de projetos, membros (UsuarioProjeto) — versão en |
| `projetoService` | CRUD de projetos (legado) |
| `projectRoleService` | Papéis por projeto; garante papel de gerente ao criar projeto |
| `sprintService` | CRUD de sprints |
| `sprintColumnService` | CRUD de colunas |
| `dashboardService` | Métricas gerais e por sprint |
| `dashboardMetricService` | Cache de métricas por sprint/usuário |
| `sprintFeedbackService` | Feedbacks por sprint |
| `comentarioService` | Comentários em cards |
| `auditoriaService` | Registro de log de auditoria |
| `notificacaoService` | CRUD de notificações |
| `tagService` | CRUD de tags (requer tenantId) |
| `timeService` | Timer e entradas manuais de tempo |
| `fileUploadService` | Upload/delete no MinIO |
| `csvImportService` | Parse e importação de CSV |
| `roleService` | CRUD de roles RBAC |
| `permissionService` | CRUD de permissões |
| `departmentService` | CRUD de departamentos — versão en |
| `departamentoService` | CRUD de departamentos (legado) |
| `tenantService` | Lookup de tenant |
| `userService` | Listagem de usuários por tenant |

---

## Validação (Zod)

Schemas em `lib/validation/`:

| Arquivo | Schemas |
|---------|---------|
| `authSchemas.ts` | Login, registro, troca de senha |
| `cardSchemas.ts` | Criação e edição de card |
| `comentarioSchemas.ts` | Criação de comentário em card |
| `csvSchemas.ts` | Estrutura de linha CSV |
| `departamentoSchemas.ts` | Criação e edição de departamento (pt, legado) |
| `departmentSchemas.ts` | Criação e edição de departamento (en) |
| `fileSchemas.ts` | Tipo e tamanho de arquivo |
| `notificacaoSchemas.ts` | Notificações |
| `projectSchemas.ts` | Criação e edição de projeto (en) |
| `projetoSchemas.ts` | Criação e edição de projeto (pt, legado) |
| `roleSchemas.ts` | Criação e edição de roles RBAC |
| `sprintSchemas.ts` | Criação e edição de sprint |
| `tagSchemas.ts` | Criação e edição de tag |
| `tenantSchemas.ts` | Tenant |
| `userSchemas.ts` | Edição de perfil e admin |

---

## Segurança

| Mecanismo | Implementação |
|-----------|---------------|
| Senha | bcrypt rounds 10–12 |
| Sessão | JWT RS256 httpOnly cookie, `SameSite=strict`, 7 dias |
| Algoritmo JWT | RS256 em staging/produção; HS256 fallback em dev local (sem chaves configuradas) |
| Invalidação de sessão | `tokenVersion` — incrementar invalida todas as sessões |
| Bloqueio de conta | `isActive=false` verificado em cada request |
| Troca de senha forçada | `forcePasswordChange` verificado no login e em `verifySession` |
| Isolamento de dados | Toda query usa `tenantId` da sessão |
| Validação de input | Zod em todas as actions e API routes |
| Auditoria | `Auditoria` registra ações críticas com userId, entidade e detalhes |
| Middleware de auth | `proxy.ts` valida sessão via `http://localhost:PORT/api/me` antes de cada rota protegida |

---

## Migrações Aplicadas

| Migração | O que faz |
|----------|-----------|
| `init` | Schema base: User, Sprint, Card, Tag, TimeEntry, Attachment |
| `add_user_sprint_tags_attachments` | Relações adicionais |
| `add_sprint_board_profile_time_tracking` | Board, perfil, time tracking |
| `add_token_version` | Campo `tokenVersion` em User |
| `init` (2406) | Multi-tenant: Tenant, Projeto, UsuarioProjeto, RBAC, Comentario, Notificacao |
| `add_auditoria_dashboardmetric_sprintfeedback` | Auditoria, DashboardMetric, SprintFeedback |
| `add_force_password_change` | Campo `forcePasswordChange` em User |
| `add_usuario_projeto_fields` | Campos `active`, `cargo`, `departamento`, `valorHora` em UsuarioProjeto |

---

## Configuração e Ambiente

**Variáveis de ambiente (monolito):**

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `SESSION_SECRET` | Chave HS256 (fallback dev — sem `JWT_PRIVATE_KEY`) |
| `JWT_PRIVATE_KEY` | Chave privada RS256 PEM (newlines como `\n` literal) |
| `JWT_PUBLIC_KEY` | Chave pública RS256 PEM (newlines como `\n` literal) |
| `REDIS_HOST` | Host do Redis (default: `redis`) |
| `REDIS_PORT` | Porta do Redis (default: `6379`) |
| `MINIO_ENDPOINT` | Hostname do MinIO (default: `localhost`) |
| `MINIO_PORT` | Porta do MinIO (default: `9000`) |
| `MINIO_USE_SSL` | `true` para HTTPS no cliente S3 |
| `MINIO_ACCESS_KEY` | Access key do MinIO |
| `MINIO_SECRET_KEY` | Secret key do MinIO |
| `MINIO_BUCKET` | Nome do bucket |
| `MINIO_PUBLIC_URL` | URL pública base para links de arquivos |
| `NOTIFICATION_SERVICE_URL` | URL do notification-service (ex: `http://notification-service:4004`). Se não definido, usa banco direto. |
| `NODE_ENV` | `development` ou `production` |
| `PORT` | Porta do servidor Next.js (default: `3000`) |

**Variáveis de ambiente (notification-service):**

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `REDIS_HOST` | Host do Redis |
| `REDIS_PORT` | Porta do Redis |

**Comandos úteis:**

```bash
pnpm dev                          # servidor de desenvolvimento
pnpm build                        # build de produção
npx prisma migrate dev            # aplicar migrações (dev)
npx prisma generate               # regenerar cliente Prisma
npx prisma studio                 # GUI do banco

# Deploy manual (staging)
IMAGE_TAG=staging docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env up -d

# Migrations manual (staging)
IMAGE_TAG=staging docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env --profile migration run --rm migrate
```

---

## Roadmap de Migração (Strangler Fig)

### Fase 0 — Infraestrutura VPS (concluída)

Objetivo: sair do Vercel/Neon e hospedar tudo em VPS Hostinger com Docker.

**O que foi feito:**

1. **Dockerização do monolito** — `Dockerfile` multi-stage (base → deps → builder → runner) usando Node 22 Alpine + pnpm via corepack. Output `standalone` do Next.js.

2. **Docker Compose** — `docker-compose.yml` (base) + overrides `docker-compose.staging.yml` e `docker-compose.production.yml`. Serviços: `app`, `notification-service`, `postgres`, `redis`, `minio`, `migrate` (profile), observabilidade (prod).

3. **Traefik como reverse proxy** — TLS automático via Let's Encrypt (ACME), HTTP→HTTPS redirect, roteamento por `Host()`. Roda separado em `/opt/mvloperum/shared`. Label crítica: `traefik.http.routers.<router>.service=app-${COMPOSE_PROJECT_NAME}` para evitar 504 (Traefik default porta 80).

4. **Dois ambientes isolados** — staging e produção com `COMPOSE_PROJECT_NAME` distintos, bancos separados (`mvloperum` e `mvloperum_prod`), buckets MinIO separados, chaves JWT separadas.

5. **Migração de MinIO → MinIO** — `fileUploadService.ts` e `minio.ts` substituem `@vercel/blob` por `@aws-sdk/client-s3` apontando para MinIO. Buckets públicos para avatars/logos.

6. **JWT HS256 → RS256** — `lib/session.ts` suporta RS256 (chaves `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`) com fallback HS256 para desenvolvimento local sem chaves configuradas. Sessões existentes HS256 continuam válidas durante transição (dual-verify).

7. **CI/CD via GitHub Actions**:
   - `develop` → deploy staging automático
   - `main` → deploy produção (automático no push)
   - Pipeline: checkout → install → build imagens Docker → save tarballs → SCP para VPS → SSH: docker load + migrate + compose up

8. **Fix middleware** — `proxy.ts` faz fetch interno para `/api/me`. Com Traefik (X-Forwarded-Proto: https), `request.url` fica com `https://`. Solução: usar `http://localhost:${PORT}/api/me` para evitar `ERR_SSL_PACKET_LENGTH_TOO_LONG`.

9. **Prisma 7** — schema sem `url` no datasource (movido para `prisma.config.ts`). Gera cliente em `lib/generated/prisma` (não em `node_modules/@prisma/client`).

**Problemas resolvidos:**
- pnpm symlinks quebram ao copiar `node_modules` entre stages Docker → `pnpm install --prod` no runner (sem `--ignore-scripts` para Prisma baixar engines)
- `pnpm-workspace.yaml` com `packages: []` em `notification-service` para ancorar lockfile do subdiretório
- Container `migrate` precisa de `user: "0"` para escrever binários Prisma em `/pnpm`

---

### Fase 1 — Notification Service (concluída)

---

### Fase 2 — Auth Service + File Service + API Gateway (concluída)

Objetivo: centralizar autenticação, uploads e criar o ponto de entrada único da API.

**Serviços criados:**

1. **`auth-service/`** (NestJS :4001) — autenticação centralizada
   - Prisma schema próprio: `Tenant`, `User`
   - Redis session store: chave `session:{jti}`, TTL 7d
   - Endpoints: `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/me`, `/auth/verify`, `/auth/tenants/:subdomain`, `/auth/password/*`
   - Feature flag no monolito: `AUTH_SERVICE_URL`

2. **`api-gateway/`** (Express :4000) — proxy + autenticação JWT
   - Valida JWT RS256 (com fallback HS256 em dev)
   - Verifica sessão ativa no Redis
   - Injeta headers: `X-User-ID`, `X-Tenant-ID`, `X-User-Role`
   - Rate limiting: 200 req/s por IP
   - CORS configurável via `ALLOWED_ORIGINS`
   - Roteamento: `/auth/*` → auth-service, `/files/*` → file-service, `/notifications/*` → notification-service

3. **`file-service/`** (NestJS :4005) — uploads via MinIO
   - Prisma schema próprio: `Attachment`
   - Endpoints: `POST /files/upload`, `DELETE /files/:id`, `GET /files/:id/url`, `POST /files/avatar`, `POST /files/logo`
   - Feature flag no monolito: `FILE_SERVICE_URL`

**Monolito atualizado:**
- `app/actions/auth.ts` — proxy para auth-service quando `AUTH_SERVICE_URL` definido
- `app/api/uploads/route.ts` — proxy para file-service quando `FILE_SERVICE_URL` definido
- `lib/authClient.ts` — cliente HTTP para auth-service

**Docker Compose atualizado:** `api-gateway`, `auth-service` e `file-service` adicionados à stack.

**CI/CD:** pipelines de staging e produção buildando e publicando as 3 novas imagens.

**Marco:** auth-service operacional. API Gateway como ponto de entrada externo. Uploads via file-service. Monolito delega auth e storage via feature flags.

Objetivo: extrair o primeiro microserviço usando o padrão Strangler Fig.

**Por que notificações primeiro:** zero dependências inbound, CRUD puro, bounded context perfeito.

**Arquitetura:**

```
Monolito (Next.js)
  └─ publishNotification()          ← lib/notificationPublisher.ts
       ├─ se NOTIFICATION_SERVICE_URL definido → BullMQ Queue "notifications"
       └─ senão → notificacaoService (DB direto, fallback)

notification-service (NestJS :4004)
  ├─ NotificationController          REST: GET/POST/PATCH/DELETE /notifications
  ├─ NotificationService             Prisma → tabela Notification
  └─ NotificationProcessor           BullMQ Worker "notifications" → cria via service

Redis "notifications" queue ←→ BullMQ
```

**Feature flag:** `NOTIFICATION_SERVICE_URL` no `.env`.
- **Não definido** → comportamento antigo (DB direto via `notificacaoService.ts`)
- **Definido** → criações via BullMQ (async), leituras/mutações via HTTP REST

**notification-service:**
- NestJS 11 + Prisma 7 (schema próprio, só model `Notification`)
- `prisma.config.ts` com try/catch no dotenv (Docker injeta `DATABASE_URL` diretamente)
- Porta 4004, healthcheck `/health`
- Dockerfile independente com `pnpm-workspace.yaml` próprio

**API REST do notification-service:**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/notifications?userId=&limit=&status=&type=` | Listar notificações |
| `GET` | `/notifications/count?userId=` | Contagem não lidas |
| `GET` | `/notifications/:id` | Buscar por ID |
| `POST` | `/notifications` | Criar notificação |
| `PATCH` | `/notifications/:id/read` | Marcar como lida |
| `PATCH` | `/notifications/:id/archive` | Arquivar |
| `DELETE` | `/notifications/:id` | Soft delete |
| `GET` | `/health` | Health check |

---

## Decisões de Arquitetura Notáveis

1. **Server Actions sobre API REST** — elimina camada extra. O cliente chama funções TypeScript que rodam no servidor. API REST é reservada para `FormData` e polling leve.

2. **Services finas nas actions** — actions fazem apenas: `verifySession` + validação Zod + chamada de service + `revalidatePath`. Lógica de negócio fica nos services para testabilidade.

3. **UsuarioProjeto como entidade central** — dados que variam por projeto (cargo, departamento, valorHora, active) ficam em `UsuarioProjeto`, não em `User`. Isso permite que o mesmo usuário tenha papéis e custos diferentes em cada projeto.

4. **forcePasswordChange sem loop** — a action de `/alterar-senha` lê o cookie diretamente (sem chamar `verifySession`) para evitar redirect loop. Após trocar, incrementa `tokenVersion` e invalida a sessão.

5. **Multi-tenant via JWT** — `tenantId` é embutido no token no login, não precisa de lookup em cada request. Toda query usa esse `tenantId` para isolar dados.

6. **Drag-and-drop otimista** — `useReducer` com `kanbanReducer` atualiza o estado local imediatamente; a Server Action persiste em background. Se falhar, o estado local é corrigido na próxima renderização.

7. **Prisma com adapter `pg`** — Next.js 16 exige o adapter explícito `@prisma/adapter-pg` para compatibilidade com o runtime.

8. **`tokenVersion` para invalidação** — incrementar esse campo invalida todas as sessões ativas do usuário sem lista negra de tokens.
