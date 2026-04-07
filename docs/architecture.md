# Arquitetura do Projeto — Kanban Board

## Visão Geral

Aplicação web de gerenciamento de projetos no estilo Kanban, com suporte a sprints, rastreamento de tempo, importação CSV, upload de arquivos, dashboard analítico e controle de usuários. Construída com Next.js 16 App Router, PostgreSQL via Prisma e estilização com Tailwind CSS 4.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19.2.4 |
| Linguagem | TypeScript 5 |
| Banco de dados | PostgreSQL |
| ORM | Prisma 7.5.0 com `@prisma/adapter-pg` |
| Estilização | Tailwind CSS 4 + PostCSS |
| Drag & Drop | @hello-pangea/dnd 18.0.1 |
| Autenticação | JWT via `jose` 6.2.2 + `bcryptjs` 3.0.3 |
| Armazenamento de arquivos | Vercel Blob 2.3.2 |
| Validação | Zod 4.3.6 |
| Gráficos | Recharts 3.8.1 |
| CSV | papaparse 5.5.3 |
| UUIDs | uuid 13.0.0 |
| Testes | Vitest 4.1.2, Testing Library, MSW, JSDOM |

---

## Estrutura de Diretórios

```
kanban-board/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rotas públicas (sem sidebar)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── actions/                  # Server Actions do Next.js
│   │   ├── actions.ts            # Ações gerais do board (cards, colunas)
│   │   ├── admin.ts              # Gerenciamento de usuários pelo admin
│   │   ├── attachments.ts        # Upload e remoção de anexos
│   │   ├── auth.ts               # Login, registro, logout
│   │   ├── cardResponsible.ts    # Atribuição de responsáveis aos cards
│   │   ├── dashboard.ts          # Métricas e dados analíticos
│   │   ├── migration.ts          # Migrações de dados
│   │   ├── profile.ts            # Edição de perfil do usuário
│   │   ├── sprintBoard.ts        # Ações do board de sprint (CRUD de cards/colunas)
│   │   ├── sprints.ts            # CRUD de sprints
│   │   ├── tags.ts               # CRUD de tags
│   │   ├── time.ts               # Controle de tempo (timer, entradas manuais)
│   │   └── users.ts              # Listagem de usuários
│   ├── api/                      # Rotas de API REST
│   │   ├── csv/route.ts          # Importação de CSV
│   │   ├── me/route.ts           # Dados do usuário autenticado
│   │   ├── search/route.ts       # Busca global
│   │   └── uploads/route.ts      # Upload e exclusão de arquivos
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── users/page.tsx        # Painel de administração de usuários
│   ├── dashboard/
│   │   ├── page.tsx              # Dashboard geral
│   │   └── sprint/[sprintId]/page.tsx  # Dashboard de sprint específico
│   ├── sprints/
│   │   ├── page.tsx              # Lista de sprints
│   │   └── [sprintId]/page.tsx   # Board de um sprint
│   ├── perfil/page.tsx           # Página de perfil do usuário
│   ├── layout.tsx                # Layout raiz (com navegação)
│   ├── page.tsx                  # Home (redireciona para /sprints)
│   └── globals.css               # Estilos globais
├── components/                   # Componentes React
│   ├── admin/                    # Modais e tabela de admin de usuários
│   ├── auth/                     # Formulários de login e registro
│   ├── board/                    # Column, ColumnHeader, ColumnList, BoardActionMenu
│   ├── card/                     # Card, CardModal, CardTimer, CardAttachments, etc.
│   ├── csv/                      # CsvImportModal
│   ├── dashboard/                # KPICard, gráficos, tabelas de métricas
│   ├── layout/                   # BottomNav (navegação inferior)
│   ├── profile/                  # AvatarUpload, ProfileForm, ChangePasswordForm
│   ├── search/                   # GlobalSearch
│   ├── sprint/                   # SprintBoard, SprintHeader, SprintManager, etc.
│   ├── tag/                      # TagBadge, TagManager, TagSelector
│   ├── ui/                       # Button, Modal, ConfirmDialog, InlineEdit
│   └── user/                     # UserAvatar, UserSelector
├── lib/                          # Utilitários e lógica de infraestrutura
│   ├── generated/prisma/         # Cliente Prisma gerado (não editar manualmente)
│   ├── validation/               # Schemas Zod por domínio
│   │   ├── authSchemas.ts
│   │   ├── cardSchemas.ts
│   │   ├── csvSchemas.ts
│   │   ├── fileSchemas.ts
│   │   ├── sprintSchemas.ts
│   │   ├── tagSchemas.ts
│   │   └── userSchemas.ts
│   ├── dal.ts                    # Data Access Layer — verifica sessão
│   ├── defaultData.ts            # Dados padrão (colunas iniciais do board)
│   ├── kanbanReducer.ts          # Reducer para estado local do board
│   ├── prisma.ts                 # Singleton do cliente Prisma
│   ├── reorderUtils.ts           # Utilitários de reordenação de listas
│   └── session.ts                # Criptografia/descriptografia de JWT
├── services/                     # Camada de negócio (chamada pelas actions)
│   ├── adminService.ts
│   ├── authService.ts
│   ├── cardResponsibleService.ts
│   ├── csvImportService.ts
│   ├── dashboardService.ts
│   ├── fileUploadService.ts
│   ├── migrationService.ts
│   ├── sprintColumnService.ts
│   ├── sprintService.ts
│   ├── tagService.ts
│   ├── timeService.ts
│   └── userService.ts
├── types/                        # Interfaces TypeScript globais
│   ├── auth.ts                   # Tipos de sessão e usuário autenticado
│   └── kanban.ts                 # Tipos do board (Card, Column, Sprint, etc.)
├── prisma/
│   ├── schema.prisma             # Schema do banco de dados
│   ├── migrations/               # Histórico de migrações
│   └── seed.ts                   # Dados iniciais para desenvolvimento
├── __tests__/                    # Suite de testes
│   ├── api/                      # Testes de rotas de API
│   ├── components/               # Testes de componentes (28 arquivos)
│   ├── integration/              # Testes de integração (actions + API)
│   ├── middleware/               # Testes de middleware
│   └── unit/                     # Testes unitários
│       ├── actions/
│       ├── lib/
│       ├── reducers/
│       ├── services/             # 11 arquivos de testes de serviços
│       └── validation/
├── proxy.ts                      # Proxy local para Next.js 16
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.mts
├── vitest.setup.ts
├── tsconfig.json
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## Schema do Banco de Dados

O Prisma schema define 8 modelos principais:

### User
Representa um usuário do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| name | String | Nome completo |
| email | String (único) | E-mail de login |
| passwordHash | String | Senha com bcrypt |
| role | String | `"member"` ou `"admin"` |
| avatarUrl | String? | URL da imagem de perfil (Blob) |
| cargo | String? | Cargo na empresa |
| departamento | String? | Departamento |
| valorHora | Float? | Custo por hora (usado no dashboard) |
| isActive | Boolean | Se o usuário pode fazer login |
| tokenVersion | Int | Controle de invalidação de sessões |

### Sprint
Representa um sprint de trabalho.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| name | String | Nome do sprint |
| description | String? | Descrição |
| status | Enum | `PLANNED`, `ACTIVE`, `COMPLETED` |
| startDate / endDate | DateTime? | Período do sprint |
| qualidade / dificuldade | Int? | Avaliações ao encerrar |
| createdBy | User | Usuário criador |

### SprintColumn
Coluna dentro de um sprint (ex.: "A Fazer", "Em Andamento").

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| title | String | Nome da coluna |
| position | Int | Ordem de exibição |
| sprintId | String | Sprint pai (cascade delete) |

### Card
Item de trabalho dentro de uma coluna.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| title | String | Título do card |
| description | String? | Descrição detalhada |
| color | String? | Cor hex do card |
| priority | String | `"alta"`, `"media"`, `"baixa"` |
| sprintId | String | Sprint ao qual pertence |
| sprintColumnId | String | Coluna atual |
| sprintPosition / position | Int | Ordem no board |
| startDate / endDate | DateTime? | Datas planejadas |

### Tag
Etiqueta criada por usuário para classificar cards.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| name | String | Nome da tag |
| color | String | Cor hex |
| userId | String | Dono da tag |

Restrição única: `(name, userId)` — tags são por usuário, sem duplicatas.

### CardTag
Tabela de junção entre Card e Tag (chave composta `cardId + tagId`, cascade delete em ambas as direções).

### Attachment
Arquivo anexado a um card.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| cardId | String | Card ao qual pertence |
| fileName | String | Nome original do arquivo |
| fileType | String | MIME type |
| filePath | String | URL no Vercel Blob |
| fileSize | Int | Tamanho em bytes |
| isCover | Boolean | Se é a imagem de capa do card |

### TimeEntry
Entrada de tempo rastreado (timer ou manual).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | CUID | Chave primária |
| userId | String | Usuário que registrou |
| cardId | String | Card relacionado (cascade delete) |
| startedAt | DateTime | Início do período |
| endedAt | DateTime? | Fim (null se timer rodando) |
| duration | Int | Duração em segundos |
| isRunning | Boolean | Timer ativo |
| isManual | Boolean | Entrada manual vs. timer |

---

## Fluxo de Dados

### Fluxo Padrão (ação do usuário)

```
Componente React (Client)
       ↓
Server Action (app/actions/*.ts)
  - Valida sessão via verifySession()
  - Valida input via Zod
       ↓
Service Layer (services/*.ts)
  - Lógica de negócio
  - Consultas ao Prisma
       ↓
Prisma Client (lib/prisma.ts)
       ↓
PostgreSQL
       ↓
Retorno sobe pela cadeia até o componente
```

### Fluxo de Autenticação

```
Formulário de login
  → Zod valida email/senha
  → authService verifica usuário no banco
  → bcrypt compara senha
  → jose gera JWT com userId + tokenVersion
  → Cookie httpOnly "session" setado (7 dias)
  → Redirect para /sprints

Cada requisição protegida:
  → dal.ts lê cookie "session"
  → jose descriptografa JWT
  → Busca usuário no banco
  → Verifica isActive e tokenVersion
  → Retorna dados do usuário ou redireciona para /login
```

### Gerenciamento de Estado do Board

O board de sprint usa dois padrões complementares:

1. **useReducer + kanbanReducer** — estado local para drag-and-drop otimista. Ao soltar um card, o estado local atualiza imediatamente para evitar flickering, enquanto a Server Action persiste a mudança em background.
2. **Server Actions com revalidação** — todas as mutações chamam `revalidatePath()` para sincronizar com o servidor após operações que não são de drag.

---

## Funcionalidades em Detalhe

### Autenticação e Autorização
- Registro com validação de email único e força de senha
- Login com cookies httpOnly e JWT assinado
- Controle de acesso por `role` (`member` vs. `admin`)
- Campo `tokenVersion` permite invalidar todas as sessões de um usuário sem alterar a senha
- Campo `isActive` permite bloquear usuário sem excluir dados

### Gerenciamento de Sprints
- Status workflow: `PLANNED → ACTIVE → COMPLETED`
- Ao criar o primeiro board de um sprint, 3 colunas padrão são geradas automaticamente: "A Fazer", "Em Andamento", "Concluído"
- Sprints encerrados podem receber avaliações de qualidade e dificuldade

### Board Kanban (Sprint Board)
- Drag & drop de cards entre colunas e dentro de colunas
- Drag & drop de colunas para reordenar
- Adição, renomeação e exclusão de colunas
- Adição rápida de card no topo ou no final de uma coluna
- Edição inline de título de coluna

### Cards
- Título, descrição (rich text), cor (9 opções), prioridade (alta/média/baixa)
- Datas de início e fim
- Múltiplos responsáveis por card
- Tags coloridas (por usuário)
- Anexos (imagens, PDFs, documentos Office) via Vercel Blob
- Imagem de capa (destaque visual no card)
- Timer de tempo integrado ao modal

### Rastreamento de Tempo
- Timer de início/pausa embutido em cada card
- Entradas manuais de horas/minutos
- Histórico completo de entradas com possibilidade de exclusão
- Total exibido no card e no modal
- Custo calculado no dashboard: `horas × valorHora do usuário`

### Tags
- Cada usuário cria e gerencia suas próprias tags
- Cada tag tem nome e cor hex
- Tags são atribuídas a cards via seletor multi-select
- Não permite nomes duplicados por usuário

### Importação CSV
- Modal de upload aceita arquivo `.csv`
- Mapeamento flexível de cabeçalhos para campos do sistema (ex.: "nome" → título, "descrição" → descrição)
- Suporte a datas em português: "1 de março de 2026"
- Tentativa de correspondência da coluna de status com as colunas existentes no sprint
- Validação linha a linha com relatório de erros
- Criação em batch de todos os cards válidos

### Dashboard e Analytics
- **KPIs gerais:** total de sprints, cards, horas acumuladas, custo total
- **Por sprint:** horas, custo, cards concluídos, cards atrasados
- **Por usuário:** horas registradas, custo, cards atribuídos
- **Cards atrasados:** cards com `endDate` passada e não na coluna "Concluído"
- **Gráficos:** custo por sprint (área/barra), horas por usuário — via Recharts

### Busca Global
- Pesquisa por título, descrição, nome de sprint e tags
- Case-insensitive via modo `insensitive` do Prisma
- Mínimo 2 caracteres, máximo 20 resultados
- Retorna card completo com sprint, coluna e tags

### Perfil e Admin
- Usuário edita: nome, email, cargo, departamento, valorHora, avatar
- Troca de senha com verificação da senha atual
- Admin pode criar, editar, ativar/desativar usuários e alterar roles

---

## Rotas de API REST

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/me` | Retorna dados do usuário autenticado |
| `GET` | `/api/search?q=query` | Busca global em cards, tags e sprints |
| `POST` | `/api/csv` | Importa cards de um arquivo CSV (multipart FormData) |
| `POST` | `/api/uploads` | Faz upload de arquivo e cria registro de Attachment |
| `DELETE` | `/api/uploads?id=attachmentId` | Remove arquivo do Blob e do banco |

A maioria das operações usa **Server Actions** diretamente, sem passar por rotas de API. As rotas REST acima existem para casos onde é necessário `FormData` (uploads, CSV) ou consumo direto pelo cliente (busca, info de usuário).

---

## Validação (Zod)

Cada domínio possui um arquivo de schema em `lib/validation/`:

| Arquivo | Schemas |
|---------|---------|
| `authSchemas.ts` | Login, registro, troca de senha |
| `cardSchemas.ts` | Criação e edição de card |
| `csvSchemas.ts` | Estrutura de linha CSV |
| `fileSchemas.ts` | Validação de tipo e tamanho de arquivo |
| `sprintSchemas.ts` | Criação e edição de sprint |
| `tagSchemas.ts` | Criação e edição de tag |
| `userSchemas.ts` | Edição de perfil e admin |

Todas as Server Actions validam o input com `.safeParse()` antes de chamar a camada de serviço.

---

## Testes

**Runner:** Vitest 4.1.2 com ambiente JSDOM

**Scripts:**
```bash
npm test              # modo watch
npm run test:run      # execução única
npm run test:coverage # cobertura via v8
```

**Organização:**

| Pasta | O que testa |
|-------|-------------|
| `__tests__/unit/services/` | Lógica de negócio isolada (Prisma mockado) |
| `__tests__/unit/actions/` | Server Actions com sessão mockada |
| `__tests__/unit/reducers/` | kanbanReducer |
| `__tests__/unit/validation/` | Schemas Zod |
| `__tests__/unit/lib/` | Utilitários (session, reorderUtils, etc.) |
| `__tests__/components/` | Componentes com Testing Library |
| `__tests__/integration/` | Actions e API com banco real ou MSW |
| `__tests__/api/` | Rotas REST |
| `__tests__/middleware/` | Middleware de autenticação |

---

## Segurança

| Mecanismo | Implementação |
|-----------|---------------|
| Armazenamento de senha | bcrypt com salt (rounds 10–12) |
| Sessão | JWT httpOnly cookie, `SameSite=strict` |
| Invalidação de sessão | Campo `tokenVersion` no usuário |
| Bloqueio de conta | Campo `isActive` verificado em cada request |
| Execução server-only | Pacote `server-only` no DAL e services |
| Permissão de arquivo | Delete de attachment verifica se usuário é responsável pelo card |
| Validação de input | Zod em toda entrada de dados (actions + API routes) |

---

## Configuração e Ambiente

**Variáveis de ambiente necessárias:**

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `SESSION_SECRET` | Chave de assinatura dos JWTs |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob para uploads |

**Comandos úteis:**
```bash
npm run dev           # servidor de desenvolvimento
npm run build         # build de produção
npx prisma migrate dev   # aplicar migrações
npx prisma generate      # regenerar cliente (roda automaticamente no postinstall)
npx prisma studio        # GUI do banco de dados
npx tsx prisma/seed.ts   # popular banco com dados iniciais
```

---

## Decisões de Arquitetura Notáveis

1. **App Router + Server Actions** — elimina a necessidade de uma API REST separada para a maioria das operações; o cliente chama funções TypeScript que rodam no servidor.

2. **Camada de serviços separada** — as Server Actions são finas (validação de sessão + input, chamada de serviço, revalidação). A lógica de negócio fica nos services para facilitar testes unitários independentes do framework.

3. **Prisma com adapter `pg`** — o Next.js 16 exige o uso explícito do adapter `@prisma/adapter-pg` em vez da integração padrão, por mudanças no runtime edge.

4. **Zod 4 com `.safeParse()`** — o projeto usa Zod v4, que tem APIs ligeiramente diferentes de v3 (ex.: `z.string().min()` com mensagens, tratamento de unions). Schemas centralizados em `lib/validation/`.

5. **Tags por usuário** — a constraint única `(name, userId)` permite que múltiplos usuários tenham tags com o mesmo nome sem conflito.

6. **Invalidação de sessão por `tokenVersion`** — ao incrementar esse campo, todas as sessões ativas do usuário são invalidadas sem precisar de uma lista negra de tokens.
