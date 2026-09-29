# SDD — Backlog do Operum (setembro/2026)

> **Escopo:** as 36 tarefas abertas do projeto **Operum** (tenant "Fábio", Sprint 1 + backlog), levantadas em 28/09/2026. Inclui os pedidos do documento "07 - Ajustes e melhorias sistema Operum 26-09-26" (Prof. Fábio), bugs do quadro e melhorias do MCP.
>
> **Atualização (28/09, noite):** 11 tarefas criadas depois da primeira versão entraram nas novas Fases 4 (correções rápidas) e 5 (permissões) e no item 7.4 (Termo de Abertura). As fases seguintes foram renumeradas: EAP 4→6, Documentos 5→7, MCP 6→8.
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
- [Fase 4 — Correções rápidas (tarefas de 28/09)](#fase-4--correções-rápidas-tarefas-de-2809)
- [Fase 5 — Permissões por função e por usuário](#fase-5--permissões-por-função-e-por-usuário)
- [Fase 6 — EAP / WBS](#fase-6--eap--wbs)
- [Fase 7 — Documentos](#fase-7--documentos)
- [Fase 8 — MCP](#fase-8--mcp)
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
| 4 | 4.1 | Ao pesquisar por um card, ele aparece, mas clicar não abre o card | média (bug) |
| 4 | 4.2 | Ao cadastrar um novo stakeholder, já trazer a tela correta para não ter que editar de novo | média |
| 4 | 4.3 | Validação de horas por dia no cadastro do stakeholder | média |
| 4 | 4.4 | Redefinir senha: adicionar um olho para visualizar a senha | média |
| 4 | 4.5 | Planilha de custos baixada: subtotal alinhado à direita | média |
| 5 | 5.1 | Definir o que o usuário tem de acesso · O acesso às permissões é feito em Funções e no próprio usuário | média (épico) |
| 5 | 5.2 | Usuários comuns têm acesso a todos os documentos · Usuário comum edita e gera nova versão, aprovada pelo gerente | média |
| 5 | 5.3 | Planilha de Custos: usuário comum edita o realizado das linhas em que é "Elaborado por" | média |
| 6 | 6.1 | EAP: ícone de expansão na parte inferior central, só "+" | média |
| 6 | 6.2 | A EAP só organiza na forma normal e vertical · Adicionar o jeito de visualizar do vídeo | média |
| 6 | 6.3 | EAP: modos "WBS Chart View Details" e "WBS Hours and Cost View" | média |
| 6 | 6.4 | Gráfico de Gantt do projeto | média |
| 7 | 7.1 | Documentos: Formulário de Partes Interessadas em paisagem | média ⛔ |
| 7 | 7.2 | Documentos: corrigir Termo de Abertura | média ⛔ |
| 7 | 7.3 | Documentos: corrigir Atas | média ⛔ |
| 7 | 7.4 | Termo de Abertura: formulário para digitar e botão para gerar o documento, com histórico | média |
| 8 | 8.1 | MCP: copiar/importar para dentro de um projeto existente | média |
| 8 | 8.2 | MCP: anexar imagens e links de vídeo em cards | alta |
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

## Fase 4 — Correções rápidas (tarefas de 28/09)

Tarefas criadas em 28/09/2026, depois do SDD original. São correções pequenas, sem dependência entre si. A 4.1 é bug e vem primeiro.

### 4.1 Clicar num card da busca não abre o card ✅ causa confirmada
**Problema:** a busca mostra o card, mas clicar nele não abre o card.

**Causa:** o clique navega para `/projetos/:p/sprints/:s?card=<id>`, e o `SprintBoard` só lê o card da URL na montagem (`useState(initialCardId)`, em `components/sprint/SprintBoard.tsx`). Quando o usuário já está numa sprint, o Next reaproveita o componente e o `?card=` novo é ignorado. O mesmo acontece ao ir para outra sprint pela busca. O bug continua depois da Fase 2, que mudou a busca, mas não o board.

**Solução:** o board passa a reagir à mudança de `initialCardId`, abrindo o card sempre que a URL traz um `?card=` diferente. Ao fechar o card, o `?card=` sai da URL (`router.replace`), para que clicar de novo no mesmo resultado também funcione. Teste: renderizar o board, trocar o `initialCardId` e ver o modal abrir.

### 4.2 Stakeholder novo já "na tela certa" ✅ causa confirmada
**Problema:** depois de cadastrar um stakeholder, é preciso abri-lo de novo em "Editar" para completar os dados.

**Causa:** em `components/projetos/ProjetoStakeholdersClient.tsx` → `handleSave`:
- **Membro da equipe:** a criação envia só nome, e-mail, senha e endereço. Cargos, departamento, remuneração e horas por dia preenchidos no formulário são **descartados**, e o formulário fecha.
- **Externo:** o formulário fecha, e o stakeholder criado vai para o diretório sem ficar aberto.
- **Criação rápida pela busca:** cria só com o nome e não abre nada.

**Solução:**
1. Depois de criar e vincular um membro, gravar na mesma ação os dados do projeto (cargos, departamento, remuneração, horas/dia) pelo mesmo caminho da edição (`updateProjetoMemberAction`).
2. Ao terminar qualquer criação (formulário ou busca), abrir o stakeholder recém-criado **em modo de edição**, com os dados preenchidos, em vez de fechar o formulário.

### 4.3 Validação de horas por dia
**Problema:** o campo "Horas por dia" do stakeholder aceita qualquer valor positivo (ex.: 30). O servidor (`app/actions/projetos.ts`) só exige que seja maior que zero, e o valor entra no cálculo de valor/hora e da planilha de custos.

**Solução:**
- regra única em `lib/validation`: número maior que 0 e até 24, com no máximo 2 casas decimais;
- mensagem no próprio campo ("Informe entre 0,5 e 24 horas");
- o botão Salvar fica bloqueado enquanto o valor for inválido;
- a mesma validação na action, porque o cliente não é confiável;
- aceitar vírgula como separador decimal ("7,5").

### 4.4 Olho para mostrar a senha
**Problema:** só o login tem o botão de mostrar a senha. As telas de redefinir senha (`RecuperarSenhaForm`), primeiro acesso (`app/alterar-senha`), perfil (`ChangePasswordForm`) e cadastro de usuário (admin e stakeholders) não têm.

**Solução:** um componente `PasswordInput`, com o botão de olho, `aria-label` "Mostrar senha"/"Ocultar senha" e `aria-pressed`, extraído do `LoginForm` e usado em todos os campos de senha.

### 4.5 Subtotal da planilha exportada alinhado à direita
**Problema:** em `lib/exports/planilhaCustosXlsx.ts`, o rótulo "Sub-total …" (células A:C mescladas) fica alinhado à esquerda.

**Solução:** `alignment: { horizontal: 'right' }` no rótulo do subtotal e também no do "TOTAL GERAL", para ficarem consistentes. Teste lendo o `.xlsx` gerado com o exceljs.

---

## Fase 5 — Permissões por função e por usuário

Épico que junta cinco tarefas de 28/09. Ele vem antes da EAP porque define o que o usuário comum pode fazer nos documentos e na planilha: sem ele, a Fase 7 teria de ser refeita.

**Situação atual:**
- As tabelas `Permission` e `RolePermission` existem no banco, mas **nenhum código as consulta**.
- A autorização é binária: `role === 'admin' || isProjectManager(...)`, espalhada por cerca de 25 arquivos.
- O Termo de Abertura já tem o fluxo "membro salva versão pendente → gerente aprova" (`charter/versions`), mas os outros documentos não têm.

### 5.1 Modelo de permissões (funções + ajuste por usuário)
Pedido: as permissões vêm da função (definida pelo admin no cadastro de funções, vale para todos os projetos) e podem ser ajustadas por usuário, para mais ou para menos, de forma global ou só num projeto.

**Catálogo de permissões** (seed idempotente em `Permission`, por recurso e ação):

| Recurso | Ações |
|---|---|
| `projeto` | ver · editar dados · gerenciar membros e stakeholders |
| `quadro` | ver · criar/editar cards · mover · excluir cards · gerenciar sprints e colunas |
| `documentos` | ver · editar (gera versão pendente) · aprovar versões · excluir |
| `planilha` | ver · editar orçado · editar realizado próprio · editar realizado de todos |
| `cadastros` | gerenciar funções e departamentos |

**Funções padrão** (o admin pode mudar tudo depois):

| Função | Permissões |
|---|---|
| Gerente de Projeto | todas as do projeto |
| Membro (sem função com permissão) | ver tudo · criar/editar/mover cards · documentos: editar (versão pendente) · planilha: realizado próprio |
| Tech Lead ⚠️ | as do membro + gerenciar sprints e colunas + planilha: realizado de todos |
| PO ⚠️ | as do membro + editar dados do projeto + gerenciar stakeholders |

**Ajuste por usuário:** tabela nova `UserPermission { userId, projectId?, permissionId, effect: GRANT | DENY }`. Sem `projectId`, o ajuste vale para todos os projetos.

**Resolução**, numa função pura `resolverPermissoes()`:
1. Admin tem tudo.
2. Base: a união das permissões das funções do usuário no projeto.
3. Aplicam-se os GRANT e DENY globais.
4. Por último, os do projeto. Um DENY no projeto vence um GRANT global.

**Aplicação:**
- `services/authz.ts` com `can(session, projectId, 'documentos:aprovar')`, usado nas actions e rotas, substituindo aos poucos os `isProjectManager`;
- a interface usa o mesmo resultado para esconder ou desabilitar botões.

**Telas:**
- Cadastro de Funções (admin): matriz de permissões por função.
- Usuário (admin) e Stakeholders do projeto: "Permissões" com herdadas, concedidas e negadas.

**⚠️ DECISÕES:**
1. Confirmar as permissões de Tech Lead e PO.
2. Definir de onde vêm as "funções do usuário no projeto". Hoje há duas fontes: os cargos em texto (`UserProject.role`, vários por pessoa, os que aparecem em Stakeholders) e o `UserProjectRole` (um por pessoa, usado para o gerente). Recomendação: **os cargos**, que são o que o usuário vê e edita. Cada cargo é casado com a `Role` pela `funcaoKey`, e a pessoa recebe a união das permissões.

### 5.2 Usuário comum nos documentos (versão pendente e logs)
**Pedido:**
- usuários comuns veem **todos** os documentos do projeto;
- podem editar e gerar uma nova versão, que fica pendente até o gerente aprovar;
- tudo fica registrado nos logs.

**Solução:**
- Estender a todos os documentos (EAP, Atas, Partes Interessadas, Termo) o fluxo que o Termo já tem: com `documentos:editar`, a pessoa salva uma versão `PENDING`; com `documentos:aprovar`, aprova ou rejeita.
- A versão aprovada vira a vigente. A pendente aparece destacada no histórico, com quem fez e o que mudou.
- Cada ação (editar, salvar versão, aprovar, rejeitar, excluir) grava no `AuditLog` via `registrarAcao`, com o documento, a versão e o usuário.
- O histórico de cada documento ganha uma aba **Registro**, que lê esses logs. Hoje nenhuma tela lê o `AuditLog` (ver `docs/mcp/gaps.md`).

### 5.3 Planilha de Custos: realizado das próprias linhas
**Pedido:** o usuário comum edita o valor **realizado** das linhas em que ele é o "Elaborado por", e a cor diferencia o que ele pode e o que não pode editar.

**Solução:**
- **Interface** (`components/custos/PlanilhaCustosView.tsx`): hoje `canEdit` vale para a linha inteira. Passa a haver permissão por campo e por linha:
  - campos do realizado (tempo real, materiais reais, data de realização) editáveis quando `planilha:realizado-proprio` e `elaboradoPor = usuário`, ou quando `planilha:realizado-todos`;
  - campos do orçado só com `planilha:editar-orcado`.
- **Cor:** células editáveis com fundo branco e borda azul-clara; as bloqueadas com fundo cinza e cadeado no hover. Uma legenda no topo explica.
- **Servidor:** a action que salva a planilha recusa a gravação de qualquer campo fora dessas regras, porque o cliente não é confiável.

---

## Fase 6 — EAP / WBS

Referências: vídeo wbstool (0:47, menu Organizar) e https://youtu.be/YL4v4YgHMW4 (1:59, modos de visualização; 2:56, Gantt). SPEC anterior: `docs/SPEC-Ajustes-Operum-v1.md` §2 e §3.

### 6.1 Botão de expansão
Toggle centralizado na borda inferior do nó, meio para fora do card, mostrando "+" quando recolhido e "−" quando expandido. Sem contagem de filhos. Arquivo: `components/wbs/WbsNode.tsx`.

### 6.2 Layout vertical (menu Organizar)
Hoje só o layout horizontal funciona. Implementar em `lib/wbsLayout.ts`:
- **Vertical:** filhos empilhados à direita do pai, indentados, com conector em cotovelo (layout `ABAIXO_L` da SPEC v1).
- **Misto:** por nó.

Testes de geometria sem sobreposição.

### 6.3 Modos de visualização
- **Chart View Details:** o nó mostra código, título, responsável, duração, datas e custo.
- **Hours and Cost View:** o nó mostra horas e custo, orçado × real, com rollup (`lib/wbsRollup.ts`, `lib/custosCalc.ts`).

Alternância na `WbsMenubar`.

### 6.4 Gráfico de Gantt
Nova visão em `/projetos/:id/wbs?view=gantt`:
- barras por nó da EAP com datas;
- agrupamento pela hierarquia (recolher e expandir);
- linha do "hoje";
- zoom por dia, semana ou mês.

Nós sem data aparecem sem barra. Primeiro só leitura; arrastar barras para editar fica para depois.

---

## Fase 7 — Documentos

Os itens 7.1 a 7.3 (⛔) estão bloqueados até o usuário enviar os modelos do Prof. Fábio (Termo de Abertura, Formulário de Partes Interessadas e Ata). O 7.4 não depende dos modelos. Com os modelos em mãos, cada item bloqueado passa por quatro passos:
1. Mapear campo a campo o modelo contra os dados do Operum.
2. Listar os campos que faltam no banco.
3. Reproduzir o layout: paisagem para Partes Interessadas; tabelas e assinaturas iguais ao modelo.
4. Exportar em `.docx` e imprimir.

- **7.1** Formulário de Partes Interessadas em paisagem: `components/projetos/StakeholderDocument.tsx`.
- **7.2** Termo de Abertura: `components/projetos/documentacao/ProjectCharterDocument.tsx`.
- **7.3** Atas: `components/atas/AtaFormClient.tsx`, `lib/exports/ataDocx.ts`. O texto das 11 etapas do documento de ajustes serve de referência para a seção "Assuntos tratados".

### 7.4 Termo de Abertura: formulário separado e histórico de alterações
**Pedido (cliente):** não quer ver a edição e o documento pronto na mesma tela, e quer o histórico de alterações salvo.

**Hoje:** `ProjectCharter.tsx` edita direto na folha A4 (`ProjectCharterDocument`). O histórico já existe, mas registra só versões, com título, status e aprovação.

**Solução:**
- **Duas telas:**
  - **Formulário** (padrão): campos agrupados por seção do Termo (dados do projeto, justificativa, objetivos, metodologia, produto, premissas, restrições, limites de autoridade, macrofases, responsáveis);
  - **Documento**: aberto pelo botão **Gerar documento**, mostra só a folha pronta, com "Baixar PDF" e "Voltar ao formulário".
- **Histórico de alterações:** cada versão salva guarda o *diff* por campo em relação à anterior (campo, antes, depois, quem, quando). O histórico mostra essa lista e permite abrir o documento de qualquer versão. As regras de quem aprova seguem a Fase 5.
- Quando o modelo do Prof. Fábio chegar (7.2), muda só o layout da tela Documento, e o formulário continua igual.

---

## Fase 8 — MCP

### 8.1 Copiar ou importar para um projeto existente
`target_project_id` opcional em `operum_copy_project` e `operum_import_project` (`mcp-server/src/migration/importer.ts`):
- sprints e colunas são casadas pelo nome normalizado (as que não existirem são criadas);
- tarefas com título igual, ou com similaridade de pelo menos 0,9, são puladas;
- o relatório lista as tarefas puladas.

Continua `dry_run=true` por padrão.

### 8.2 Anexos pelo MCP ✅
**Card:** "MCP: anexar imagens e links de vídeo em cards".

**Entregue** (branch `feat/mcp-anexos`):
- **`operum_upload_attachment(task_id, file_name?, mime_type?, content_base64 | url)`.**
  - O base64 aceita até 10 MB e também `data:` URL. A `url` é baixada pelo servidor e aceita até 50 MB.
  - A lista de tipos é a do app e do file-service, com teste de paridade entre os três.
  - O nome do arquivo é limpo (sem `: / \ * ? " < > |`) e ganha a extensão do tipo, se faltar.
- **`operum_add_link(task_id, url, title?)`.**
  - Grava só a URL, como anexo do tipo `text/uri-list`. O file-service ganhou a rota `POST /files/link` para isso.
  - O mesmo link na mesma tarefa não é duplicado.
  - No card, vídeo do YouTube ganha miniatura (`i.ytimg.com` liberado no CSP), e na página `/arquivos` há o filtro "Links".
- **`operum_delete_attachment(task_id, attachment_id, confirm)`.**
  - Recebe também o `task_id`, que a spec não previa. O file-service não sabe a qual tenant o anexo pertence; com o `task_id`, a tool confere a tarefa e só exclui um anexo que esteja nela.
- **Checagem de tenant:** toda tool confere antes, por `GET /cards/:id`, se a tarefa é do tenant do token. Os ids são validados por regex, para que `../` não mude o caminho chamado.
- **Proteção contra SSRF no download por `url`** (`mcp-server/src/download.ts`):
  - só HTTPS na porta 443;
  - recusa IP privado, loopback, link-local (metadados de nuvem) e reservado, conferindo no `lookup` da própria conexão (resiste a DNS rebinding);
  - cada redirecionamento passa pela mesma checagem, no máximo 3;
  - conexão sem pool;
  - limite de bytes (Content-Length e contagem do stream) e prazo total de 60 s.
- **Leitura:** `operum_get_task`, `operum_list_tasks` com `fields="full"` e `operum_export_project` voltaram a trazer os anexos, agora buscados no file-service. Desde `06b376d1` vinham sempre vazios.
- **Erros:** o 413 do file-service vira "Arquivo acima do limite de 50 MB do Operum." (antes aparecia como "falha de rede").

**Limitação:** `content_base64` depende de o modelo escrever o arquivo inteiro na chamada da tool. Isso só é viável para arquivos pequenos, e não para uma imagem local de centenas de KB. Para arquivo que está só no computador do usuário, o caminho prático seria uma tool que devolve uma URL de upload de uso único, para enviar com `curl`. Isso fica como próximo passo, porque exige segredo novo e rota pública no mcp-server.

**Achado (pendente):** o gateway expõe `/files/*` a qualquer JWT ou PAT, e o file-service não confere o tenant do card nem do anexo. Quem conhece o id de um card ou de um anexo de outro tenant consegue anexar, renomear ou excluir. As tools do MCP já se protegem sozinhas, mas o correto é o file-service validar o tenant (via sprint-service) em todas as rotas.

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
