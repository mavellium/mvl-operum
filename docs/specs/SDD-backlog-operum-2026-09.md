# SDD — Backlog do Operum (setembro/2026)

> **Escopo:** as 36 tarefas abertas do projeto **Operum** (tenant "Fábio", Sprint 1 + backlog), levantadas em 28/09/2026. Inclui os pedidos do documento "07 - Ajustes e melhorias sistema Operum 26-09-26" (Prof. Fábio), bugs do quadro e melhorias do MCP.
>
> **Atualização (28/09, noite):** 11 tarefas criadas depois da primeira versão entraram nas novas Fases 4 (correções rápidas) e 5 (permissões) e no item 7.4 (Termo de Abertura). As fases seguintes foram renumeradas: EAP 4→6, Documentos 5→7, MCP 6→8.
>
> **Atualização (29/09):**
> - Entrou o **4.1** (segurança: o file-service não confere o tenant), achado ao fazer o 8.2, e os antigos 4.1 a 4.5 viraram 4.2 a 4.6.
> - Entraram o **8.3** (URL de upload de uso único) e o **8.4** (timer pelo MCP), que é necessário para a regra "ao começar uma tarefa, iniciar o timer".
>
> **Atualização (30/09):** 3 cards novos, todos na Fase 4. Os antigos 4.2 a 4.6 viraram 4.3 a 4.7.
> - **4.2:** anexo de arquivo não abre, porque a URL é assinada com o host interno do MinIO (bug em produção, alta).
> - **4.5:** o card das horas fracionadas foi fundido à validação de horas por dia.
> - **4.8:** contraste do campo de renomear anexo.
>
> **Atualização (30/09, continuação):** incorporados os 23 cards da avaliação geral nas fases 9–11 e no mapa de tarefas. O card de upload de arquivos grandes/privados foi vinculado ao item 8.3 já existente. A configuração de permissões (5.1) agora tem telas; a fase 5 continua em andamento.
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
- [Fase 9 — Integridade e contratos](#fase-9--integridade-e-contratos)
- [Fase 10 — Experiência e acessibilidade](#fase-10--experiência-e-acessibilidade)
- [Fase 11 — Segurança e operação](#fase-11--segurança-e-operação)
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
| 4 | 4.1 | Segurança: file-service não confere a instituição (tenant) dos anexos | alta (segurança) |
| 4 | 4.2 | Anexos: arquivo não abre, URL aponta para "minio:9000" (host interno) | alta (bug em produção) |
| 4 | 4.3 | Ao pesquisar por um card, ele aparece, mas clicar não abre o card | média (bug) |
| 4 | 4.4 | Ao cadastrar um novo stakeholder, já trazer a tela correta para não ter que editar de novo | média |
| 4 | 4.5 | Validação de horas por dia no cadastro do stakeholder · Stakeholders: permitir horas fracionadas em "horas por dia" ao editar membro | média |
| 4 | 4.6 | Redefinir senha: adicionar um olho para visualizar a senha | média |
| 4 | 4.7 | Planilha de custos baixada: subtotal alinhado à direita | média |
| 4 | 4.8 | Anexos: melhorar contraste do campo de editar o nome | média |
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
| 8 | 8.3 | MCP: URL de upload de uso único para anexar arquivo que está no computador | média |
| 8 | 8.4 | MCP: iniciar e parar o timer das tarefas | alta |
| 9 | 9.1 | Preservar vínculo com projeto e atomicidade ao excluir uma sprint (`cmuo1gdyc002901ndubbhff73`) | alta |
| 9 | 9.2 | Garantir timer único sob concorrência e parada idempotente (`cmuo1gmkx002b01ndq67spd28`) | alta |
| 9 | 9.3 | Tornar movimentação de card, histórico e ordenação uma operação atômica (`cmuo1gmoo002d01ndf42zbz7f`) | alta |
| 9 | 9.4 | Substituir macrofases sem janela de perda de dados (`cmuo1gmrs002f01ndhl51fd03`) | alta |
| 9 | 9.5 | Restaurar contratos dos dashboards global e por sprint, com teste integrado de rota (`cmuo1gmu4002h01ndvuxtgkht`) | alta |
| 9 | 9.6 | Paginar tarefas no serviço de origem e reduzir varreduras MCP (`cmuo1gmvx002j01ndsdfhjthj`) | media |
| 9 | 9.7 | Consolidar serviços legados e definir fronteiras de domínio verificáveis (`cmuo1gn0b002l01nd62w0nvb1`) | media |
| 10 | 10.1 | Reverter alterações otimistas do Kanban quando a API falhar (`cmuo1h9rx002p01ndby9xzsgq`) | alta |
| 10 | 10.2 | Preservar o formulário do card até a criação/edição ser confirmada (`cmuo1hanh002r01nd1uepu4jr`) | alta |
| 10 | 10.3 | Manter timer sincronizado quando pausar/iniciar falhar (`cmuo1hbit002t01ndbwlhgrnp`) | alta |
| 10 | 10.4 | Confirmar autosave do Termo antes de salvar versão ou sair (`cmuo1hcdi002v01ndlcro8f8u`) | alta |
| 10 | 10.5 | Permitir abrir cards pelo teclado independentemente do arraste (`cmuo1hdar002x01nd1isa1gx2`) | media |
| 10 | 10.6 | Retirar sidebar recolhida da ordem de foco (`cmuo1he4u002z01ndi88juuae`) | media |
| 10 | 10.7 | Unificar gestão de foco de Drawer e Modal (`cmuo1heyw003101ndy6pb87pm`) | media |
| 10 | 10.8 | Adaptar navegação lateral para celular com menu sobreposto (`cmuo1hfvo003301nddf04r2fs`) | media |
| 11 | 11.1 | Garantir revogação de sessões no gateway com Redis saudável ou indisponível (`cmuo1hh27003501ndsy2521z5`) | alta |
| 11 | 11.2 | Isolar filas e sessões do Redis sujeito a eviction (`cmuo1hi2p003701ndlu2bq8ws`) | alta |
| 11 | 11.3 | Implantar imagens imutáveis do SHA aprovado e promover tags somente após validação (`cmuo1hj0u003901nd2z599pt2`) | alta |
| 11 | 11.4 | Rodar checks dos serviços e smoke das imagens de produção antes do merge/deploy (`cmuo1hjxo003b01ndi9qq30u5`) | alta |
| 11 | 11.5 | Registrar e ensaiar rollback por release sem retag manual (`cmuo1hkrs003e01ndh7uaymeh`) | alta |
| 11 | 11.6 | Versionar backup de PostgreSQL/MinIO e comprovar restauração (`cmuo1hlmw003g01ndu19fu0cs`) | alta |
| 11 | 11.7 | Separar liveness e readiness com verificação das dependências essenciais (`cmuo1hmh3003i01ndo06yaob0`) | media |
| 11 | 11.8 | Tornar a observabilidade implantável e conectar métricas, logs e alertas (`cmuo1hnaz003k01ndec1y9yqh`) | media |
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

Tarefas criadas em 28 e 30/09/2026, depois do SDD original. São correções pequenas, sem dependência entre si. Ordem: primeiro os anexos, com a 4.1 (falha de segurança, achada em 29/09) e a 4.2 (anexo não abre em produção), que mexem nos mesmos arquivos. Depois vêm a 4.3 (bug) e as demais.

### 4.1 Segurança: file-service não confere o tenant dos anexos ✅ causa confirmada
**Card:** "Segurança: file-service não confere a instituição (tenant) dos anexos" (alta). Achado ao fazer o 8.2.

**Problema:** o api-gateway repassa `/files/*` ao file-service para qualquer JWT ou PAT válido, com `x-user-id` e `x-tenant-id`. O file-service assume que o chamador já validou tudo (comentários em `upload.service.ts`). Nenhuma rota confere o tenant:

| Rota | O que outro tenant consegue fazer |
|---|---|
| `POST /files/upload?cardId=` e `POST /files/link?cardId=` | anexar arquivo ou link ao card dele |
| `GET /files/by-cards?cardIds=` | listar os anexos (nome, tipo, tamanho, URL do link) |
| `PATCH /files/:id`, `PATCH /files/:id/cover`, `DELETE /files/:id` | renomear, trocar a capa, excluir |
| `GET /files/:id/url` | obter a URL assinada e baixar o arquivo |
| `POST /files/logo?entityId=&type=` | sobrescrever o logo de projeto ou stakeholder (chave previsível `logos/<type>s/<id>.<ext>`) |

No app, `getAttachmentUrlAction`, `deleteAttachmentAction` e `renameAttachmentAction` conferem que o **card** é do tenant, mas não que o **anexo** é desse card. Assim, um card próprio mais o id de um anexo alheio passam na checagem. O `setCoverAction` não confere nem o card, só a sessão.

Os ids são cuid, difíceis de adivinhar, mas vazam por log, print, export e compartilhamento. As tools do MCP (8.2) já conferem a tarefa antes de chamar o file-service. O furo continua para quem chama o gateway direto.

**Solução:**
1. **`x-tenant-id` obrigatório** em todas as rotas do file-service, exceto `/health`. As chamadas do app passam pelo gateway (JWT) ou pela `app/api/uploads`, que já envia o cabeçalho.
2. **`TenantGuard` / `assertCardInTenant(cardId, tenantId)`:** o file-service consulta o sprint-service (`GET /cards/:id` com `X-Tenant-Id` e a chave interna; 404 vira 404), com cache curto em memória (30 s) para o `by-cards` não virar N chamadas repetidas.
   - **Rotas por anexo:** carregam o anexo, pegam o `cardId` e conferem.
   - **`by-cards`:** filtra os `cardIds` pelo tenant antes de consultar, com uma rota interna nova no sprint-service: `POST /cards/owned { ids }` → ids do tenant.
3. **Anexo pertence ao card:** `rename`, `cover`, `url` e `delete` recebem o `cardId` (query ou corpo) e recusam com 404 se `attachment.cardId` for diferente. O app passa a enviar o `cardId` que já tem.
4. **Logo:** confere o projeto ou stakeholder no project-service antes de gravar.
5. **Testes:** o file-service não tem nenhum teste nem runner. Adicionar Vitest, como no mcp-server, e cobrir cada rota com "mesmo tenant ok" e "outro tenant 404".

**BDD:**
- Dado um card da instituição B, quando alguém da instituição A chama `POST /files/upload?cardId=<card de B>`, então a resposta é 404 e nada é gravado no MinIO nem no banco.
- Dado um anexo do card X, quando alguém chama `DELETE /files/<anexo>?cardId=<card Y>`, então a resposta é 404.
- Dado o usuário no próprio card, quando ele anexa, lista, renomeia, marca capa, vê e exclui, então tudo funciona como hoje.

**Arquivos:** `file-service/src/upload/*`, `file-service/src/guards/`, `sprint-service/src/card/card.controller.ts` (rota interna), `app/actions/attachments.ts`, `lib/api-client.ts` (`filesApi` com `cardId`).

### 4.2 Anexo de arquivo não abre (URL com o host interno do MinIO) ✅ causa confirmada
**Card:** "Anexos: arquivo não abre, URL aponta para 'minio:9000' (host interno)" (alta), criado em 30/09.

**Problema:** clicar num anexo de arquivo não faz nada. Depois de vários cliques, o navegador abre `http://minio:9000/mvloperum-prod/uploads/...?X-Amz-...` e dá "Server Not Found".

**Causa:**
1. **URL assinada com o host interno.** `MinioService.getPresignedUrl` (`file-service/src/minio/minio.service.ts`) assina com o mesmo `S3Client` do upload, cujo endpoint é `http://${MINIO_ENDPOINT}:${MINIO_PORT}` = `http://minio:9000`, o nome do container. A assinatura SigV4 inclui o host, então não dá para trocar o host depois de assinar.
2. **Efeito colateral:** a rota das miniaturas e da capa (`app/api/files/[attachmentId]/image/route.ts`) só aceita URL assinada do host de `MINIO_PUBLIC_URL` (`isSafePresignedUrl`). Com o host `minio`, ela responde 400 "URL de origem não autorizada". As imagens dos cards também devem estar quebradas em produção.
3. **Vários cliques:** "Ver arquivo" no `CardModal` chama uma server action e só depois faz `window.open`. A janela abre fora do clique do usuário, e o bloqueador de pop-up (Firefox) pode barrar.

**Solução:**
- **file-service:** um segundo `S3Client` só para assinar, com `endpoint` = `MINIO_PUBLIC_URL` (`https://storage-prod.operum.adm.br`) e `forcePathStyle`. Assinar não faz chamada de rede, então o container não precisa alcançar o host público para isso. Upload, exclusão e leitura continuam no cliente interno.
- **Rota de download no app:** `app/api/files/[attachmentId]/download?cardId=` confere a sessão, o card no tenant e se o anexo é desse card (a mesma checagem da 4.1). Depois responde 302 para a URL assinada.
  - O anexo vira um link de verdade (`<a href>`), sem `window.open` depois de um `await`, então o primeiro clique abre.
  - Imagem abre num **lightbox** dentro do card, usando a rota `/image`. Os outros tipos abrem em nova aba.
- **Proxy de imagem** (`/image`): continua buscando a URL assinada pelo servidor. Se o container do app não alcançar o host público (hairpin), ele passa a pedir ao file-service uma URL assinada com o endpoint interno, só para esse uso.
- **MCP:** `operum_get_task` passa a devolver `download_url` (URL assinada pública, válida por 1 h) nos anexos de arquivo. Hoje vêm sem URL.

**BDD:**
- Dado o anexo `eap-menu-organizar.jpg` no card, quando o usuário clica uma vez no nome, pelo Firefox e fora da rede do servidor, então a imagem abre num lightbox.
- Dado um PDF anexado, quando o usuário clica, então o PDF abre em nova aba, a partir de `https://storage-prod.operum.adm.br/...`.
- Dado um card com imagem de capa, quando o quadro carrega, então a capa aparece.

**Arquivos:** `file-service/src/minio/minio.service.ts`, `app/api/files/[attachmentId]/download/route.ts` (nova), `components/card/CardModal.tsx` (link e lightbox), `components/card/CardAttachments.tsx`, `mcp-server/src/tools/tasks.ts`, `mcp-server/src/serializers.ts`.

### 4.3 Clicar num card da busca não abre o card ✅ causa confirmada
**Problema:** a busca mostra o card, mas clicar nele não abre o card.

**Causa:** o clique navega para `/projetos/:p/sprints/:s?card=<id>`, e o `SprintBoard` só lê o card da URL na montagem (`useState(initialCardId)`, em `components/sprint/SprintBoard.tsx`). Quando o usuário já está numa sprint, o Next reaproveita o componente e o `?card=` novo é ignorado. O mesmo acontece ao ir para outra sprint pela busca. O bug continua depois da Fase 2, que mudou a busca, mas não o board.

**Solução:** o board passa a reagir à mudança de `initialCardId`, abrindo o card sempre que a URL traz um `?card=` diferente. Ao fechar o card, o `?card=` sai da URL (`router.replace`), para que clicar de novo no mesmo resultado também funcione. Teste: renderizar o board, trocar o `initialCardId` e ver o modal abrir.

### 4.4 Stakeholder novo já "na tela certa" ✅ causa confirmada
**Problema:** depois de cadastrar um stakeholder, é preciso abri-lo de novo em "Editar" para completar os dados.

**Causa:** em `components/projetos/ProjetoStakeholdersClient.tsx` → `handleSave`:
- **Membro da equipe:** a criação envia só nome, e-mail, senha e endereço, e o formulário fecha. *(Corrigido em 30/09 ao implementar: os campos de cargos, departamento, remuneração, horas por dia e gerente não eram descartados; eles **nem apareciam** na criação, só em "Editar" (`selected?.tipo === 'interno'`).)*
- **Externo:** o formulário fecha, e o stakeholder criado vai para o diretório sem ficar aberto.
- **Criação rápida pela busca:** cria só com o nome e não abre nada.

**Solução:**
1. Depois de criar e vincular um membro, gravar na mesma ação os dados do projeto (cargos, departamento, remuneração, horas/dia) pelo mesmo caminho da edição (`updateProjetoMemberAction`).
2. Ao terminar qualquer criação (formulário ou busca), abrir o stakeholder recém-criado **em modo de edição**, com os dados preenchidos, em vez de fechar o formulário.

### 4.5 Horas por dia: fracionadas e validadas ✅ causa confirmada
**Cards (fundidos):** "Validação de horas por dia no cadastro do stakeholder" (28/09) e "Stakeholders: permitir horas fracionadas em 'horas por dia' ao editar membro" (30/09).

**Problema:**
- o campo aceita qualquer valor positivo (ex.: 30);
- ao editar um membro, não dá para informar 8,5 (8h30).

**Causa:**
- **Banco:** já é decimal (`horasDiarias Float?`, no app e no project-service). Os cálculos (`lib/planilhaCustos.ts`, `lib/cardUtils.ts`, `lib/custosCalc.ts`) já usam número fracionado.
- **Campo:** o input é `type="number" step="0.5"` (`ProjetoStakeholdersClient.tsx`). No Firefox, um `type="number"` com **vírgula** ("8,5") entrega valor vazio. O código faz `parseFloat('') || undefined` e **descarta sem avisar**. "8:30" não é aceito em nenhum navegador, e o `step="0.5"` recusa 8,25.
- **Servidor:** `app/actions/projetos.ts` faz `Number(raw)`, e `Number("8,5")` é `NaN`, também ignorado em silêncio. Aceita qualquer valor acima de zero.

**Solução:**
- **Regra única** em `lib/validation/horas.ts`: `parseHoras(texto)` aceita "8", "8,5", "8.5" e "8:30" (todos viram 8,5). O resultado precisa ser maior que 0 e no máximo 24, com até 2 casas decimais.
- **Campo:** `type="text" inputMode="decimal"`. Mostra a conversão ao lado ("8:30 = 8,5 h") e o erro no próprio campo ("Informe entre 0,5 e 24 horas", por exemplo "8,5" ou "8:30"). O Salvar fica bloqueado enquanto o valor for inválido. Nunca descartar em silêncio.
- **Servidor:** a action usa o mesmo `parseHoras` e responde com erro se o valor for inválido, porque o cliente não é confiável.
- **Cálculos:** testes com 8,5 h no valor/hora, na planilha de custos e no custo do card.

**BDD:**
- Dado o membro em edição, quando o usuário digita "8,5" no Firefox e salva, então o valor volta como 8,5 depois de recarregar.
- Quando digita "8:30", então o campo mostra "= 8,5 h" e salva 8,5.
- Quando digita "30", então aparece o erro e o Salvar fica bloqueado. Se o valor chegar ao servidor mesmo assim, a action recusa.

### 4.6 Olho para mostrar a senha
**Problema:** só o login tem o botão de mostrar a senha. As telas de redefinir senha (`RecuperarSenhaForm`), primeiro acesso (`app/alterar-senha`), perfil (`ChangePasswordForm`) e cadastro de usuário (admin e stakeholders) não têm.

**Solução:** um componente `PasswordInput`, com o botão de olho, `aria-label` "Mostrar senha"/"Ocultar senha" e `aria-pressed`, extraído do `LoginForm` e usado em todos os campos de senha.

### 4.7 Subtotal da planilha exportada alinhado à direita
**Problema:** em `lib/exports/planilhaCustosXlsx.ts`, o rótulo "Sub-total …" (células A:C mescladas) fica alinhado à esquerda.

**Solução:** `alignment: { horizontal: 'right' }` no rótulo do subtotal e também no do "TOTAL GERAL", para ficarem consistentes. Teste lendo o `.xlsx` gerado com o exceljs.

### 4.8 Contraste do campo de renomear anexo ✅ causa confirmada
**Card:** "Anexos: melhorar contraste do campo de editar o nome" (média), criado em 30/09.

**Problema:** ao renomear um anexo, o texto digitado fica cinza-claro sobre o fundo branco e quase não se lê.

**Causa:** o `app/globals.css` ainda tem o bloco `@media (prefers-color-scheme: dark)` do template do Next, que troca `--foreground` para `#ededed`, e o `body` usa essa cor. O app não tem tema escuro: o modal do card é sempre claro. O input de renomear (`CardModal.tsx`) não define cor de texto nem de fundo, e o Tailwind faz o input herdar a cor. Com o sistema operacional em modo escuro, o texto sai quase branco no fundo branco. Outros inputs sem cor explícita têm o mesmo problema.

**Solução:**
- input de renomear com `text-slate-800 bg-white` e foco visível (`focus:ring-2`), com contraste de pelo menos 4,5:1 (WCAG AA);
- remover o bloco de modo escuro do `globals.css`, que não corresponde a nenhum tema do app, ou ao menos parar de aplicá-lo ao `body`;
- varrer os inputs sem cor explícita (`grep` por `<input` sem `text-`) nos modais e formulários, e corrigir os que herdam cor.

**BDD:** dado o sistema em modo escuro, quando o usuário renomeia um anexo, então o texto digitado aparece escuro sobre o fundo branco.

**Arquivos:** `components/card/CardModal.tsx`, `app/globals.css`.


### Status da Fase 4 (30/09/2026)

Branch `feat/backlog-fase-4`. Cada item foi um commit, com o card movido para "Em andamento" e o timer ligado no início, e para "Em teste" no fim.

| Item | Commit | Situação |
|---|---|---|
| 4.1 Tenant no file-service | `398a26fa` | Feito. O file-service exige `x-tenant-id` e confere o card no sprint-service (`POST /cards/in-tenant`) antes de gravar, listar, renomear, trocar a capa, assinar ou excluir. Falha fechada (503) e cache de 30 s só para respostas positivas. `/files/avatar` e `/files/logo` foram removidas, porque eram expostas e sem uso. O `setCoverAction` passou a conferir o card. O file-service ganhou Vitest (35 testes). |
| 4.2 Anexo não abre | `488eb3f3` | Feito. Um `S3Client` só para assinar, com `MINIO_PUBLIC_URL`. Rota `/api/files/:id/download` (302 para a URL assinada), lightbox para imagem e `/arquivos` pela rota nova. O `get_task` do MCP devolve `download_url`. |
| 4.3 Busca não abre o card | `c92d3934` | Feito. O quadro lê o `?card=` com `useSearchParams` e abre o card quando o valor muda. Fechar tira o `?card=` com `history.replaceState`. |
| 4.4 Stakeholder na tela certa | `1c4fae85` | Feito. Os dados do projeto aparecem já na criação de membro e são gravados junto. Toda criação a partir do projeto abre o cadastro em edição, e o externo pelo "Adicionar ao projeto" já sai vinculado. |
| 4.5 Horas por dia | `f68f5742` | Feito. `lib/validation/horas.ts` aceita "8,5", "8.5" e "8:30", entre 0 e 24. O campo é de texto e mostra o erro nele mesmo. A action recusa valor inválido. |
| 4.6 Olho na senha | `eba7eed4` | Feito. `components/ui/PasswordInput` em todos os campos de senha; o login mantém o dele. |
| 4.7 Subtotal à direita | `39e337ee` | Feito. Sub-total e TOTAL GERAL alinhados à direita no `.xlsx`. |
| 4.8 Contraste do renomear | `0adda4f7` | Feito. Removido o bloco de modo escuro do template, e `input:not([type])` recebe texto escuro. O campo de renomear tem cor, borda e foco próprios. |

**Achados durante a fase:**
- `updateProjetoMemberAction` (`app/actions/projetos.ts`) ainda cria funções com o gerador de chave antigo, e não com o `funcaoKey` do 1.5. "Gerente de Projeto" ainda pode duplicar "Gerente de Projetos" por esse caminho. Pendente, fica para a Fase 5, que mexe em funções.
- O timer da 4.4 parou sozinho enquanto a sessão do agente ficou pausada. O trecho feito depois da retomada foi lançado à mão, com o início estimado pelo horário do primeiro arquivo alterado.

---

## Fase 5 — Permissões por função e por usuário

Épico que junta cinco tarefas de 28/09. Ele vem antes da EAP porque define o que o usuário comum pode fazer nos documentos e na planilha: sem ele, a Fase 7 teria de ser refeita.

**Situação na branch `feat/fase-5-permissoes` (30/09):**
- Núcleo implementado em `12d427e0`: catálogo, migration de `UserPermission` e `Role.permissoesDefinidasEm`, resolvedor puro e `services/authz.ts`. `Permission` e `RolePermission` já são consultadas pelo resolvedor.
- Serviço e actions implementados em `ef7f1bbb`: configuração restrita ao admin, validação e auditoria.
- Nesta continuação: matriz no cadastro de funções, ajustes globais em Usuários e por projeto em Stakeholders, restauração de padrão e tratamento de falhas. A consulta de ajustes recusa projeto de outro tenant.
- **Pendente para concluir 5.1:** adoção gradual de `can`/`exigirPermissao` nas actions, rotas e controles existentes de projeto/quadro/cadastros. As telas de configuração não significam que todos os consumidores já aplicam o catálogo.
- **5.2 e 5.3 continuam pendentes.** O Termo de Abertura já tem o fluxo "membro salva versão pendente → gerente aprova" (`charter/versions`), mas o fluxo unificado para todos os documentos e a edição do realizado próprio ainda devem ser implementados.
- Esta fase permanece em andamento; não foi declarada pronta para merge/deploy.

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
| Tech Lead | base do membro; permissões adicionais somente quando definidas pelo admin |
| PO | base do membro; permissões adicionais somente quando definidas pelo admin |

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

**Decisões confirmadas nos commits de 30/09 (`12d427e0`, `ef7f1bbb`):**
1. Só o administrador configura a matriz e os ajustes de usuário. Tech Lead e PO não recebem privilégios adicionais por padrão.
2. As funções vêm dos cargos `UserProject.role`, casados pela `funcaoKey`, somadas ao papel de gerente em `UserProjectRole` e à base Membro do projeto.
3. Admin tem todas as permissões; não membro ativo não recebe nenhuma. Para membros: base ∪ funções → ajustes globais → ajustes do projeto. Um ajuste do projeto vence o global, tanto para conceder quanto para negar.
4. Matriz vazia explicitamente salva difere de padrão não configurado (`permissoesDefinidasEm`); restaurar remove a configuração explícita.

**Aceite da configuração:** admin salva/restaura a matriz; gerente/membro não escreve; conceder/negar/herdar respeita o escopo; falha mantém o estado confirmado; projeto/usuário de outra instituição é recusado. Testes em `__tests__/unit/components/permissoes/editores.test.tsx`, `__tests__/unit/services/permissoesService.test.ts` e `__tests__/unit/app/actions/permissoes.test.ts`.

**Validação desta continuação (30/09):** `pnpm test:run` passou (157 arquivos, 1.571 testes); `pnpm lint`, `pnpm typecheck` e `pnpm build` passaram. Isso valida a configuração implementada, sem declarar concluída a adoção de permissões nos consumidores ou a validação em produção.

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

**Limitação:** `content_base64` depende de o modelo escrever o arquivo inteiro na chamada da tool. Isso só é viável para arquivos pequenos, e não para uma imagem local de centenas de KB. A solução é o item 8.3.

**Achado:** o file-service não confere o tenant nas rotas expostas pelo gateway. Virou o item 4.1.

### 8.3 URL de upload de uso único (arquivo que está no computador)
**Card:** "MCP: URL de upload de uso único para anexar arquivo que está no computador" (média).

**Problema:** no `operum_upload_attachment` (8.2), o arquivo chega em `content_base64` ou por `url` pública. Arquivo local e grande não tem URL, e em base64 o modelo precisaria escrever centenas de milhares de caracteres na chamada. Foi o caso da imagem da EAP que estava no `.docx`.

**Solução:** tool `operum_create_upload_link(task_id, file_name?)`.
- Confere a tarefa no tenant (`GET /cards/:id`) e devolve `{ upload_url, expires_at, curl }`, com `curl` = `curl -F "file=@<caminho>" "<upload_url>"`.
- O Claude Code roda o comando no terminal, e o arquivo vai direto ao mcp-server, sem passar pelo modelo.
- **Rota pública nova no mcp-server:** `POST /uploads/:token` (multipart, campo `file`). Ela:
  - decifra o token;
  - confere validade e uso único;
  - repassa o arquivo em stream ao `/files/upload?cardId=` do gateway, com o PAT de dentro do token;
  - devolve o anexo em JSON.
  - Tipos e limite de 50 MB iguais aos do 8.2, com as mesmas mensagens.
- **Token:** AES-256-GCM com a chave `MCP_UPLOAD_SECRET`. O conteúdo cifrado é `{ pat, taskId, tenantId, exp, nonce }`, com validade de 10 minutos. O PAT não aparece em claro na URL nem nos logs do Traefik.
- **Uso único:** o nonce fica num `Map` em memória até expirar. Vale com uma réplica do mcp-server, como o `idempotency_key`. Com mais réplicas, é preciso passar para o Redis.
- **Limite de taxa** por IP na rota pública.

**Configuração nova em produção** (`.env` da VPS e `docker-compose.production.yml`):
- `MCP_UPLOAD_SECRET`: 32 bytes aleatórios, em base64;
- `MCP_PUBLIC_URL`: a URL pública do mcp-server no Traefik.

Sem essas variáveis, a tool responde com erro claro dizendo o que falta configurar.

**BDD:**
- Dado um link gerado para a tarefa X, quando o `curl` envia `eap.png` (800 KB), então o anexo aparece no card X.
- Dado um link já usado, ou vencido há mais de 10 minutos, quando alguém envia de novo, então a resposta é 410 e nada é gravado.
- Dado um token adulterado, então a resposta é 400 sem detalhe do motivo.

**Arquivos:** `mcp-server/src/tools/attachments.ts`, `mcp-server/src/uploadLink.ts` (cifra e nonce), `mcp-server/src/main.ts` (rota), `docker-compose.production.yml`, `.env.example`, README do MCP.

### 8.4 Timer das tarefas pelo MCP ✅
**Card:** "MCP: iniciar e parar o timer das tarefas" (alta).

**Entregue** (branch `feat/mcp-timer`, empilhada na `feat/mcp-anexos`):
- `operum_start_timer`, `operum_stop_timer` e `operum_log_time` (`mcp-server/src/tools/time.ts`). A `operum_get_task` ganhou o campo `time { total_seconds, running[] }`, calculado das `timeEntries` que o `GET /cards/:id` já traz, sem chamada extra.
- **sprint-service:**
  - rota nova `GET /time-entries/running`, com o timer rodando do usuário do `x-user-id` no tenant, devolvido em `{ entry }`. Sem ela, só dava para achar o timer card a card, e a rota por usuário (`/users/:id/time-entries`) não passa pelo gateway;
  - o lançamento manual passou a recusar data inválida e fim antes do início. Antes gravava duração negativa, que abatia o total do card.
- Se o card não conseguir ir para "Em andamento", o timer continua rodando e a resposta traz `warning`.

O plano original está abaixo.

**Contexto:** em 29/09 ficou combinado que, ao **começar** uma tarefa, o Claude move o card para "Em andamento" e inicia o timer. Ao **abrir a PR**, para o timer e move o card para "Em teste". O MCP não tem tool de tempo, então hoje o timer não tem como correr.

**Base existente:**
- **sprint-service:** `POST /cards/:id/time-entries/start` (um timer rodando por usuário; um segundo dá 400 "Já existe um timer em andamento"), `POST /time-entries/:id/stop`, `POST /cards/:id/time-entries/manual`, `GET /cards/:id/time-entries/active` e `GET /cards/:id/time-entries/total`.
- **Mover para "Em andamento" ao iniciar o timer:** hoje só existe na tela (`handleCardTimerStarted` em `components/sprint/SprintBoard.tsx`). Ele procura a coluna com o título "em andamento" e só move para frente.

**Entregar:**
- **`operum_start_timer(task_id, description?, stop_running?)`:**
  - inicia o timer do dono do token;
  - repete a regra da tela: se o card está numa sprint e numa coluna anterior a "Em andamento", move para lá, registrando o motivo "timer iniciado pelo MCP";
  - com `stop_running: true`, para antes o timer que estiver rodando em outra tarefa;
  - sem essa opção, o erro diz em qual tarefa o timer está rodando.
- **`operum_stop_timer(task_id?)`:** para o timer rodando do usuário (na tarefa informada, ou no que estiver ativo) e devolve a duração.
- **`operum_log_time(task_id, started_at, ended_at, description?)`:** lança tempo manual, para registrar trabalho feito sem timer.
- **`operum_get_task`:** passa a trazer `time: { total_seconds, running: { started_at } | null }`.
- **Auditoria:** as três escritas vão para o AuditLog (`via: "mcp"`).

**BDD:**
- Dado um card em "A Fazer", quando o Claude chama `operum_start_timer`, então o card vai para "Em andamento" e a tela mostra o timer correndo.
- Dado um timer rodando no card A, quando o Claude inicia o timer do card B com `stop_running: true`, então o timer de A para com a duração gravada e o de B começa.
- Dado um card em "Em teste", quando o timer é iniciado, então o card não volta de coluna.

**Arquivos:** `mcp-server/src/tools/time.ts` (novo), `mcp-server/src/tools/tasks.ts` (`get_task`), `mcp-server/src/server.ts`, testes com o Operum falso (rotas de time entries).

---


## Ampliação de 30/09 — avaliação geral

Conferência ao vivo em 30/09/2026: 79 cards no projeto, sem outra página de resultados. Os 23 cards da avaliação geral abaixo estavam ausentes deste SDD. Todos continuam **pendentes**; análise estática não equivale a incidente reproduzido. Os IDs das fases anteriores ficam preservados.

**Ordem de execução:** concluir a fase 5 em andamento; antes das novas funcionalidades das fases 6–8, priorizar os itens de segurança, perda de dados e prioridade alta das fases 9–11 conforme o critério deste documento. Cada fase mantém branch/PR própria e revisão. Dependências explícitas: 11.5 depende de 11.3; 11.8 acompanha a instrumentação de 11.7. A fase 10.8 começa por reprodução visual; 11.6 começa pelo inventário com o operador. Mudanças de produção não estão autorizadas por esta inclusão no backlog.

**Deduplicação:** o card `cmunhin8f001801ndqc89ymsl` (arquivos grandes/privados por URL de uso único) é outra origem do item 8.3; não cria uma segunda implementação. As relações temáticas dos novos cards com itens anteriores não os substituem: revogação de sessões é distinta de inatividade (3.4); acessibilidade/mobile é distinta de ocupar a tela da sprint (2.5).

## Fase 9 — Integridade e contratos

| Item | Card no Operum | Prioridade | Status |
|---|---|---|---|
| 9.1 | Preservar vínculo com projeto e atomicidade ao excluir uma sprint (`cmuo1gdyc002901ndubbhff73`) | alta | Pendente |
| 9.2 | Garantir timer único sob concorrência e parada idempotente (`cmuo1gmkx002b01ndq67spd28`) | alta | Pendente |
| 9.3 | Tornar movimentação de card, histórico e ordenação uma operação atômica (`cmuo1gmoo002d01ndf42zbz7f`) | alta | Pendente |
| 9.4 | Substituir macrofases sem janela de perda de dados (`cmuo1gmrs002f01ndhl51fd03`) | alta | Pendente |
| 9.5 | Restaurar contratos dos dashboards global e por sprint, com teste integrado de rota (`cmuo1gmu4002h01ndvuxtgkht`) | alta | Pendente |
| 9.6 | Paginar tarefas no serviço de origem e reduzir varreduras MCP (`cmuo1gmvx002j01ndsdfhjthj`) | media | Pendente |
| 9.7 | Consolidar serviços legados e definir fronteiras de domínio verificáveis (`cmuo1gn0b002l01nd62w0nvb1`) | media | Pendente |

### 9.1 Preservar vínculo com projeto e atomicidade ao excluir uma sprint

**Card:** `cmuo1gdyc002901ndubbhff73`. **Prioridade:** alta. **Status:** pendente.

**Avaliação A1 · Arquitetura e código**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, sem execução em produção.

**Evidência:** Confirmado por fluxo estático.

- `SprintService.remove` limpa `sprintId`, `sprintColumnId` e `sprintPosition`, mas não preenche `projectId`; em seguida exclui logicamente a sprint, fora de transação. A criação de card permite apenas `sprintId`, sem `projectId`; o retorno individual ao backlog já reconhece e corrige essa situação, mas a exclusão da sprint não. O backlog consulta obrigatoriamente `projectId`, logo cards criados só com sprint deixam de aparecer e também deixam de ser encontrados por `cardInTenant`. Fontes: [remoção, linhas 87–95](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/sprint/sprint.service.ts#L87), [criação, linha 146](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L146), [retorno individual, linha 173](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L173), [backlog, linha 57](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L57), [escopo, linha 25](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/common/tenant-scope.ts#L25).
- Impacto: tarefas ficam inacessíveis ao excluir a sprint. Não foi constatada exclusão física dos dados.
- Escopo: herdar projeto da sprint quando ausente, validar coerência dos vínculos existentes, definir posição no backlog e envolver transferência + exclusão na mesma transação. Diagnóstico de dados históricos deve ser tarefa controlada, sem inferir automaticamente o projeto de órfãos sem evidência.
- Aceite: criar card apenas com sprintId, excluir sprint e localizar card no backlog e pelo id, preservando comentários/tempos; falha intermediária mantém sprint e cards no estado anterior; casos com projectId pré-existente cobertos por integração.
- SDD: não duplica item existente; complementa integridade do quadro da fase 2.

### 9.2 Garantir timer único sob concorrência e parada idempotente

**Card:** `cmuo1gmkx002b01ndq67spd28`. **Prioridade:** alta. **Status:** pendente.

**Avaliação A2 · Arquitetura e código**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, sem execução em produção.

**Evidência:** Confirmado por código; corrida não reproduzida em banco.

- `start` consulta timer ativo e depois insere em operações separadas; `TimeEntry` não declara unicidade de timer ativo por usuário e não encontrei índice parcial nas migrations. `stop` aceita registro já parado e substitui `endedAt`/`duration` pela hora de cada nova chamada. Fontes: [start/stop, linhas 22–45](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/time-entry/time-entry.service.ts#L22), [schema, linha 191](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/prisma/schema.prisma#L191), [testes existentes, linha 24](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/time-entry/time-entry.service.spec.ts#L24).
- Impacto: dois inícios simultâneos podem gravar dois timers; retry de stop altera horas já encerradas, afetando custos.
- Escopo: proteção no banco/controle transacional para um timer ativo, tratamento de conflito previsível e stop condicional/idempotente; decidir tratamento de duplicados históricos antes da restrição.
- Aceite: duas chamadas concorrentes produzem apenas um timer ativo; stop repetido mantém exatamente endedAt e duration originais; falha/retry não duplica tempo; teste real de concorrência em PostgreSQL, além dos mocks.
- SDD: extensão de confiabilidade do 8.4 já entregue, não recriar as ferramentas MCP.

### 9.3 Tornar movimentação de card, histórico e ordenação uma operação atômica

**Card:** `cmuo1gmoo002d01ndf42zbz7f`. **Prioridade:** alta. **Status:** pendente.

**Avaliação A3 · Arquitetura e código**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, sem execução em produção.

**Evidência:** Confirmado por código; falha parcial não injetada.

- `CardService.update` grava `cardMovement` antes de `card.update`, depois renumera destino e origem; cada `renumberColumn` faz sua própria transação de updates, mas leituras e operação completa ficam fora dela. Fontes: [histórico, linha 180](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L180), [update/renumeração, linha 201](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L201), [transação parcial, linha 224](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L224).
- Impacto: uma falha pode registrar movimento inexistente ou deixar ordenação parcial; movimentações simultâneas podem sobrescrever posições calculadas sobre estado antigo.
- Escopo: serviço transacional único com estratégia explícita de concorrência por coluna/sprint, histórico só de movimentos efetivados e retorno com posição final normalizada.
- Aceite: falha após qualquer escrita reverte movimento, card e posições; movimentos concorrentes deixam ordem determinística e posições válidas; histórico condiz com estado final; não regredir drag-and-drop simples.
- SDD: sobreposição parcial com 2.5, que corrigiu renumeração simples; este card trata atomicidade e concorrência ainda ausentes.

### 9.4 Substituir macrofases sem janela de perda de dados

**Card:** `cmuo1gmrs002f01ndhl51fd03`. **Prioridade:** alta. **Status:** pendente.

**Avaliação A4 · Arquitetura e código**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, sem execução em produção.

**Evidência:** Confirmado por código; falha parcial não injetada.

- `upsertMacroFase` executa `deleteMany` e `createMany` separados. A action atualiza primeiro o projeto, depois macrofases via HTTP, depois sincroniza a EAP localmente, permitindo etapas persistidas quando a seguinte falha. Fontes: [serviço, linha 151](https://github.com/mavellium/mvl-operum/blob/d90456ff/project-service/src/project/project.service.ts#L151), [action, linha 195](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/projetos.ts#L195).
- Impacto: erro na recriação deixa macrofases vazias; projeto/macrofases/EAP podem divergir após atualização parcialmente concluída.
- Escopo mínimo: validar lote antes de mutar e transacionar substituição no project-service. Complemento: definir fonte canônica e mecanismo de reconciliação/retry idempotente para sincronização EAP; não propor transação de banco mantida aberta através de HTTP.
- Aceite: erro de inserção preserva macrofases anteriores; lote válido substitui tudo uma vez; interrupção na sincronização aparece como pendência rastreável e retry converge sem duplicar fases; documentar responsabilidade de cada armazenamento.
- SDD: relacionado a EAP/documentos, mas não duplica layouts nem versionamento das fases 6/7.

### 9.5 Restaurar contratos dos dashboards global e por sprint, com teste integrado de rota

**Card:** `cmuo1gmu4002h01ndvuxtgkht`. **Prioridade:** alta. **Status:** pendente.

**Avaliação A5 · Arquitetura e código**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, sem execução em produção.

**Evidência:** Confirmado no repositório.

- O cliente chama `/dashboard/global` e `/sprints/:id/dashboard`; as actions repassam essas chamadas. O gateway não roteia `/dashboard`, e o controller de dashboard do sprint-service só registra `/sprints/:id/metrics` e `/sprints/:id/feedback`, sem dashboard agregado. Os consumidores exibem erro se a action falha. Fontes: [cliente, linha 314](https://github.com/mavellium/mvl-operum/blob/d90456ff/lib/api-client.ts#L314), [actions, linha 14](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/dashboard.ts#L14), [gateway, linha 86](https://github.com/mavellium/mvl-operum/blob/d90456ff/api-gateway/src/main.ts#L86), [controller](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/dashboard/dashboard.controller.ts#L1), [dashboard global, linha 26](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/dashboard/page.tsx#L26), [sprint, linha 6](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/dashboard/SprintDashboardContent.tsx#L6).
- Impacto: caminhos de dashboard não conseguem obter o contrato esperado por essas rotas. O dashboard global citado é o de usuário comum; admin é redirecionado a outra tela, não generalizar o achado a ela.
- Escopo: implementar agregação e roteamento ou alinhar BFF à API canônica; definir schemas de resposta compartilhados/validados, sem casts mascarando contratos inexistentes.
- Aceite: fixtures com tempos/cards/feedbacks resultam em KPIs corretos nas duas telas; caso vazio renderiza zeros/listas vazias; teste percorre BFF→gateway→controller real e valida formato e status; preservação do escopo de projeto/tenant testada pelo responsável de segurança.
- SDD: não duplica item 3.1 sobre cargo no ranking nem 2.4 sobre navegação; pré-requisito para as telas funcionarem.

### 9.6 Paginar tarefas no serviço de origem e reduzir varreduras MCP

**Card:** `cmuo1gmvx002j01ndsdfhjthj`. **Prioridade:** media. **Status:** pendente.

**Avaliação A6 · Arquitetura e código**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, sem execução em produção.

**Evidência:** Consulta completa confirmada; lentidão ainda não medida.

- `collectTasks` carrega sprints, backlog e cards de cada sprint; só depois `operum_list_tasks` filtra e aplica `paginate`. Assim pedir limit pequeno não limita leituras de banco nem payload interno do projeto inteiro. `listColumns` também inclui todos os timeEntries de todos os cards. Fontes: [coleta, linha 41](https://github.com/mavellium/mvl-operum/blob/d90456ff/mcp-server/src/tools/tasks.ts#L41), [paginação tardia, linha 180](https://github.com/mavellium/mvl-operum/blob/d90456ff/mcp-server/src/tools/tasks.ts#L180), [board, linha 97](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/sprint/sprint.service.ts#L97).
- Impacto: custo de cada página cresce com total de sprints/cards; risco de latência/memória, sem evidência de incidente atual.
- Escopo: endpoint de listagem com filtros e cursor estável aplicado na origem; MCP delega busca sem varrer todo projeto. Medir payload do board e substituir histórico de tempos por resumo/ativo onde não se precisa do detalhe.
- Aceite: fixture grande com limite 20 devolve 20 cards sem carregar todos; percorrer páginas não perde/duplica itens sob a semântica documentada; cards sem projectId direto continuam contemplados por sprint; medir quantidade de consultas, bytes e latência antes/depois; anexos continuam carregados apenas da página.
- SDD: não duplica busca 4.2, importação 8.1 ou anexos 8.2/8.3.

### 9.7 Consolidar serviços legados e definir fronteiras de domínio verificáveis

**Card:** `cmuo1gn0b002l01nd62w0nvb1`. **Prioridade:** media. **Status:** pendente.

**Avaliação A7 · Arquitetura e código**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, sem execução em produção.

**Evidência:** Duplicação confirmada; remoção depende de inventário completo.

- `services/departmentService.ts` e `services/departamentoService.ts` implementam quase o mesmo CRUD direto no Prisma; a busca de referências encontrou o primeiro nos testes unitários e nenhum consumidor de runtime para esses dois módulos. Há ainda CRUD em `project-service/src/department`. A arquitetura reconhece migração incompleta e clientes diretos mortos `lib/projectClient.ts`/`lib/sprintClient.ts`. Fontes: [serviço inglês](https://github.com/mavellium/mvl-operum/blob/d90456ff/services/departmentService.ts#L1), [serviço português](https://github.com/mavellium/mvl-operum/blob/d90456ff/services/departamentoService.ts#L1), [serviço Nest](https://github.com/mavellium/mvl-operum/blob/d90456ff/project-service/src/department/department.service.ts#L1), [teste legado](https://github.com/mavellium/mvl-operum/blob/d90456ff/__tests__/unit/services/departmentService.test.ts#L36), [arquitetura, linha 784](https://github.com/mavellium/mvl-operum/blob/d90456ff/docs/architecture.md#L784).
- Impacto: manutenção/testes podem ocorrer numa implementação não usada pela aplicação; coexistência confunde escolha do caminho canônico e deixa regras divergirem. Não afirmar que duplicação por si só causa bug.
- Escopo: mapa de propriedade por domínio (API Nest versus módulos ainda locais), inventário de imports/entrypoints/scripts; retirar módulos comprovadamente mortos e levar testes de comportamento ao caminho ativo. Agrupar código por domínio gradualmente; manter BFF como adaptação de transporte e serviços locais explicitamente delimitados.
- Aceite: toda remoção respaldada por ausência de consumidor incluindo scripts/testes/dynamic imports; fluxos de departamentos/projetos/sprints passam pelo caminho documentado; testes exercitam implementação ativa; verificação de imports impede novos clientes diretos legados; architecture/decisions explicam exceções temporárias. Sem exigir big-bang de pastas.
- SDD: não duplica remoção de Attachment da fase 2; é dívida de arquitetura já reconhecida no roadmap, detalhada para execução.

## Fase 10 — Experiência e acessibilidade

| Item | Card no Operum | Prioridade | Status |
|---|---|---|---|
| 10.1 | Reverter alterações otimistas do Kanban quando a API falhar (`cmuo1h9rx002p01ndby9xzsgq`) | alta | Pendente |
| 10.2 | Preservar o formulário do card até a criação/edição ser confirmada (`cmuo1hanh002r01nd1uepu4jr`) | alta | Pendente |
| 10.3 | Manter timer sincronizado quando pausar/iniciar falhar (`cmuo1hbit002t01ndbwlhgrnp`) | alta | Pendente |
| 10.4 | Confirmar autosave do Termo antes de salvar versão ou sair (`cmuo1hcdi002v01ndlcro8f8u`) | alta | Pendente |
| 10.5 | Permitir abrir cards pelo teclado independentemente do arraste (`cmuo1hdar002x01nd1isa1gx2`) | media | Pendente |
| 10.6 | Retirar sidebar recolhida da ordem de foco (`cmuo1he4u002z01ndi88juuae`) | media | Pendente |
| 10.7 | Unificar gestão de foco de Drawer e Modal (`cmuo1heyw003101ndy6pb87pm`) | media | Pendente |
| 10.8 | Adaptar navegação lateral para celular com menu sobreposto (`cmuo1hfvo003301nddf04r2fs`) | media | Pendente |

### 10.1 Reverter alterações otimistas do Kanban quando a API falhar

**Card:** `cmuo1h9rx002p01ndby9xzsgq`. **Prioridade:** alta. **Status:** pendente.

**Avaliação UX01 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

- Evidência: arraste de colunas/cards/backlog aplica estado local e ignora o resultado da action; renomear e excluir seguem o mesmo padrão. As actions capturam exceções e retornam `{error}`, logo `await` sozinho não detecta fracasso. Fontes: [SprintBoard.tsx:266](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L266), [SprintBoard.tsx:412](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L412), [sprintBoard.ts:155](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/sprintBoard.ts#L155).
- Impacto inferido: usuário acredita ter movido/excluído um item; ao recarregar ele reaparece ou retorna à posição anterior, com perda de confiança no quadro.
**Escopo e critérios de aceite:** em 403, 500 e falha de rede, restaurar o estado anterior ou reconciliar com servidor, mostrar mensagem acionável e permitir retry; manter operações simultâneas independentes sem rollback apagar uma mudança válida posterior; testes de falha em mover, renomear e excluir.
- Não duplica SDD 2.5: trata persistência/recuperação em todas as movimentações, não regra de motivos para retrocesso.

### 10.2 Preservar o formulário do card até a criação/edição ser confirmada

**Card:** `cmuo1hanh002r01nd1uepu4jr`. **Prioridade:** alta. **Status:** pendente.

**Avaliação UX02 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

- Evidência: contrato `onSubmit` retorna `void`; `handleSave` chama-o e fecha imediatamente. A criação de backlog também fecha mesmo sem `result.card`; criação no quadro só atua no sucesso, sem mostrar erro. Fontes: [CardModal.tsx:27](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/CardModal.tsx#L27), [CardModal.tsx:291](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/CardModal.tsx#L291), [SprintBoard.tsx:225](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L225), [SprintBoard.tsx:427](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L427).
- Impacto inferido: título, descrição e seleção de anexos precisam ser preenchidos novamente após erro; fechamento transmite sucesso falso.
**Escopo e critérios de aceite:** contrato assíncrono com resultado explícito, estado salvando e prevenção de envio duplo; manter campos/anexos selecionados em erro; fechar apenas no sucesso; distinguir card criado com falha parcial de anexo/responsável e oferecer retentativa sem duplicar card.
- Escopo distinto de autosave da descrição já previsto no SDD 1.6.

### 10.3 Manter timer sincronizado quando pausar/iniciar falhar

**Card:** `cmuo1hbit002t01ndbwlhgrnp`. **Prioridade:** alta. **Status:** pendente.

**Avaliação UX03 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

- Evidência: minicard define timer parado antes de `pauseTimerAction`, ignora erro e apaga entryId; modal também seta parado e apaga entryId mesmo quando recebe erro. Inicialização converte erro em zero/sem timer. Fontes: [Card.tsx:91](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/Card.tsx#L91), [Card.tsx:131](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/Card.tsx#L131), [CardTimer.tsx:134](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/CardTimer.tsx#L134), [time.ts:45](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/time.ts#L45).
- Impacto inferido: contador parece pausado enquanto registro continua rodando no servidor; possível lançamento excessivo de horas. Não é a validação de horas/dia do SDD 4.4.
**Escopo e critérios de aceite:** confirmar parada antes de descartar entryId; falha mantém estado confirmado ou estado desconhecido explícito, com reconciliação/retry; erro de carregamento não vira 00:00; minicard e modal refletem o mesmo estado; testar pause rejeitado, timeout e cliques rápidos.

### 10.4 Confirmar autosave do Termo antes de salvar versão ou sair

**Card:** `cmuo1hcdi002v01ndlcro8f8u`. **Prioridade:** alta. **Status:** pendente.

**Avaliação UX04 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

- Evidência: campos de texto são enviados após debounce de 1200 ms; PATCH malsucedido não gera feedback e catch é silencioso. Criar versão envia apenas metadados e não aguarda flush dos campos atuais; o indicador autoSaving considera apenas macrofases. Fontes: [ProjectCharter.tsx:127](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L127), [ProjectCharter.tsx:184](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L184), [ProjectCharter.tsx:324](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L324), [ProjectCharter.tsx:406](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L406).
- Impacto inferido: versão salva logo após digitação pode conter conteúdo anterior; falha de rede pode deixar texto apenas na tela sem aviso.
**Escopo e critérios de aceite:** estados pendente/salvando/salvo/erro para todos os campos; flush confirmado antes de versionar; não criar versão se flush falhar; preservar rascunho recuperável e avisar na saída com pendências; testes com debounce e PATCH lento/rejeitado, inclusive respostas fora de ordem.
- Complementa SDD 7.4, sem repetir separação de formulário ou histórico por campo: aqui é consistência e confiabilidade do salvamento existente.

### 10.5 Permitir abrir cards pelo teclado independentemente do arraste

**Card:** `cmuo1hdar002x01nd1isa1gx2`. **Prioridade:** media. **Status:** pendente.

**Avaliação UX05 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

- Evidência: superfície principal do card é div com props do Draggable e apenas `onClick={onClick}`; título é parágrafo e não há link/botão dedicado para abrir. Com filtro, drag é desativado. O teste de clique usa mock com dragHandleProps vazio e não verifica abertura com teclado. Fontes: [Card.tsx:159](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/Card.tsx#L159), [SprintBoard.tsx:147](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L147), [Card.click.test.tsx:7](https://github.com/mavellium/mvl-operum/blob/d90456ff/__tests__/components/card/Card.click.test.tsx#L7).
- Impacto inferido: foco/teclas destinadas a arrastar não oferecem uma ação inequívoca para abrir detalhes, especialmente com filtros ativos.
**Escopo e critérios de aceite:** botão/link de abertura acessível pelo nome do card, Enter/Space conforme semântica, foco visível; arraste com teclado continua disponível sem conflito; validar sem mouse com e sem filtro e preservar ações de timer/excluir.
- Distinto do SDD 4.2: aqui não é resultado da busca, é o próprio minicard do Kanban.

### 10.6 Retirar sidebar recolhida da ordem de foco

**Card:** `cmuo1he4u002z01ndi88juuae`. **Prioridade:** media. **Status:** pendente.

**Avaliação UX06 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

- Evidência: recolhimento aplica `w-0` e transform ao conteúdo, mantendo links, busca, troca de instituição e botão de sair montados; não aplica inert/hidden. Fontes: [SidebarLayout.tsx:74](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/SidebarLayout.tsx#L74), [SidebarLayout.tsx:114](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/SidebarLayout.tsx#L114).
- Impacto inferido: Tab pode percorrer controles invisíveis e leitor de tela continuar anunciando navegação recolhida.
**Escopo e critérios de aceite:** região recolhida sem foco/interação nem exposição indevida; foco vai ao botão expandir ao recolher e volta a ponto previsível ao expandir; aria-expanded sincronizado; teste com Tab/Shift+Tab, links e campo de busca.

### 10.7 Unificar gestão de foco de Drawer e Modal

**Card:** `cmuo1heyw003101ndy6pb87pm`. **Prioridade:** media. **Status:** pendente.

**Avaliação UX07 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

- Evidência: Drawer declara `aria-modal` mas só implementa Escape e foco inicial, sem contenção/restauração de foco. Modal tem trap, mas título usa ID fixo `modal-title`, cada instância registra Escape no document e não restaura o acionador. Fontes: [Drawer.tsx:28](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/ui/Drawer.tsx#L28), [Modal.tsx:60](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/ui/Modal.tsx#L60), [Modal.tsx:98](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/ui/Modal.tsx#L98). Drawer é usado no histórico do Termo: [ProjectCharter.tsx:623](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L623).
- Impacto inferido: teclado alcança página atrás do histórico; overlays sobrepostos podem competir por foco e Escape; título pode apontar ao modal errado.
**Escopo e critérios de aceite:** trap e restauração consistentes; só overlay superior reage a Escape; fundo sem interação; IDs de título únicos; testes com histórico e diálogo aninhado, abertura/fechamento e nenhum controle focável.

### 10.8 Adaptar navegação lateral para celular com menu sobreposto

**Card:** `cmuo1hfvo003301nddf04r2fs`. **Prioridade:** media. **Status:** pendente.

**Avaliação UX08 · Interface e experiência**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `d90456ff`; análise estática, comportamento empírico a validar.

**Primeira etapa obrigatória:** reproduzir o layout em viewports 360, 390 e 768 px; confirmar impacto antes de implementar a adaptação proposta. Não houve teste visual nesta auditoria.

- Evidência: AppShell coloca sidebar e main em flex horizontal; SidebarLayout reserva `w-56` sem breakpoint, e GlobalSidebar/ProjectSidebar iniciam `collapsed=false`, alterando apenas via localStorage ou botão. Fontes: [AppShell.tsx:27](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/AppShell.tsx#L27), [SidebarLayout.tsx:74](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/SidebarLayout.tsx#L74), [GlobalSidebar.tsx:43](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/GlobalSidebar.tsx#L43), [ProjectSidebar.tsx:65](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/ProjectSidebar.tsx#L65).
- Impacto inferido: primeira visita em viewport de 360–390 px deixa pequena parte da largura para conteúdo até recolher manualmente. Não afirmo sobreposição observada, pois a análise foi estática.
**Escopo e critérios de aceite:** em telas estreitas, conteúdo usa largura disponível e menu abre como overlay acessível; navegação fecha após escolha; comportamento desktop preservado; validar 360, 390 e 768 px em projetos, sprint e documentação, inclusive rotação, teclado e zoom; sem rolagem horizontal da página fora de áreas explicitamente bidimensionais.

## Fase 11 — Segurança e operação

| Item | Card no Operum | Prioridade | Status |
|---|---|---|---|
| 11.1 | Garantir revogação de sessões no gateway com Redis saudável ou indisponível (`cmuo1hh27003501ndsy2521z5`) | alta | Pendente |
| 11.2 | Isolar filas e sessões do Redis sujeito a eviction (`cmuo1hi2p003701ndlu2bq8ws`) | alta | Pendente |
| 11.3 | Implantar imagens imutáveis do SHA aprovado e promover tags somente após validação (`cmuo1hj0u003901nd2z599pt2`) | alta | Pendente |
| 11.4 | Rodar checks dos serviços e smoke das imagens de produção antes do merge/deploy (`cmuo1hjxo003b01ndi9qq30u5`) | alta | Pendente |
| 11.5 | Registrar e ensaiar rollback por release sem retag manual (`cmuo1hkrs003e01ndh7uaymeh`) | alta | Pendente |
| 11.6 | Versionar backup de PostgreSQL/MinIO e comprovar restauração (`cmuo1hlmw003g01ndu19fu0cs`) | alta | Pendente |
| 11.7 | Separar liveness e readiness com verificação das dependências essenciais (`cmuo1hmh3003i01ndo06yaob0`) | media | Pendente |
| 11.8 | Tornar a observabilidade implantável e conectar métricas, logs e alertas (`cmuo1hnaz003k01ndec1y9yqh`) | media | Pendente |

### 11.1 Garantir revogação de sessões no gateway com Redis saudável ou indisponível

**Card:** `cmuo1hh27003501ndsy2521z5`. **Prioridade:** alta. **Status:** pendente.

**Avaliação OPS01-02 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Bug confirmado por fluxo estático, sem reproduzir em produção. A troca/reset incrementa tokenVersion; auth.verify consulta versão, estado e exclusão do usuário; gateway verifica assinatura e existência da sessão, mas não consulta versão/estado. O comentário do reset diz que o gateway rejeita versões antigas, porém as sessões Redis permanecem. Isso permite continuar usando JWT anterior nas APIs que confiam na identidade do gateway enquanto a sessão existir. Fontes: [auth.service.ts:206](https://github.com/mavellium/mvl-operum/blob/c92d3934/auth-service/src/auth/auth.service.ts#L206), [auth.service.ts:239](https://github.com/mavellium/mvl-operum/blob/c92d3934/auth-service/src/auth/auth.service.ts#L239), [auth.service.ts:418](https://github.com/mavellium/mvl-operum/blob/c92d3934/auth-service/src/auth/auth.service.ts#L418), [gateway auth.ts:220](https://github.com/mavellium/mvl-operum/blob/c92d3934/api-gateway/src/middleware/auth.ts#L220), [guard interno project-service:17](https://github.com/mavellium/mvl-operum/blob/c92d3934/project-service/src/guards/internal-auth.guard.ts#L17). Proposta: centralizar verificação revogável da sessão/versão e invalidar todas as sessões nas mudanças sensíveis. Aceite: token pré-reset/troca de senha/desativação é recusado em rotas de project/sprint via gateway; sessão válida continua; teste integrado cobre ambos. Não é o timeout por inatividade do SDD 3.4.

**Indisponibilidade do Redis — mesmo contrato de sessão:**

Comportamento confirmado, não incidente observado: o gateway deliberadamente ignora a falha do Redis; auth.getSession devolve um objeto válido quando available=false, inclusive em produção, embora o comentário mencione desenvolvimento. Logout durante indisponibilidade pode não remover a sessão, pois deleteSession retorna silenciosamente. Fontes: [gateway auth.ts:225](https://github.com/mavellium/mvl-operum/blob/c92d3934/api-gateway/src/middleware/auth.ts#L225), [redis.service.ts:40](https://github.com/mavellium/mvl-operum/blob/c92d3934/auth-service/src/redis/redis.service.ts#L40), [arquitetura:651](https://github.com/mavellium/mvl-operum/blob/c92d3934/docs/architecture.md#L651). Proposta: formalizar decisão de disponibilidade versus revogação; em produção negar operações autenticadas sem comprovação de sessão, ou oferecer alternativa explicitamente revogável com prazo limitado. Aceite: teste com Redis indisponível e recuperado demonstra que logout/revogação não readmite token; resposta de indisponibilidade diferenciada; decisão/documentação atualizada. Distinto de OPS-01: um ocorre com Redis saudável, o outro em pane.

**Escopo delimitado:** unificar a política de validade e revogação em ambos os caminhos, sem substituir o modelo de permissões funcionais do SDD. Cobrir reset, troca de senha, desativação, logout e recuperação do Redis. Decisões de disponibilidade devem ser registradas em `docs/decisions.md` antes da implementação.

### 11.2 Isolar filas e sessões do Redis sujeito a eviction

**Card:** `cmuo1hi2p003701ndlu2bq8ws`. **Prioridade:** alta. **Status:** pendente.

**Avaliação OPS03 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Configuração confirmada; perda efetiva não observada. Redis de produção usa 256 MB e allkeys-lru; BullMQ e sessões apontam ao mesmo serviço redis. Sob pressão, chaves de fila/sessões entram no universo de descarte. Fontes: [compose produção:115](https://github.com/mavellium/mvl-operum/blob/c92d3934/docker-compose.production.yml#L115), [BullMQ:8](https://github.com/mavellium/mvl-operum/blob/c92d3934/notification-service/src/app.module.ts#L8), [sessões:14](https://github.com/mavellium/mvl-operum/blob/c92d3934/auth-service/src/redis/redis.service.ts#L14), [compose:256](https://github.com/mavellium/mvl-operum/blob/c92d3934/docker-compose.yml#L256). Proposta: separar cache descartável de Redis de fila/sessão, definir noeviction para fila e alertar memória; documentar persistência e dimensionamento. Aceite: teste controlado de pressão confirma jobs não descartados, falha de escrita observável, sessões não expulsas por cache; recuperação/retry testados.

### 11.3 Implantar imagens imutáveis do SHA aprovado e promover tags somente após validação

**Card:** `cmuo1hj0u003901nd2z599pt2`. **Prioridade:** alta. **Status:** pendente.

**Avaliação OPS04 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Risco confirmado na configuração. Build publica cada imagem como SHA e prod antes dos scans. Só o job deploy tem concurrency; outro build pode trocar prod enquanto um deploy anterior baixa imagens. SHA recebido pelo script serve para validação/nome do backup e log, não seleciona imagens. Fontes: [workflow:117](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L117), [workflow:207](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L207), [workflow:296](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L296), [compose produção:6](https://github.com/mavellium/mvl-operum/blob/c92d3934/docker-compose.production.yml#L6), [deploy script:84](https://github.com/mavellium/mvl-operum/blob/c92d3934/scripts/deploy/remote-deploy.sh#L84). Proposta: manifest com digest/SHA por serviço, migrate e app com mesma imagem; prod só promovida após checks; registrar versão realmente implantada. Aceite: duas execuções concorrentes não misturam versões; imagem reprovada no scan nunca vira candidata ativa; SHA implantado verificável.

### 11.4 Rodar checks dos serviços e smoke das imagens de produção antes do merge/deploy

**Card:** `cmuo1hjxo003b01ndi9qq30u5`. **Prioridade:** alta. **Status:** pendente.

**Avaliação OPS05 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Lacuna confirmada. Workflow de PR contém CodeQL/secrets; testes/lint/audit estão em push de main/develop e apenas comandos da raiz. Vitest raiz exclui auth-service, notification-service e project-service. Não há boot das imagens antes do deploy; smoke externo vem depois da troca. Fontes: [CodeQL:4](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/codeql.yml#L4), [produção:3](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L3), [produção:73](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L73), [Vitest:31](https://github.com/mavellium/mvl-operum/blob/c92d3934/vitest.config.mts#L31), [produção:357](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L357). Proposta: workflow PR com matriz por pacote, frozen-lockfile, testes existentes, build, audit/Trivy e smoke efêmero das imagens finais com dependências isoladas. Aceite: falha de teste auth/project bloqueia check; pacote runtime ausente faz smoke falhar antes da promoção; evidência de cada pacote testado. Inclui prevenção das classes de incidente PR30/31, não reabre correções já feitas.

### 11.5 Registrar e ensaiar rollback por release sem retag manual

**Card:** `cmuo1hkrs003e01ndh7uaymeh`. **Prioridade:** alta. **Status:** pendente.

**Avaliação OPS06 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Limitação confirmada. Quando up falha, script imprime logs e manda retaggear imagem anterior manualmente; backup guarda apenas dois composes. Migrations já rodaram antes da troca. Fontes: [script:39](https://github.com/mavellium/mvl-operum/blob/c92d3934/scripts/deploy/remote-deploy.sh#L39), [script:54](https://github.com/mavellium/mvl-operum/blob/c92d3934/scripts/deploy/remote-deploy.sh#L54), [script:87](https://github.com/mavellium/mvl-operum/blob/c92d3934/scripts/deploy/remote-deploy.sh#L87), [script:97](https://github.com/mavellium/mvl-operum/blob/c92d3934/scripts/deploy/remote-deploy.sh#L97). Proposta: salvar manifest anterior com digests e procedimento/comando de rollback seguro; política expand/contract para migrations e bloqueio de reversão incompatível; automatizar somente quando seguro. Aceite: simular serviço unhealthy em staging e restaurar release conhecida; confirmar dados íntegros e registrar duração; jamais desfazer schema destrutivamente por padrão. Dependência: OPS-04.

### 11.6 Versionar backup de PostgreSQL/MinIO e comprovar restauração

**Card:** `cmuo1hlmw003g01ndu19fu0cs`. **Prioridade:** alta. **Status:** pendente.

**Avaliação OPS07 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Lacuna do repositório, situação real da VPS desconhecida. Exemplo de backup existe na Arquitetura Desejada, mas inventário de scripts não contém backup/restore implementado; script de deploy copia apenas compose. Fontes: [proposta backup:1052](https://github.com/mavellium/mvl-operum/blob/c92d3934/docs/Arquitetura%20Desejada.md#L1052), [scripts](https://github.com/mavellium/mvl-operum/blob/c92d3934/scripts), [backup compose:54](https://github.com/mavellium/mvl-operum/blob/c92d3934/scripts/deploy/remote-deploy.sh#L54), [volumes produção:110](https://github.com/mavellium/mvl-operum/blob/c92d3934/docker-compose.production.yml#L110). Proposta: primeiro inventariar eventual rotina existente, incorporá-la ao controle de versão; definir retenção, cópia fora da VPS, cifragem/acesso, RPO/RTO e restore conjunto de metadados e objetos. Aceite: restaurar ambiente isolado com projetos, usuários e anexos amostrados íntegros; registrar tempo/ponto recuperável e alerta de falha; sem tocar dados vivos. Não afirmar que produção está sem backup, pois não houve inspeção.

### 11.7 Separar liveness e readiness com verificação das dependências essenciais

**Card:** `cmuo1hmh3003i01ndo06yaob0`. **Prioridade:** media. **Status:** pendente.

**Avaliação OPS08 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Lacuna confirmada. Health do app, auth e project retorna status ok constante; compose usa esses endpoints como service_healthy. Fontes: [app health:1](https://github.com/mavellium/mvl-operum/blob/c92d3934/app/api/health/route.ts#L1), [auth health:5](https://github.com/mavellium/mvl-operum/blob/c92d3934/auth-service/src/health/health.controller.ts#L5), [project health:5](https://github.com/mavellium/mvl-operum/blob/c92d3934/project-service/src/health/health.controller.ts#L5), [compose:152](https://github.com/mavellium/mvl-operum/blob/c92d3934/docker-compose.yml#L152), [compose:211](https://github.com/mavellium/mvl-operum/blob/c92d3934/docker-compose.yml#L211). Proposta: liveness simples e readiness com consultas leves/timeouts ao banco, Redis/storage conforme responsabilidade; evitar cascata de reinícios em indisponibilidade externa. Aceite: processo vivo sem banco responde liveness 200 e readiness 503; deploy não conclui antes da prontidão; resposta pública não contém credenciais/topologia sensível.

### 11.8 Tornar a observabilidade implantável e conectar métricas, logs e alertas

**Card:** `cmuo1hnaz003k01ndec1y9yqh`. **Prioridade:** media. **Status:** pendente.

**Avaliação OPS09 · Segurança e operação**

**Origem:** avaliação geral do Operum, 30/09/2026. Revisão `c92d3934`; análise estática, sem exploração da produção.

Lacuna confirmada no repo. Prometheus aponta app:3000/api/metrics, mas inventário app/api não contém essa rota; não há scrape dos serviços de domínio. Compose sobe Loki/Grafana, porém não define agente de envio nem provisioning; deploy só sincroniza compose/script, apesar de montar ./observability/prometheus.yml. Fontes: [Prometheus:5](https://github.com/mavellium/mvl-operum/blob/c92d3934/observability/prometheus.yml#L5), [rotas app](https://github.com/mavellium/mvl-operum/blob/c92d3934/app/api), [compose produção:153](https://github.com/mavellium/mvl-operum/blob/c92d3934/docker-compose.production.yml#L153), [workflow:307](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L307), [workflow:346](https://github.com/mavellium/mvl-operum/blob/c92d3934/.github/workflows/deploy-production.yml#L346). Proposta: implementar endpoints métricos e scrape por serviço; versionar collector/datasources/dashboards/regras e sincronizar assets no deploy; propagação de request ID e logs sem segredos. Aceite: ambiente vazio recebe toda a configuração; cada target esperado UP; erro de teste rastreável app→gateway→serviço; indisponibilidade gera alerta em destino configurado. Configuração manual existente não foi consultada, portanto não afirmar que Grafana real está vazio.

## Fora do escopo

- **Integração com o Zoom:** épico próprio (OAuth, webhook, extração por IA e tela de revisão), com SDD separado.
- **"Adicionar plano de custo":** já entregue como Planilha de Custos (`/projetos/:id/planilha-custos`, export `.xlsx`). Validar e fechar o card.
- **"Integrar Operum com MCP Claude":** entregue na PR #19 (servidor MCP multi-tenant). Validar e fechar o card.
- **Subtarefas e campos personalizados:** continuam como épico em `docs/mcp/gaps.md`.

---

## Processo por tarefa

0. **Ao começar**, no Operum: mover o card para "Em andamento" e iniciar o timer (`operum_start_timer`, depois do 8.4).
1. Lógica pura com teste Vitest primeiro, quando houver lógica.
2. Service.
3. Action: `verifySession` → autorização → Zod → service → `registrarAcao` → `revalidatePath`.
4. UI.
5. `pnpm test:run`, `pnpm lint`, `npx tsc -p tsconfig.check.json` e `pnpm build`.
6. Um commit por item.
7. **Ao abrir a PR**, no Operum: parar o timer, mover o card para "Em teste" e comentar a PR e os commits.

Cada fase sai numa branch e PR próprias e para para revisão antes da seguinte.
