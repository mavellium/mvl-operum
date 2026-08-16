> Spec técnica de correções reportadas no board de sprint (kanban) e na busca lateral — causa raiz e proposta de correção para cada item, com arquivos e linhas de referência.

---

## 🗺️ Visão Geral

Lista de 9 problemas reportados em uso real (ex: `https://operum.adm.br/sprints/{sprintId}`), concentrados no board de sprint, na busca da sidebar e no upload de anexos:

1. Responsáveis fica "Carregando..." infinito ao criar card no backlog
2. Card fechado no kanban não expõe título/descrição/prioridade/responsáveis/Play-Stop de forma consistente
3. Mover card para cima na coluna causa scroll horizontal indevido e não respeita a posição
4. Sprint board não usa 100% da altura da tela — sobra espaço vazio no rodapé
5. Busca da sidebar não encontra tarefas da sprint, de outras sprints, projetos ou pessoas
6. Iniciar tempo não move o card para "Em andamento" automaticamente
7. Avatar do responsável some ao reabrir o card após adicioná-lo
8. É preciso recarregar a página para ver um responsável recém-adicionado
9. Upload de anexo falha com HTTP 500 `{"error":"Falha ao registrar o anexo"}` em produção

Todas as causas raízes abaixo foram levantadas por leitura direta do código (frontend Next.js + `sprint-service`/`file-service` NestJS).

---

## 🏗️ Arquitetura relevante

**Frontend (Next.js)**
- `components/sprint/SprintBoard.tsx` — container do board, DnD context, coluna backlog, modais, layout de altura
- `components/board/Column.tsx` — uma coluna do kanban (`Droppable`/`Draggable`, `@hello-pangea/dnd`)
- `components/card/Card.tsx` — card fechado (colapsado) dentro de uma coluna
- `components/card/CardModal.tsx` — card aberto/edição
- `components/card/MultiUserSelector.tsx` — seletor de responsáveis (usado no modal e na criação)
- `components/card/CardTimer.tsx` — timer real (play/stop) dentro do `CardModal`
- `components/search/GlobalSearch.tsx` — input de busca da sidebar
- `app/api/search/route.ts` — rota Next.js que hoje só repassa `q` para `cardsApi.search`
- `app/actions/time.ts`, `app/actions/cardResponsible.ts`, `app/actions/sprintBoard.ts` — Server Actions

**Backend**
- `sprint-service/src/card/card.controller.ts` / `card.service.ts` — cards, colunas, responsáveis, tempo (NestJS + Prisma, banco próprio)
- `sprint-service/prisma/schema.prisma` — modelo `User` local do sprint-service (réplica, sem `avatarUrl`)
- Banco principal (Prisma raiz) — fonte de verdade de `UserProject` com `avatarUrl`
- `app/api/uploads/route.ts` — proxy Next.js para upload/exclusão de anexos
- `file-service/src/upload/upload.service.ts` — grava o arquivo no MinIO e o registro `Attachment` no Postgres (schema `files`)
- `file-service/prisma/schema.prisma` — modelo `Attachment`, `datasource.schemas = ["files"]` (multiSchema)

**Ponto estrutural importante**: o app não tem header superior fixo — a navegação/busca vivem numa sidebar full-height (`components/layout/AppShell.tsx`, `components/layout/SidebarLayout.tsx`).

---

## 🔧 Correção 1 — Responsáveis "Carregando..." infinito ao criar card no backlog

**Causa raiz**: `components/card/MultiUserSelector.tsx:28-41`. O estado `loading` é inicializado com o valor da prop `pending` (`useState(pending)`), e o `useEffect` que busca os usuários faz `return` antecipado quando `pending === true` (linha 33) — ou seja, `setLoading(false)` (linha 39) **nunca é chamado** nesse modo. Como a criação de card no backlog sempre renderiza `<MultiUserSelector pending .../>` (`components/card/CardModal.tsx:685-691`), o componente fica travado exibindo só `"Carregando..."` (linha 84); o `<select>`/toggle de usuários nunca chega a montar.

**Correção proposta**: ajustar o efeito para também resolver `loading=false` em modo `pending` (buscando a lista de usuários normalmente, só adiando é a persistência do vínculo — não a exibição da lista). Os responsáveis escolhidos durante a criação ficam em estado local até o card ser salvo, momento em que são persistidos via `addResponsibleAction`.

**Arquivos**: `components/card/MultiUserSelector.tsx`, `components/card/CardModal.tsx`

---

## 🔧 Correção 2 — Card fechado no kanban: título, descrição, prioridade, responsáveis, Play/Stop

**Estado atual**: `components/card/Card.tsx` já renderiza título (106-108), descrição truncada (136-144), indicador de prioridade (111-122), badges de tag (96-102), capa (86-91), contagem de anexos (153-160) e até 3 avatares de responsáveis + "+N" (199-212) — esses campos **já existem e não precisam de nova implementação**, apenas validação visual.

**Causa raiz do que falta (Play/Stop)**: o botão de timer no card fechado (`Card.tsx`, `useState` local de `isTimerRunning` ~linha 42, `handleTimerClick` 53-56, label fixo `"01:23"` na linha 177) é puramente decorativo — não chama nenhuma server action, não reflete tempo real, reseta a cada remontagem. O timer funcional de verdade só existe em `components/card/CardTimer.tsx`, montado exclusivamente dentro do `CardModal` aberto (linha 767).

**Correção proposta**: substituir o timer fake do card fechado pela integração real com `startTimerAction` / `pauseTimerAction` / `getActiveTimerAction` / `getCardTimeAction` (`app/actions/time.ts:34-76`), de forma que o estado do timer (rodando ou não, tempo acumulado) seja o mesmo em `Card.tsx` e `CardTimer.tsx` — hoje são duas fontes de verdade divergentes.

**Arquivos**: `components/card/Card.tsx`, `components/card/CardTimer.tsx`, `app/actions/time.ts`

---

## 🔧 Correção 3 — Mover card para cima na coluna: scroll horizontal indevido e posição não respeitada

**Causa raiz A (scroll horizontal)**: `components/sprint/SprintBoard.tsx:144-163` implementa um auto-scroll horizontal customizado disparado por mouse-drag no container do board, guardado por `target.closest('.drag-handle')` (linha 147). Nenhum elemento em `Card.tsx`/`Column.tsx` carrega de fato a classe `.drag-handle` — o `dragHandleProps` do `@hello-pangea/dnd` é espalhado no card/cabeçalho da coluna inteira, não numa alça dedicada. Resultado: a guarda nunca casa, então iniciar o drag de um card também arma o scroll horizontal customizado, causando jitter/scroll lateral durante o drag.

**Causa raiz B (posição não respeitada)**: mover um card para uma posição/coluna anterior (posição menor) não atualiza o estado `columns` imediatamente — apenas abre o diálogo de motivo via `pendingMove` (`SprintBoard.tsx:282-292`) e retorna sem "splicar" o card no novo lugar. Como o React state não muda, o `@hello-pangea/dnd` anima o card de volta à posição original assim que a animação de drop termina — lido pelo usuário como "a posição que eu escolhi não é respeitada", até preencher o motivo e `confirmPendingMove` (306-317) rodar o move de verdade.

**Correção proposta**:
- (a) Adicionar a classe `.drag-handle` de fato no elemento correto (ou remover a guarda condicional e usar outro sinal, como um `data-attribute` setado durante `onDragStart`/`onDragEnd` do `DragDropContext`) para que o auto-scroll customizado nunca dispare durante um drag de card.
- (b) Aplicar a atualização otimista de `columns` no início do `pendingMove` (antes de abrir o diálogo), revertendo apenas se o usuário cancelar.

**Arquivos**: `components/sprint/SprintBoard.tsx`, `components/board/Column.tsx`, `components/card/Card.tsx`

---

## 🔧 Correção 4 — Sprint board não usa 100% da altura da tela

**Causa raiz**: `components/sprint/SprintBoard.tsx:431` define o wrapper raiz como `className="h-[calc(100vh-64px)] w-full flex flex-col overflow-hidden ..."`, subtraindo 64px assumindo um header superior fixo. Esse header **não existe** — `components/layout/AppShell.tsx` documenta explicitamente que o app não tem header top (navegação/busca vivem na sidebar), e tanto `app/layout.tsx` (`<body className="h-full flex flex-col">`) quanto `app/projetos/[projetoId]/layout.tsx` (`<main className="flex-1 min-w-0 h-full overflow-y-auto">`) já entregam 100% da altura disponível ao `SprintBoard`. O resultado é uma sobra de 64px vazios no rodapé, sem nada ocupando esse espaço.

**Correção proposta**: trocar `h-[calc(100vh-64px)]` por `h-full` em `SprintBoard.tsx:431`, mantendo `flex flex-col overflow-hidden`.

**Arquivos**: `components/sprint/SprintBoard.tsx`

---

## 🔧 Correção 5 — Busca da sidebar não encontra tarefas/sprints/projetos/pessoas

**Causa raiz**: dois problemas empilhados.
1. `app/api/search/route.ts` recebe `context`/`contextId` (calculados em `GlobalSidebar.tsx:53-63` e `ProjectSidebar.tsx:100-108`, ex: `global_projects`, `project_items`, `sprint_items`, `project_members`) mas **nunca os lê nem repassa** — sempre chama `cardsApi.search(q)` sem nenhum escopo (linha 17), então placeholders diferentes ("Buscar projetos...", "Buscar membros...", "Buscar cards e sprints...") disparam exatamente a mesma query irrestrita.
2. O backend não tem a rota que o frontend chama: `cardsApi.search` bate em `GET /cards/search` (`lib/api-client.ts:356-357`, roteado via api-gateway para o sprint-service), mas `sprint-service/src/card/card.controller.ts` só define `@Get('cards/:id')` — o NestJS interpreta `"search"` como o parâmetro `:id`, cai em `findOne('search')`, não encontra nada e lança `NotFoundException`, capturado por `app/api/search/route.ts` como `{ results: [] }`. **A busca de cards está sempre vazia**, não apenas mal escopada.

**Correção proposta** (ordem de prioridade pedida: tarefas da sprint atual → outras sprints → projetos → pessoas):
1. Criar uma rota real `GET /cards/search` em `sprint-service/src/card/card.controller.ts`, declarada **antes** de `@Get('cards/:id')` no arquivo para não colidir com o parâmetro dinâmico.
2. Implementar a busca por texto (título/descrição) com filtros opcionais `sprintId`, `projectId`, `responsibleUserId`, reaproveitando os mesmos `include` já usados em `listBySprint`/`listBacklog` (`card.service.ts:40-60`): `tags`, `responsibles.user`, `attachments`.
3. `app/api/search/route.ts` passa a usar `context`/`contextId` para montar os parâmetros da chamada, priorizando: sprint atual → demais sprints do projeto → projetos → pessoas/responsáveis.
4. `GlobalSearch.tsx` agrupa/ordena os resultados por essas categorias em vez de tratá-los como uma lista plana.

**Arquivos**: `app/api/search/route.ts`, `components/search/GlobalSearch.tsx`, `lib/api-client.ts`, `sprint-service/src/card/card.controller.ts`, `sprint-service/src/card/card.service.ts`

---

## 🔧 Correção 6 — Iniciar tempo deve mover o card para "Em andamento"

**Causa raiz**: `startTimerAction` (`app/actions/time.ts:34-43`) apenas cria/inicia um `TimeEntry` via `cardsApi.startTimer` — nunca chama `cardsApi.update` ou a lógica de mover card usada no drag-and-drop para alterar `sprintColumnId`/status. Hoje mover para "Em andamento" é 100% manual (drag). (A correção de mocks em `getCardTimeAction`/`getActiveTimerAction` no commit `abaeee1e` cobriu só testes, não este comportamento.)

**Correção proposta**: ao iniciar o timer com sucesso, se o card ainda não estiver na coluna "Em andamento" (ou equivalente) daquela sprint, mover automaticamente — reaproveitando a mesma função de persistência de movimento de coluna já usada em `handleDragEnd`/`confirmPendingMove` (`components/sprint/SprintBoard.tsx`), disparada tanto de `CardTimer.tsx` quanto do novo Play/Stop do card fechado (Correção 2).

**Arquivos**: `app/actions/time.ts`, `components/card/CardTimer.tsx`, `components/card/Card.tsx`, `components/sprint/SprintBoard.tsx`

---

## 🔧 Correções 7 e 8 — Avatar do responsável some ao reabrir / é preciso recarregar para ver o vínculo

Tratadas juntas porque **compartilham a mesma causa raiz**.

**Causa raiz**: existem duas fontes de dados de usuário divergentes:
- `getSprintBoardAction` (`app/actions/sprintBoard.ts:31-42`) monta a prop `users` a partir do banco principal (Prisma `userProject`), que **tem** `avatarUrl`.
- `columns`/`backlogCards` (e `getResponsiblesAction`, `app/actions/cardResponsible.ts:26-34`) vêm do **sprint-service**, cujo modelo `User` local (`sprint-service/prisma/schema.prisma:23-39`) **não tem coluna `avatarUrl`**. `card.service.ts` (`findOne`/`listBySprint`/`listBacklog`, linhas 41-77) faz `include: { user: true }` sobre essa réplica sem avatar.

Ao adicionar um responsável, `MultiUserSelector.handleToggle` (não-`pending`) chama `addResponsibleAction` e depois **fabrica o objeto localmente** a partir da prop `users` (fonte correta, com avatar) para atualizar a UI otimisticamente via `onResponsiblesChange` → `SprintBoard.tsx:693-699` (`patchCardState`). É por isso que o avatar aparece **na hora**. Ao reabrir o card (remonta `MultiUserSelector` sem `pending`), ele refaz o fetch via `getResponsiblesAction`, que lê do sprint-service — sem `avatarUrl` — e o avatar some. Um F5 não resolve de fato o problema (a página volta a ler do sprint-service, que continua sem o dado); qualquer aparência de "reload ajuda" é resultado de estado local otimista ainda não descartado, não uma correção real.

`getSprintBoardAction` já tem um padrão de enriquecimento equivalente para anexos (linhas 47-84), mas **não faz o mesmo para responsáveis**.

**Correção proposta**: enriquecer o payload de responsáveis vindo do sprint-service (seja em `getResponsiblesAction`, seja no carregamento de `columns`/`backlogCards` dentro de `getSprintBoardAction`) cruzando por `userId` com os dados de `avatarUrl` do banco principal — mesmo padrão já usado para anexos. Isso resolve o avatar sumindo (7) e, ao garantir que o estado seja atualizado localmente sem depender de refetch incompleto, elimina a necessidade de reload manual (8).

**Não requer alterar o schema do sprint-service** (evita repetir o incidente já registrado de `prisma db push` cross-serviço quebrando colunas de outros serviços) — o enriquecimento acontece na camada de Server Action/Next.js, cruzando dados de dois serviços já acessíveis.

**Arquivos**: `app/actions/cardResponsible.ts`, `app/actions/sprintBoard.ts`, `components/card/MultiUserSelector.tsx`

---

## 🔧 Correção 9 — Upload de anexo falha com 500 em produção (`POST /api/uploads`)

**Fluxo confirmado**: `app/api/uploads/route.ts:42-64` (proxy Next.js) → `file-service` `POST /files/upload` → `file-service/src/upload/upload.service.ts:56-88` (`UploadService.upload`). O upload para o MinIO (linha 68) funciona normalmente; quem falha é o `prisma.attachment.create` (linhas 73-82), capturado por um `catch` vazio (linha 83) que **descarta o erro real** (sem `console.error`/`Logger` algum) e sempre relança a mesma `InternalServerErrorException('Falha ao registrar o anexo')` — por isso o erro chega ao frontend sem nenhuma pista da causa.

**Causa raiz confirmada**: o commit mais recente do repositório, `3111cb71 "fix(file-service): migration corretiva do schema files (Attachment em public quebra o insert de anexos em producao)"`, já havia diagnosticado corretamente este exato problema. A migration inicial do file-service (`20260421003957_init`) criou a tabela `Attachment` sem qualificação de schema, caindo em `public`, enquanto `file-service/prisma/schema.prisma:10,26` (`datasource.schemas = ["files"]`, `@@schema("files")`) espera a tabela em `"files"."Attachment"` — resultado em produção: o upload pro MinIO funciona, mas o `INSERT` falha com Prisma `P2021` (tabela não encontrada) porque a tabela real está no schema errado.

A migration corretiva `20260814000000_fix_attachment_schema` (`file-service/prisma/migrations/20260814000000_fix_attachment_schema/migration.sql`) resolve isso via `ALTER TABLE "public"."Attachment" SET SCHEMA "files"` — **mas o arquivo de migration nunca foi aplicado no banco de produção**, porque o pipeline de deploy não tem nenhum passo de `prisma migrate deploy` para o `file-service` (nem para nenhum outro microserviço):
- `docker-compose.yml:244-261` define um serviço `migrate`, mas ele roda a imagem do **monólito Next.js raiz** contra o `prisma/schema.prisma` da raiz (schema `public`, sem multiSchema) — não tem relação com `file-service/prisma/schema.prisma`.
- `docker-compose.production.yml` e `docker-compose.staging.yml` não têm nenhum serviço `migrate` para `file-service` — o serviço sobe direto da imagem prebuilt.
- `file-service/Dockerfile:53` executa só `CMD ["node", "dist/main"]`, sem etapa de `prisma migrate deploy` no entrypoint.

Ou seja: o código do fix foi commitado corretamente, mas o banco de produção nunca recebeu a DDL — o `P2021` continua ocorrendo, agora apenas escondido atrás da mensagem genérica `catch` sem logging.

**Correção proposta**:
1. **Ação imediata (operação, não código)**: rodar manualmente `pnpm --filter file-service exec prisma migrate deploy` (ou equivalente) contra o banco de produção para aplicar a migration `20260814000000_fix_attachment_schema` pendente. Isso deve resolver o 500 imediatamente.
2. **Correção estrutural**: adicionar um passo de `prisma migrate deploy` por microserviço no pipeline de deploy — seja um serviço `migrate` dedicado por serviço em `docker-compose.production.yml`/`docker-compose.staging.yml` (mesmo padrão do `migrate` do monólito em `docker-compose.yml:244-261`, mas apontando para a imagem e o schema de cada serviço), seja um entrypoint script no `Dockerfile` de cada serviço (`file-service`, `auth-service`, `project-service`, `sprint-service`, `notification-service`) que roda `prisma migrate deploy` antes de `node dist/main`.
3. **Observabilidade**: trocar os `catch { ... }` mudos em `upload.service.ts` (linhas 83-87, e os equivalentes em `listByCards`, `setCover`, `rename`, `delete`, `getPresignedUrl` no mesmo arquivo) por `catch (err) { logger.error(err); ... }`, para que falhas de banco futuras apareçam nos logs em vez de serem descartadas silenciosamente — foi essa lacuna que tornou o diagnóstico deste incidente mais lento.

**Arquivos**: `file-service/src/upload/upload.service.ts`, `file-service/prisma/migrations/20260814000000_fix_attachment_schema/migration.sql` (já existe — precisa apenas ser aplicado em produção), `docker-compose.production.yml`, `docker-compose.staging.yml`, `file-service/Dockerfile` (e equivalentes dos demais microserviços).

---

## 📋 Tabela de arquivos afetados

| Arquivo | Correção(ões) | Tipo |
|---|---|---|
| `components/card/MultiUserSelector.tsx` | 1, 7/8 | Frontend |
| `components/card/CardModal.tsx` | 1 | Frontend |
| `components/card/Card.tsx` | 2, 3, 6 | Frontend |
| `components/card/CardTimer.tsx` | 2, 6 | Frontend |
| `components/sprint/SprintBoard.tsx` | 3, 4, 6 | Frontend |
| `components/board/Column.tsx` | 3 | Frontend |
| `components/search/GlobalSearch.tsx` | 5 | Frontend |
| `app/api/search/route.ts` | 5 | Frontend (route handler) |
| `lib/api-client.ts` | 5 | Frontend (client HTTP) |
| `app/actions/time.ts` | 2, 6 | Frontend (server action) |
| `app/actions/cardResponsible.ts` | 7, 8 | Frontend (server action) |
| `app/actions/sprintBoard.ts` | 7, 8 | Frontend (server action) |
| `sprint-service/src/card/card.controller.ts` | 5 | Backend |
| `sprint-service/src/card/card.service.ts` | 5 | Backend |
| `app/api/uploads/route.ts` | 9 | Frontend (route handler) |
| `file-service/src/upload/upload.service.ts` | 9 | Backend |
| `file-service/prisma/migrations/20260814000000_fix_attachment_schema/migration.sql` | 9 | Migration (pendente de deploy) |
| `docker-compose.production.yml` / `docker-compose.staging.yml` | 9 | Infra |
| `file-service/Dockerfile` (e demais microserviços) | 9 | Infra |

---

## ⚠️ Riscos e observações

- **Sem migration de schema** para o fix de avatar (7/8) — o enriquecimento é feito cruzando dados na camada Next.js/Server Actions, não alterando o `sprint-service`. Evita repetir o incidente conhecido de `prisma db push` derrubando colunas de outros serviços no banco compartilhado.
- A nova rota `GET /cards/search` (Correção 5) precisa ser declarada **antes** de `GET /cards/:id` no controller do sprint-service, senão volta a colidir com o parâmetro dinâmico.
- A correção 3(a) (drag-handle) e a correção 6 (mover ao iniciar timer) tocam a mesma função de persistência de movimento de card em `SprintBoard.tsx` — implementar 6 depois de validar que 3 não introduziu regressão nesse fluxo.
- Correção 2 (timer no card fechado) e Correção 6 (mover para "Em andamento") são melhor entregues juntas, já que ambas dependem de conectar o Play/Stop a `app/actions/time.ts` de verdade.
- **Correção 9 expõe um risco de infraestrutura maior que os demais itens**: nenhum microserviço deste monorepo (`auth-service`, `project-service`, `sprint-service`, `notification-service`, `file-service`) tem um passo automatizado de `prisma migrate deploy` no pipeline de deploy — só o monólito Next.js raiz tem. Isso significa que **pode haver outras migrations pendentes** não aplicadas em produção além desta, e o mesmo tipo de incidente (código corrigido, banco não migrado, erro genérico sem log) pode se repetir em qualquer um desses serviços. Recomenda-se tratar a correção estrutural (item 2 da Correção 9) com prioridade, não apenas o unblock manual.

---

## 🔗 Ver também

- [[Card Movement Feature]] — histórico de movimentação de cards (spec de memória do projeto)
- `docs/architecture.md` — arquitetura geral dos serviços
- `docs/specs/login.md` — referência de formato para specs técnicas deste projeto
