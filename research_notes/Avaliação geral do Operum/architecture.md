# Arquitetura, persistência e contratos internos do Operum

Revisão: `d90456ff`; auditoria estática local em 2026-09-30. Não executei operações em banco/produção nem alterei código. Prioridades propostas: P1 alta, P2 média, P3 baixa. Os cenários abaixo têm evidência no código; incidência e volume em produção não foram medidos. Links fixados na revisão auditada. Ao concluir, HEAD estava em `c92d3934`, branch `feat/backlog-fase-4`, alterada por outra sessão; comparei os diffs dos arquivos afetados e nenhum dos sete achados foi corrigido nesse avanço. Todas as referências abaixo permanecem na revisão `d90456ff` para manter linhas estáveis. Nenhuma branch foi trocada.

## Quais falhas de consistência e transações merecem cards?

### Takeaway
As maiores oportunidades estão em preservar integridade dos cards ao excluir sprints e em tornar atômicas operações de múltiplas escritas. Testes unitários com Prisma mockado não garantem invariantes de concorrência no banco.

### Cited Findings

**A1 — P1 — Preservar vínculo com projeto e atomicidade ao excluir uma sprint. Confirmado por fluxo estático.**
- `SprintService.remove` limpa `sprintId`, `sprintColumnId` e `sprintPosition`, mas não preenche `projectId`; em seguida exclui logicamente a sprint, fora de transação. A criação de card permite apenas `sprintId`, sem `projectId`; o retorno individual ao backlog já reconhece e corrige essa situação, mas a exclusão da sprint não. O backlog consulta obrigatoriamente `projectId`, logo cards criados só com sprint deixam de aparecer e também deixam de ser encontrados por `cardInTenant`. Fontes: [remoção, linhas 87–95](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/sprint/sprint.service.ts#L87), [criação, linha 146](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L146), [retorno individual, linha 173](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L173), [backlog, linha 57](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L57), [escopo, linha 25](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/common/tenant-scope.ts#L25).
- Impacto: tarefas ficam inacessíveis ao excluir a sprint. Não foi constatada exclusão física dos dados.
- Escopo: herdar projeto da sprint quando ausente, validar coerência dos vínculos existentes, definir posição no backlog e envolver transferência + exclusão na mesma transação. Diagnóstico de dados históricos deve ser tarefa controlada, sem inferir automaticamente o projeto de órfãos sem evidência.
- Aceite: criar card apenas com sprintId, excluir sprint e localizar card no backlog e pelo id, preservando comentários/tempos; falha intermediária mantém sprint e cards no estado anterior; casos com projectId pré-existente cobertos por integração.
- SDD: não duplica item existente; complementa integridade do quadro da fase 2.

**A2 — P1 — Garantir timer único sob concorrência e parada idempotente. Confirmado por código; corrida não reproduzida em banco.**
- `start` consulta timer ativo e depois insere em operações separadas; `TimeEntry` não declara unicidade de timer ativo por usuário e não encontrei índice parcial nas migrations. `stop` aceita registro já parado e substitui `endedAt`/`duration` pela hora de cada nova chamada. Fontes: [start/stop, linhas 22–45](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/time-entry/time-entry.service.ts#L22), [schema, linha 191](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/prisma/schema.prisma#L191), [testes existentes, linha 24](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/time-entry/time-entry.service.spec.ts#L24).
- Impacto: dois inícios simultâneos podem gravar dois timers; retry de stop altera horas já encerradas, afetando custos.
- Escopo: proteção no banco/controle transacional para um timer ativo, tratamento de conflito previsível e stop condicional/idempotente; decidir tratamento de duplicados históricos antes da restrição.
- Aceite: duas chamadas concorrentes produzem apenas um timer ativo; stop repetido mantém exatamente endedAt e duration originais; falha/retry não duplica tempo; teste real de concorrência em PostgreSQL, além dos mocks.
- SDD: extensão de confiabilidade do 8.4 já entregue, não recriar as ferramentas MCP.

**A3 — P1 — Tornar movimentação de card, histórico e ordenação uma operação atômica. Confirmado por código; falha parcial não injetada.**
- `CardService.update` grava `cardMovement` antes de `card.update`, depois renumera destino e origem; cada `renumberColumn` faz sua própria transação de updates, mas leituras e operação completa ficam fora dela. Fontes: [histórico, linha 180](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L180), [update/renumeração, linha 201](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L201), [transação parcial, linha 224](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/card/card.service.ts#L224).
- Impacto: uma falha pode registrar movimento inexistente ou deixar ordenação parcial; movimentações simultâneas podem sobrescrever posições calculadas sobre estado antigo.
- Escopo: serviço transacional único com estratégia explícita de concorrência por coluna/sprint, histórico só de movimentos efetivados e retorno com posição final normalizada.
- Aceite: falha após qualquer escrita reverte movimento, card e posições; movimentos concorrentes deixam ordem determinística e posições válidas; histórico condiz com estado final; não regredir drag-and-drop simples.
- SDD: sobreposição parcial com 2.5, que corrigiu renumeração simples; este card trata atomicidade e concorrência ainda ausentes.

**A4 — P1 — Substituir macrofases sem janela de perda de dados. Confirmado por código; falha parcial não injetada.**
- `upsertMacroFase` executa `deleteMany` e `createMany` separados. A action atualiza primeiro o projeto, depois macrofases via HTTP, depois sincroniza a EAP localmente, permitindo etapas persistidas quando a seguinte falha. Fontes: [serviço, linha 151](https://github.com/mavellium/mvl-operum/blob/d90456ff/project-service/src/project/project.service.ts#L151), [action, linha 195](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/projetos.ts#L195).
- Impacto: erro na recriação deixa macrofases vazias; projeto/macrofases/EAP podem divergir após atualização parcialmente concluída.
- Escopo mínimo: validar lote antes de mutar e transacionar substituição no project-service. Complemento: definir fonte canônica e mecanismo de reconciliação/retry idempotente para sincronização EAP; não propor transação de banco mantida aberta através de HTTP.
- Aceite: erro de inserção preserva macrofases anteriores; lote válido substitui tudo uma vez; interrupção na sincronização aparece como pendência rastreável e retry converge sem duplicar fases; documentar responsabilidade de cada armazenamento.
- SDD: relacionado a EAP/documentos, mas não duplica layouts nem versionamento das fases 6/7.

### Inferences
- Os riscos de falha parcial resultam da ordem das escritas acima; não são relatos de incidentes observados. As correções devem incluir testes de falha e concorrência específicos, em vez de apenas aumentar cobertura percentual.

### Gaps
- Não medi incidência dos problemas nem examinei dados existentes; não se pode afirmar que já há timers duplicados, cards órfãos ou macrofases perdidas em produção.

## Quais contratos e consultas precisam ser corrigidos?

### Takeaway
Há rotas usadas pela interface sem implementação correspondente, e a paginação MCP ocorre depois de carregar todo o projeto. São problemas distintos: o primeiro é funcional e prioritário; o segundo precisa de critérios de escala verificáveis.

### Cited Findings

**A5 — P1 — Restaurar contratos dos dashboards global e por sprint, com teste integrado de rota. Confirmado no repositório.**
- O cliente chama `/dashboard/global` e `/sprints/:id/dashboard`; as actions repassam essas chamadas. O gateway não roteia `/dashboard`, e o controller de dashboard do sprint-service só registra `/sprints/:id/metrics` e `/sprints/:id/feedback`, sem dashboard agregado. Os consumidores exibem erro se a action falha. Fontes: [cliente, linha 314](https://github.com/mavellium/mvl-operum/blob/d90456ff/lib/api-client.ts#L314), [actions, linha 14](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/dashboard.ts#L14), [gateway, linha 86](https://github.com/mavellium/mvl-operum/blob/d90456ff/api-gateway/src/main.ts#L86), [controller](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/dashboard/dashboard.controller.ts#L1), [dashboard global, linha 26](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/dashboard/page.tsx#L26), [sprint, linha 6](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/dashboard/SprintDashboardContent.tsx#L6).
- Impacto: caminhos de dashboard não conseguem obter o contrato esperado por essas rotas. O dashboard global citado é o de usuário comum; admin é redirecionado a outra tela, não generalizar o achado a ela.
- Escopo: implementar agregação e roteamento ou alinhar BFF à API canônica; definir schemas de resposta compartilhados/validados, sem casts mascarando contratos inexistentes.
- Aceite: fixtures com tempos/cards/feedbacks resultam em KPIs corretos nas duas telas; caso vazio renderiza zeros/listas vazias; teste percorre BFF→gateway→controller real e valida formato e status; preservação do escopo de projeto/tenant testada pelo responsável de segurança.
- SDD: não duplica item 3.1 sobre cargo no ranking nem 2.4 sobre navegação; pré-requisito para as telas funcionarem.

**A6 — P2 — Paginar tarefas no serviço de origem e reduzir varreduras MCP. Consulta completa confirmada; lentidão ainda não medida.**
- `collectTasks` carrega sprints, backlog e cards de cada sprint; só depois `operum_list_tasks` filtra e aplica `paginate`. Assim pedir limit pequeno não limita leituras de banco nem payload interno do projeto inteiro. `listColumns` também inclui todos os timeEntries de todos os cards. Fontes: [coleta, linha 41](https://github.com/mavellium/mvl-operum/blob/d90456ff/mcp-server/src/tools/tasks.ts#L41), [paginação tardia, linha 180](https://github.com/mavellium/mvl-operum/blob/d90456ff/mcp-server/src/tools/tasks.ts#L180), [board, linha 97](https://github.com/mavellium/mvl-operum/blob/d90456ff/sprint-service/src/sprint/sprint.service.ts#L97).
- Impacto: custo de cada página cresce com total de sprints/cards; risco de latência/memória, sem evidência de incidente atual.
- Escopo: endpoint de listagem com filtros e cursor estável aplicado na origem; MCP delega busca sem varrer todo projeto. Medir payload do board e substituir histórico de tempos por resumo/ativo onde não se precisa do detalhe.
- Aceite: fixture grande com limite 20 devolve 20 cards sem carregar todos; percorrer páginas não perde/duplica itens sob a semântica documentada; cards sem projectId direto continuam contemplados por sprint; medir quantidade de consultas, bytes e latência antes/depois; anexos continuam carregados apenas da página.
- SDD: não duplica busca 4.2, importação 8.1 ou anexos 8.2/8.3.

### Inferences
- Um teste de contrato de rota real agrega mais valor que mocks adicionais para A5: os tipos TypeScript atuais aceitam casts, mas não demonstram existência do endpoint.

### Gaps
- Não executei navegação autenticada nem benchmark; A5 é constatação estática da revisão, não reprodução ao vivo. A6 exige medir antes de estabelecer SLO numérico.

## Que organização e responsabilidades devem melhorar?

### Takeaway
O repositório preserva camadas legadas paralelas à API atual. A melhoria deve identificar propriedade de domínio e remover caminhos comprovadamente sem consumidores, evitando uma reorganização geral sem ganho demonstrável.

### Cited Findings

**A7 — P2 — Consolidar serviços legados e definir fronteiras de domínio verificáveis. Duplicação confirmada; remoção depende de inventário completo.**
- `services/departmentService.ts` e `services/departamentoService.ts` implementam quase o mesmo CRUD direto no Prisma; a busca de referências encontrou o primeiro nos testes unitários e nenhum consumidor de runtime para esses dois módulos. Há ainda CRUD em `project-service/src/department`. A arquitetura reconhece migração incompleta e clientes diretos mortos `lib/projectClient.ts`/`lib/sprintClient.ts`. Fontes: [serviço inglês](https://github.com/mavellium/mvl-operum/blob/d90456ff/services/departmentService.ts#L1), [serviço português](https://github.com/mavellium/mvl-operum/blob/d90456ff/services/departamentoService.ts#L1), [serviço Nest](https://github.com/mavellium/mvl-operum/blob/d90456ff/project-service/src/department/department.service.ts#L1), [teste legado](https://github.com/mavellium/mvl-operum/blob/d90456ff/__tests__/unit/services/departmentService.test.ts#L36), [arquitetura, linha 784](https://github.com/mavellium/mvl-operum/blob/d90456ff/docs/architecture.md#L784).
- Impacto: manutenção/testes podem ocorrer numa implementação não usada pela aplicação; coexistência confunde escolha do caminho canônico e deixa regras divergirem. Não afirmar que duplicação por si só causa bug.
- Escopo: mapa de propriedade por domínio (API Nest versus módulos ainda locais), inventário de imports/entrypoints/scripts; retirar módulos comprovadamente mortos e levar testes de comportamento ao caminho ativo. Agrupar código por domínio gradualmente; manter BFF como adaptação de transporte e serviços locais explicitamente delimitados.
- Aceite: toda remoção respaldada por ausência de consumidor incluindo scripts/testes/dynamic imports; fluxos de departamentos/projetos/sprints passam pelo caminho documentado; testes exercitam implementação ativa; verificação de imports impede novos clientes diretos legados; architecture/decisions explicam exceções temporárias. Sem exigir big-bang de pastas.
- SDD: não duplica remoção de Attachment da fase 2; é dívida de arquitetura já reconhecida no roadmap, detalhada para execução.

### Inferences
- Extrair imediatamente todos os domínios locais para microsserviços aumentaria o escopo sem evidência de benefício; consolidar contratos e ownership primeiro é uma proposta, não decisão arquitetural aprovada.

### Gaps
- Deduplicação: li os 56 cards de `backlog.json`. A1/A4/A5/A7 não têm equivalente direto. A2 deve relacionar `cmunb6l4h000x01s2dy6tcrjt` (timer MCP), A3 deve relacionar `cmuk8c0ya000u01jwgg1ji2z9` (posição/scroll) e A6 deve relacionar `cmuk8ep8a001201jwp7rlqwg7` (indisponibilidade MCP), sem atribuir aquele incidente à paginação sem logs. São extensões distintas, não repetir os pedidos originais.
- Não foi realizada análise completa de código morto nem estimativa de esforço. A7 deve começar pelo inventário; os exemplos são candidatos concretos, não licença para exclusão indiscriminada.
