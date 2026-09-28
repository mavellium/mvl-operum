# SDD — Backlog do Operum (setembro/2026)

> **Escopo:** as 36 tarefas abertas do projeto **Operum** (tenant "Fábio", Sprint 1 + backlog), levantadas em 28/09/2026. Inclui os pedidos do documento "07 - Ajustes e melhorias sistema Operum 26-09-26" (Prof. Fábio), bugs do quadro e melhorias do MCP.
>
> Segue a arquitetura do repo: Next.js 16 (App Router, `proxy.ts`), React 19, Prisma 7, Zod 4, Vitest 4, microsserviços NestJS atrás do api-gateway e multi-tenant via `verifySession`. Actions finas → services → auditoria.
>
> Marcações: **✅** causa confirmada no código • **🔎** hipótese a confirmar em produção • **⚠️ DECISÃO** pendente • **⛔** bloqueado por insumo externo.

## Índice

- [Critério de priorização](#critério-de-priorização)
- [Mapa das tarefas](#mapa-das-tarefas)
- [Fase 1 — Erros, perda de dados e prioridade alta](#fase-1--erros-perda-de-dados-e-prioridade-alta)
- [Fase 2 — Kanban e card no uso diário](#fase-2--kanban-e-card-no-uso-diário)
- [Fase 3 — Cadastros, ranking e sessão](#fase-3--cadastros-ranking-e-sessão)
- [Fase 4 — EAP / WBS](#fase-4--eap--wbs)
- [Fase 5 — Documentos (⛔ aguardando modelos)](#fase-5--documentos--aguardando-modelos)
- [Fase 6 — MCP](#fase-6--mcp)
- [Fora do escopo](#fora-do-escopo)
- [Processo por tarefa](#processo-por-tarefa)

---

## Critério de priorização

A ordem abaixo decide a fase de cada tarefa. Em caso de empate, vale a prioridade marcada no Operum.

1. **Erro ou perda de dados.** A funcionalidade quebra ou o usuário perde trabalho.
2. **Prioridade alta** no Operum.
3. **Atrito diário no kanban.** Algo que o usuário esbarra várias vezes por dia.
4. **Feature nova.**
5. **Depende de insumo externo** (modelos de documento, vídeos, decisão do professor).

Tarefas que pedem a mesma coisa foram **fundidas**. A tabela abaixo mostra quais.

## Mapa das tarefas

| Fase | Item | Card(s) no Operum | Prioridade |
|---|---|---|---|
| 1 | 1.1 | MCP: list_tasks e export_project falhando com "Operum indisponível" | alta |
| 1 | 1.2 | Documentos: Estrutura Analítica do Projeto dá erro interno · Adicionar documento novo: EAP | alta |
| 1 | 1.3 | Corrigir adicionar anexo | média |
| 1 | 1.4 | Stakeholders: cadastro de funções deve ser global | alta |
| 1 | 1.5 | Cadastro de Funções: "Gerente de Projetos" em duplicidade | média |
| 1 | 1.6 | Ao escrever na descrição já salvar automaticamente | média (perda de dados) |
| 1 | 1.7 | Exibir e editar data de entrega (prazo) do card na interface | alta |
| 2 | 2.1 | Visualização do minicard está horrível · Corrigir card enquanto estão fechados no kanban | média |
| 2 | 2.2 | Corrigir a barra de pesquisa do menu lateral · Buscar cards de todas as sprints | média |
| 2 | 2.3 | Responsável só aparece após recarregar · Foto do responsável some | média |
| 2 | 2.4 | Em Sprint: o menu lateral está vindo o do admin | média |
| 2 | 2.5 | Usar 100% da tela · Scroll ao mover card · "Carregando…" infinito no backlog · Timer move para "Em andamento" (itens em teste) | média |
| 2 | 2.6 | Prazo: filtros e ordenação (continuação do 1.7) | alta |
| 2 | 2.7 | Zerar os erros de TypeScript (`tsc`) já existentes | média |
| 2 | 2.8 | Página /arquivos lê `public.Attachment`, que não existe mais | alta |
| 3 | 3.1 | Ranking dos Membros: função dos stakeholders não aparece | média |
| 3 | 3.2 | Stakeholders: adicionar pela barra de pesquisa de forma mais fácil | média |
| 3 | 3.3 | Menu: trocar o nome "Tenants" | baixa |
| 3 | 3.4 | Adicionar controle de sessão (expirar por inatividade) | média |
| 4 | 4.1 | EAP: ícone de expansão na parte inferior central, só "+" | média |
| 4 | 4.2 | A EAP só organiza na forma normal e vertical · Adicionar o jeito de visualizar do vídeo | média |
| 4 | 4.3 | EAP: modos "WBS Chart View Details" e "WBS Hours and Cost View" | média |
| 4 | 4.4 | Gráfico de Gantt do projeto | média |
| 5 | 5.1 | Documentos: Formulário de Partes Interessadas em paisagem | média ⛔ |
| 5 | 5.2 | Documentos: corrigir Termo de Abertura | média ⛔ |
| 5 | 5.3 | Documentos: corrigir Atas | média ⛔ |
| 6 | 6.1 | MCP: copiar/importar para dentro de um projeto existente | média |
| 6 | 6.2 | MCP: tool para anexar arquivos em cards | média |
| — | — | Integrar Operum com MCP Claude (entregue na PR #19, validar e fechar) | média |
| — | — | Adicionar plano de custo (já existe em `/projetos/:id/planilha-custos`, validar e fechar) | média |
| — | — | Integração com o Zoom (vai para SDD próprio) | média |
| — | — | Título da página = nome do projeto (já concluído) | — |

---

## Fase 1 — Erros, perda de dados e prioridade alta

### 1.1 MCP devolve "Operum indisponível" em `list_tasks` e `export_project` ✅

**Problema:** em 27/09, por cerca de 30 minutos, `operum_list_tasks` e `operum_export_project` falharam nos dois tenants, enquanto `list_projects` e `get_project` funcionavam.

**Causa raiz:** a migration `fix_attachment_schema` do file-service moveu `public."Attachment"` para `files."Attachment"`. O sprint-service continuava fazendo `include: { attachments }` nas queries de card, e toda rota que carrega cards passou a responder 500 (P2021, tabela inexistente). Já foi corrigido em `06b376d1` (branch `fix/deploy-skipped-on-push`, **ainda fora da `main`**).

**Problema secundário:** `mcp-server/src/errors.ts` transforma qualquer status não mapeado em "Operum indisponível no momento", o que escondeu que era um 500 do sprint-service.

**Solução:**
- Levar `06b376d1` para a `main` e fazer o deploy.
- No `toToolError`, separar os casos:
  - **5xx:** `Erro <status> no Operum ao <operação>. Detalhe: <publicMessage, se houver>. Tente de novo; se persistir, avise o administrador.`
  - **Falha de rede ou timeout** (sem status): manter "indisponível", mas dizer que é falha de conexão.
- Nunca expor stack, URL interna ou corpo bruto (regra SDD MCP 6.5). O log do servidor continua com o detalhe completo.

**Arquivos:** `mcp-server/src/errors.ts`, `mcp-server/src/__tests__/errors.test.ts`.

```gherkin
Cenário: erro 500 do serviço chega ao agente com o status
  Dado que o gateway responde 500 em GET /cards
  Quando o agente chama operum_list_tasks
  Então a mensagem contém "Erro 500"
  E não contém URL interna nem stack trace
```

### 1.2 Documento EAP dá "Erro interno" ✅ / 🔎

**Problema:** ao abrir o documento Estrutura Analítica do Projeto (Documentação → EAP), a tela mostra "Erro interno".

**Causas encontradas:**
1. ✅ **As migrations do app não rodam no deploy de produção.** Os serviços `migrate` (app, schema `public`) e `migrate-sprint-service` ficam no profile `migration` do `docker-compose.yml`. O `scripts/deploy/remote-deploy.sh` roda só `up -d`, por paridade com o webhook antigo. Só o auth-service e o file-service migram no boot (via `docker-entrypoint.sh`). Por isso, a migration `20260921000000_add_eap_template_document`, que cria `EapTemplate` e `EapDocument`, 🔎 provavelmente nunca foi aplicada em produção, e `prisma.eapDocument.findUnique` falha com P2021.
2. ✅ **A rota esconde a causa.** Em `app/api/projects/[projetoId]/eap/route.ts`, o `GET` só trata `EapNotFoundError`. Um `EapValidationError` lançado por `toClientDocument → normalizeNodes`, por exemplo num documento salvo com mais de uma raiz, vira 500 "Erro interno" em vez de uma mensagem útil.

**Solução:**
- **Deploy:** em `remote-deploy.sh`, antes do `up -d`, rodar `docker compose … --profile migration run --rm migrate` (o `prisma migrate deploy` do app). Se falhar, aborta o deploy sem trocar as imagens em execução.
- **Rota:** o `GET` passa a tratar `EapValidationError` (422, com a mensagem). Um erro Prisma de tabela inexistente (`P2021`) é logado com o código e devolve 503 "Documento EAP indisponível: banco desatualizado". Os logs trazem `projetoId` e o código do erro.
- ✅ **Confirmado em produção em 28/09/2026** (consulta somente leitura):
  - a última migration do app aplicada é a `20260902024539_add_ata_member_refs`, e as anteriores foram aplicadas à mão;
  - a `20260921000000_add_eap_template_document` **não foi aplicada**;
  - `EapDocument` e `EapTemplate` não existem.

  A mesma tabela `_prisma_migrations` guarda as migrations do auth-service e do file-service, que rodam `migrate deploy` no boot sem problema. Isso mostra que as entradas de outros serviços não quebram o `migrate deploy` do app.
- `docker-compose.production.yml` fixa o serviço `migrate` na imagem `app:prod`, a mesma do app. Antes ele herdava `${IMAGE_TAG}`.

**Arquivos:** `scripts/deploy/remote-deploy.sh`, `app/api/projects/[projetoId]/eap/route.ts`, teste da rota.

### 1.3 Adicionar anexo falha ✅

**Problema:** enviar um anexo no card retorna erro.

**Causa raiz:** `app/api/uploads/route.ts` confere o acesso com `cardsApi.get(cardId)`. Essa rota do sprint-service é a mesma que respondia 500 no item 1.1. O `.catch(() => null)` transformava o 500 em **403 "Acesso negado"**, e o usuário via uma mensagem enganosa. Resolvido pelo mesmo fix `06b376d1`.

**Solução complementar:**
- Na verificação do card, distinguir falha de acesso de falha do serviço: logar o erro e responder 502 "Não foi possível verificar o card agora", em vez de 403.
- `DELETE /api/uploads` não envia `X-Tenant-Id` ao file-service. Passar a enviar, igual ao `POST`.

**Arquivos:** `app/api/uploads/route.ts`.

### 1.4 Funções dos stakeholders devem ser globais ✅

**Problema:** depois de cadastrar um stakeholder e abrir a edição, o campo "Funções" não lista nada. O professor quer que as funções valham para todos os projetos, sem associar uma a uma.

**Causa raiz:** `app/projetos/[projetoId]/stakeholders/page.tsx` monta `funcoesDoProjeto` filtrando o catálogo (`rolesDb`) pelas associações `ProjetoFuncao` (`listarFuncoesAssociadas`). Em projeto novo não há associação nenhuma, então a lista vem vazia.

**Solução:**
- O seletor de funções passa a oferecer **todo o catálogo do tenant** (`Role`, `deletedAt: null`), deduplicado pela chave normalizada do item 1.5.
- A associação `ProjetoFuncao` continua existindo, mas não é mais pré-requisito para usar a função.
- A tela `/projetos/:id/funcoes` troca o texto para "Funções do catálogo global (todas disponíveis em todos os projetos)". O CRUD fica no admin.
- Departamentos seguem com associação por projeto: o pedido cita só funções.

**Arquivos:** `app/projetos/[projetoId]/stakeholders/page.tsx`, `app/projetos/[projetoId]/funcoes/page.tsx`, `services/projetoCadastroService.ts` (nova `listarCatalogoFuncoes(tenantId)`).

```gherkin
Cenário: projeto novo já oferece as funções do catálogo
  Dado um tenant com as funções "Analista" e "Gerente de Projeto"
  E um projeto recém-criado sem nenhuma associação de função
  Quando o gerente edita um stakeholder
  Então o campo Funções oferece "Analista" e "Gerente de Projeto"
```

### 1.5 "Gerente de Projetos" duplicado no cadastro de funções ✅

**Problema:** a função aparece duas vezes no cadastro.

**Causa raiz:** há três formas diferentes de gerar o `nameKey`:

| Onde | Chave gerada |
|---|---|
| `services/projectRoleService.ts` (papel RBAC do gerente) | fixa `'gerente'`, escopo `PROJETO` |
| `app/actions/roles.ts` → `getOrCreateRoleAction` (tela admin) | slug `gerente-de-projetos`, escopo `TENANT`, e compara só pelo nome exato em minúsculas |
| `services/roleService.ts` → `normalizeNome` | nome em minúsculas |

O índice único é `@@unique([nameKey, tenantId, scope])`. Por isso "Gerente de Projeto" (PROJETO, `gerente`) e "Gerente de Projetos" (TENANT, `gerente-de-projetos`) convivem. O catálogo lista todas as `Role` do tenant sem filtrar escopo, e as duas aparecem.

**Solução:**
- **Função pura `funcaoKey(nome)`** em `lib/utils/normalize.ts`: minúsculas, sem acento, espaços colapsados e plural simples removido por palavra (`projetos → projeto`). Serve só para detectar equivalência, sem mudar o `nameKey` gravado.
- **Bloqueio na criação e na renomeação.** `getOrCreateRoleAction` compara pela `funcaoKey` com todas as funções ativas do tenant, em qualquer escopo, e devolve a existente. `updateRoleNameAction` recusa um nome equivalente a outra função: "Já existe a função X".
- **Script `scripts/dedupe-funcoes.ts`**, idempotente, com dry-run por padrão e `--apply` para gravar. Para cada tenant, agrupa as funções pela `funcaoKey`. A vencedora é o papel RBAC `gerente`/`PROJETO`, se estiver no grupo; senão, a mais antiga. As demais têm as referências repassadas à vencedora:
  - `UserProjectRole.roleId`;
  - `ProjetoFuncao` (pulando as que já existem);
  - `RolePermission` que faltar.

  Depois, as duplicadas recebem soft delete (`deletedAt`). O relatório lista o que foi fundido.

**Arquivos:** `lib/utils/normalize.ts`, `app/actions/roles.ts`, `scripts/dedupe-funcoes.ts`, testes de `funcaoKey` e da lógica de agrupamento (função pura `planejarDeduplicacao`).

### 1.6 Descrição do card deve salvar sozinha ✅

**Problema:** quem escreve a descrição e fecha o card sem clicar em "Salvar" perde o texto.

**Causa raiz:** `components/card/CardModal.tsx` guarda o rascunho em `draftDescription`, e o texto só vai para o servidor em `handleSaveDescription` (botão "Salvar") ou no `handleSave` geral do modal.

**Solução:**
- Hook `useAutosave(value, save, { delay: 800 })` em `hooks/`, com três comportamentos:
  - **debounce:** salva quando o texto para de mudar;
  - **flush imediato:** ao perder o foco, ao fechar o modal e ao desmontar;
  - **estado:** `idle | pending | saving | saved | error`.
- Indicador discreto ao lado do título "Descrição": "Salvando…", "Salvo" ou "Erro ao salvar. Tentar de novo".
- `beforeunload` ativo só enquanto houver alteração pendente.
- O botão "Salvar" da descrição sai. O "Cancelar" vira "Desfazer" e volta ao último valor salvo.
- Vale só para card existente. Na criação, a descrição continua indo junto do "Criar".

**Arquivos:** `hooks/useAutosave.ts`, `components/card/CardModal.tsx`, `__tests__/hooks/useAutosave.test.ts`.

### 1.7 Prazo do card na interface ✅

**Problema:** a API e o MCP já gravam `startDate` e `endDate` no card (`types/kanban.ts`), mas a interface não mostra nem edita esses campos.

**Solução (Fase 1):**
- **No `CardModal`**, uma seção "Datas" com **Início** e **Prazo**:
  - usa `<input type="datetime-local">`;
  - tem botão para limpar;
  - salva na mudança, pelo mesmo `onSubmit`/`handleUpdateCard` que já envia `startDate`/`endDate` ao sprint-service.
- **No `Card.tsx`** (quadro e backlog), um selo compacto "📅 30/09":
  - **normal:** dentro do prazo;
  - **âmbar:** vence em até 2 dias;
  - **vermelho:** prazo vencido e card não concluído.
- **Card concluído:** a coluna cujo título normalizado é "concluído", "concluido" ou "done" vale como concluída. O selo fica cinza e riscado.
- **Criação rápida:** o modal de novo card aceita o prazo.
- A regra de cor fica numa função pura `prazoStatus(endDate, now, concluido)` em `lib/cardUtils.ts`.

**Arquivos:** `lib/cardUtils.ts`, `components/card/CardModal.tsx`, `components/card/Card.tsx`, `components/sprint/SprintBoard.tsx` e as actions de card que ainda não repassam as datas.

```gherkin
Cenário: prazo vencido fica vermelho
  Dado um card com prazo em 26/09 às 18h, fora da coluna "Concluído"
  E a data atual é 28/09
  Então o card mostra o selo "📅 26/09" em vermelho
```

---

## Fase 2 — Kanban e card no uso diário

### 2.1 Minicard legível
Hoje a prioridade só aparece no hover (`components/card/Card.tsx`, bloco com `opacity-0 group-hover:opacity-100`). O card fechado deve sempre mostrar:
- título;
- 2 linhas da descrição;
- **prioridade** em selo colorido;
- avatares dos responsáveis (até 3, mais "+N");
- prazo (do 1.7);
- play/stop do timer.

A lixeira continua só no hover.

### 2.2 Busca unificada (menu lateral e dentro da sprint)
O `app/api/search/route.ts` busca cards dentro de um contexto só (`sprint_items`). A nova busca agrupa os resultados nesta ordem:
1. **Esta sprint**
2. **Outras sprints e backlog do projeto**
3. **Projetos**
4. **Pessoas** (e, ao escolher uma pessoa, os cards em que ela é responsável)

Cada card mostra a sprint e o status dela, a coluna, os responsáveis, a prioridade e o tempo registrado. Arquivos: `components/search/GlobalSearch.tsx`, `app/api/search/route.ts` e `cardsApi.search` (sprint-service).

### 2.3 Responsáveis sem recarregar
Atualizar o estado local do card (`patchCardState`) com o retorno de `addResponsibleAction`/`removeResponsibleAction`, incluindo `avatarUrl`. Corrigir o mapeamento que perde o `avatarUrl` ao reabrir o card.

### 2.4 Menu lateral do admin dentro da sprint
As rotas legadas `/sprints/:id` e `/dashboard/sprint/:id` usam a `GlobalSidebar`. Garantir o redirecionamento para `/projetos/:projetoId/sprints/:sprintId` (e para o equivalente do dashboard) em todos os links internos que ainda apontam para as rotas antigas.

### 2.5 Itens em "Em teste"
Validar cada um e corrigir o que falhar:
- usar 100% da largura;
- scroll horizontal ao arrastar um card para cima (autoscroll do `@hello-pangea/dnd` combinado com o drag-to-scroll do `SprintBoard`);
- "Carregando…" infinito nos responsáveis ao criar card no backlog;
- iniciar o timer move o card para "Em andamento".

### 2.6 Prazo: filtros e ordenação
Filtros "Vence esta semana" e "Atrasados", e ordenação por prazo no quadro e no backlog.

### 2.7 Zerar os erros de TypeScript
O `pnpm build` passa porque o Next não bloqueia nesses pontos, mas `npx tsc -p tsconfig.check.json --noEmit` acusa erros que já existiam antes da Fase 1. São dois grupos.

**App (11 erros):**

| Arquivo | Erro |
|---|---|
| `app/actions/projetos.ts:160` e `app/api/projects/[projetoId]/charter/route.ts:48` | `dataLimite: {}` não é `string` (macro-fases) |
| `app/arquivos/page.tsx:56-57` | `a.card.sprint` pode ser `null` |
| `app/projetos/[projetoId]/sprints/[sprintId]/page.tsx:58` e `app/sprints/[sprintId]/page.tsx:73` | `BacklogCard[]` não é atribuível a `SprintCard[]` |
| `components/auth/LoginForm.tsx:18` | `unknown` passado como `FormState` |
| `lib/custosCalc.ts:170-171` | `string \| null` passado onde se espera `string \| undefined` |
| `prisma/seed.ts:91` | `JsonValue` não é `InputJsonValue` |
| `services/wbsService.ts:543` | `properties` do nó não bate com `WbsNodeClient` |

**Configuração:** `tsconfig.check.json` redefine `exclude` e, com isso, volta a incluir os microsserviços NestJS (`sprint-service`, `project-service` etc.). Eles aparecem com erros de decorator (TS1206/TS1270) porque são checados com o tsconfig do Next, não com o deles.

**Solução:**
1. Corrigir os 11 erros tipando na origem, sem `as any`. `BacklogCard` e `SprintCard` passam a compartilhar um tipo base em `types/kanban.ts`.
2. `tsconfig.check.json` volta a excluir os microsserviços (cada um já tem o próprio `tsc`).
3. Adicionar `npx tsc -p tsconfig.check.json --noEmit` ao CI, para o problema não voltar.

### 2.8 Página /arquivos lê uma tabela que não existe mais ✅ (achado durante a 2.7)
`app/arquivos/page.tsx` consulta `prisma.attachment`, ou seja, `public."Attachment"`. A migration `fix_attachment_schema` do file-service moveu essa tabela para `files."Attachment"`, e em produção só existe `files."Attachment"` (confirmado em 28/09/2026). A página deve estar falhando lá, pelo mesmo motivo do item 1.1.

**Corrigido:**
- a página busca os cards do tenant no Prisma do app (a tabela `Card` continua no `public`) e os anexos no file-service, pela rota `/files/by-cards`, em lotes de 100;
- a consulta filtra pelo tenant da sessão (antes listava anexos de todos os tenants);
- card do backlog, que não tem sprint, não quebra mais a página;
- se o file-service falhar, a página mostra um aviso em vez de dar erro.

**Pendente (baixo risco):** remover o modelo `Attachment` do `prisma/schema.prisma` do app, junto com o código legado que ainda o usa (`services/fileUploadService.ts` e `scripts/migrate-blobs.ts`). A remoção precisa de uma migration que não tente apagar uma tabela que não existe mais.

## Status da Fase 2 (28/09/2026)

| Item | Situação |
|---|---|
| 2.1 Minicard | Feito: prioridade sempre visível num selo, ao lado do prazo |
| 2.2 Busca unificada | Feita: sprint atual → outras sprints → backlog → cards da pessoa → projetos → pessoas |
| 2.3 Responsáveis | Revisado: a atualização sem recarregar e o avatar ao reabrir já estavam corrigidos (itens "Em teste") |
| 2.4 Menu do admin na sprint | Corrigido: o dashboard da sprint ganhou rota dentro do projeto |
| 2.5 Itens "Em teste" | Posição do card ao arrastar: **corrigida** (o sprint-service renumera a coluna). 100% da tela, "Carregando…" e timer: o código já estava corrigido. Scroll lateral ao arrastar: **não reproduzido** sem o app rodando |
| 2.6 Prazo: filtros e ordenação | Feito, no popover "Filtros" (que antes não funcionava) |
| 2.7 Erros de tsc | Zerados; `pnpm typecheck` roda no CI |
| 2.8 /arquivos | Corrigida: os anexos vêm do file-service, com filtro de tenant. Falta remover o modelo legado |

A Fase 2 não foi testada manualmente com o app rodando: o ambiente de desenvolvimento não teve acesso ao Docker.

---

## Fase 3 — Cadastros, ranking e sessão

### 3.1 Ranking dos Membros sem função
`components/dashboard/UserRankingTable.tsx` mostra `user.cargo`, um campo global do usuário que quase ninguém preenche. Passar a mostrar a função **no projeto** (`UserProject.role`, a mesma usada em Stakeholders), com fallback para `cargo`. A fonte dos dados é `app/actions/dashboard.ts`.

### 3.2 Adicionar stakeholder pela barra de pesquisa
Um único combobox:
- ao digitar, lista os stakeholders globais do tenant e os usuários que ainda não estão no projeto;
- no fim da lista, oferece "Criar novo stakeholder '<texto>'", que abre o formulário já com o nome preenchido.

### 3.3 Renomear "Tenants"
"Tenants" vira **"Instituições"** no menu (`components/layout/GlobalSidebar.tsx`) e nos títulos de `app/admin/tenants`. A rota não muda.

### 3.4 Sessão por inatividade
- Timeout configurável por `SESSION_IDLE_MINUTES` (padrão de 30 min).
- Um componente cliente `IdleLogout` observa a atividade (mouse, teclado, visibilidade). Com o tempo esgotado, chama a action de logout e redireciona para `/login?from=<rota>`. Aviso 1 minuto antes: "Sua sessão vai expirar".
- O cookie `session` vira cookie de sessão (sem `maxAge`), o que encerra a sessão ao fechar o navegador. O JWT mantém o `exp` atual como teto.
- ✅ Padrão de 30 min, ajustável por variável de ambiente.

### Status da Fase 3 (28/09/2026)

| Item | Situação |
|---|---|
| 3.1 Ranking | Corrigido: mostra os cargos do membro no projeto (`UserProject.role`), com o cargo global como fallback (`lib/cargos.ts`) |
| 3.2 Stakeholders pela busca | Feito: ao digitar, o painel "Adicionar ao projeto" traz o diretório global (Vincular), os usuários da instituição (Adicionar) e as opções de criar |
| 3.3 "Tenants" | Renomeado para "Instituições" em toda a interface (menu, admin, perfil, trocador, mensagens). Antes a página dizia "Workspaces" |
| 3.4 Sessão | Feita, com o padrão de 30 min (`NEXT_PUBLIC_SESSION_IDLE_MINUTES`). O servidor controla pelo `last_seen` no proxy; o navegador mostra um aviso 1 min antes. Fechar o navegador encerra a sessão. O login volta para a página de origem |

---

## Fase 4 — EAP / WBS

Referências: vídeo wbstool (0:47, menu Organizar) e https://youtu.be/YL4v4YgHMW4 (1:59, modos de visualização; 2:56, Gantt). SPEC anterior: `docs/SPEC-Ajustes-Operum-v1.md` §2 e §3.

### 4.1 Botão de expansão
Toggle centralizado na borda inferior do nó, meio para fora do card, mostrando "+" quando recolhido e "−" quando expandido. Sem contagem de filhos. Arquivo: `components/wbs/WbsNode.tsx`.

### 4.2 Layout vertical (menu Organizar)
Hoje só o layout horizontal funciona. Implementar em `lib/wbsLayout.ts`:
- **Vertical:** filhos empilhados à direita do pai, indentados, com conector em cotovelo (layout `ABAIXO_L` da SPEC v1).
- **Misto:** por nó.

Testes de geometria sem sobreposição.

### 4.3 Modos de visualização
- **Chart View Details:** o nó mostra código, título, responsável, duração, datas e custo.
- **Hours and Cost View:** o nó mostra horas e custo, orçado × real, com rollup (`lib/wbsRollup.ts`, `lib/custosCalc.ts`).

Alternância na `WbsMenubar`.

### 4.4 Gráfico de Gantt
Nova visão em `/projetos/:id/wbs?view=gantt`:
- barras por nó da EAP com datas;
- agrupamento pela hierarquia (recolher e expandir);
- linha do "hoje";
- zoom por dia, semana ou mês.

Nós sem data aparecem sem barra. Primeiro só leitura; arrastar barras para editar fica para depois.

---

## Fase 5 — Documentos (⛔ aguardando modelos)

Bloqueada até o usuário enviar os modelos do Prof. Fábio (Termo de Abertura, Formulário de Partes Interessadas e Ata). Com os modelos em mãos, cada item passa por quatro passos:
1. Mapear campo a campo o modelo contra os dados do Operum.
2. Listar os campos que faltam no banco.
3. Reproduzir o layout: paisagem para Partes Interessadas; tabelas e assinaturas iguais ao modelo.
4. Exportar em `.docx` e imprimir.

- **5.1** Formulário de Partes Interessadas em paisagem: `components/projetos/StakeholderDocument.tsx`.
- **5.2** Termo de Abertura: `components/projetos/documentacao/ProjectCharterDocument.tsx`.
- **5.3** Atas: `components/atas/AtaFormClient.tsx`, `lib/exports/ataDocx.ts`. O texto das 11 etapas do documento de ajustes serve de referência para a seção "Assuntos tratados".

---

## Fase 6 — MCP

### 6.1 Copiar ou importar para um projeto existente
`target_project_id` opcional em `operum_copy_project` e `operum_import_project` (`mcp-server/src/migration/importer.ts`):
- sprints e colunas são casadas pelo nome normalizado (as que não existirem são criadas);
- tarefas com título igual, ou com similaridade de pelo menos 0,9, são puladas;
- o relatório lista as tarefas puladas.

Continua `dry_run=true` por padrão.

### 6.2 Anexos pelo MCP
`operum_upload_attachment(task_id, file_name, mime_type, content_base64 | url)` e `operum_delete_attachment(attachment_id, confirm)`, via file-service pelo gateway:
- mesma lista de tipos permitidos de `app/api/uploads/route.ts`;
- o limite de tamanho aparece na mensagem de erro;
- para `url`, só HTTPS, com timeout e limite de bytes (proteção contra SSRF).

---

## Fora do escopo

- **Integração com o Zoom:** épico próprio (OAuth, webhook, extração por IA e tela de revisão), com SDD separado.
- **"Adicionar plano de custo":** já entregue como Planilha de Custos (`/projetos/:id/planilha-custos`, export `.xlsx`). Validar e fechar o card.
- **"Integrar Operum com MCP Claude":** entregue na PR #19 (servidor MCP multi-tenant). Validar e fechar o card.
- **Subtarefas e campos personalizados:** continuam como épico em `docs/mcp/gaps.md`.

---

## Processo por tarefa

1. Lógica pura com teste Vitest primeiro, quando houver lógica.
2. Service.
3. Action: `verifySession` → autorização → Zod → service → `registrarAcao` → `revalidatePath`.
4. UI.
5. `pnpm test:run`, `pnpm lint`, `npx tsc -p tsconfig.check.json` e `pnpm build`.
6. Um commit por item.
7. No Operum, mover o card para "Em teste" e comentar o hash do commit.

Cada fase sai numa branch e PR próprias e para para revisão antes da seguinte.
