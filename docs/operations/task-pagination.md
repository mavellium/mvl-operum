# Paginação de tarefas e payload do quadro — SDD 9.6

Implementado em 1.13.0. Não há operação de produção registrada nesta entrega.

## Contrato e limites

`GET /cards/page` aceita projectId ou sprintId; ambos exigem mesma origem. backlog=true exige projectId sem sprintId. Filtros opcionais: columnId, responsibleId, priority, dueBefore/dueAfter (ISO UTC), q (título/descrição, convenção ILIKE do PostgreSQL), fields=summary|full. Limit: padrão 50, máximo 200. Retorno: items, total e next_cursor (null ao terminar). Parâmetros inválidos/intervalo invertido/cursor de outra consulta retornam 400; o gateway exige leitura do projeto e quadro em toda requisição.

Cursor versionado por createdAt/id, com limite superior calculado na primeira página. Tenant, filtros e fields fazem parte do vínculo do cursor; limit pode mudar. Criação e ID não são alterados pelas APIs de edição/movimento. Não depende da existência do card anterior. No conjunto que mantém chave e elegibilidade, percorre itens sem perda ou duplicação. Cada página usa RepeatableRead, mas páginas distintas não compartilham snapshot:

- Nova tarefa com chave posterior ao limite superior inicial só aparece ao reiniciar a listagem.
- Exclusões/revogação/mudanças de filtros ou de projeto podem retirar itens ainda não visitados; total é recalculado, não congelado.
- Tarefas que entram nos filtros depois podem aparecer se sua chave estiver adiante do marcador e até o limite superior. Importações retroativas/SQL que altere createdAt não têm garantia de snapshot.
- Cursor opaco não é uma credencial nem é assinado. Modificá-lo pode alterar o trecho solicitado, mas nunca amplia o tenant/projeto autorizado.
- Cursores antigos de offset de operum_list_tasks não são aceitos. Reiniciar a ferramenta sem cursor; demais ferramentas mantêm suas paginações existentes.

Summary não seleciona descrição/histórico de tempos. Full seleciona descrição/metadados; anexos continuam no file-service e são buscados pelo MCP somente dos IDs retornados. Tags/responsáveis da página são filtrados pelo tenant. Cards sem projectId são incluídos pela sprint; projeto apagado, sprint apagada e vínculos de projeto inconsistentes são excluídos.

O banco materializa no máximo limit+1 cards e suas relações para detectar próxima página. Count exato continua agregando os registros elegíveis; filtros textuais e relações podem exigir varredura no banco. Não há promessa de I/O físico constante. Os índices parciais da migration 20261004030000_task_page_indexes auxiliam as consultas por backlog/sprint; a migration usa CREATE INDEX transacional convencional e pode bloquear escrita durante a construção. Planejar sua aplicação em janela compatível com o volume. Não representa mudança de dados existentes.

## Tempos do quadro

`GET /sprints/:id/columns?timeEntries=summary` seleciona somente timers ativos e agrega duration de entradas encerradas em totalDurationSeconds por card. Usuários apagados/de outro tenant são excluídos nesse modo. UI e leituras de colunas das tools MCP pedem summary. Serializer MCP preserva total_seconds e running.

Sem parâmetro ou com timeEntries=full, o contrato anterior de histórico completo é mantido. O detalhe do card e `/cards/:id/time-entries` continuam disponíveis. Cards do quadro não foram paginados; o ganho aqui é eliminar materialização do histórico encerrado por entrada. Um card com muitas relações/timers ainda pode produzir payload significativo.

## Medição reproduzível

Executar apenas em banco isolado local operum_task_page_test (nunca produção), com DATABASE_URL e OPERUM_TASK_PAGE_TEST_DATABASE_URL iguais, gerar os clientes e aplicar migrations. Executar:

```sh
pnpm exec vitest run __tests__/integration/taskPagination.postgres.test.ts
```

O teste cria fixture própria por UUID, registra eventos SQL do cliente Prisma do serviço e imprime consultas, bytes JSON e latência. A comparação de tarefas reproduz o caminho antigo: listagem de sprints, backlog e cards por sprint com concorrência quatro. Novo caminho executa uma página 20, validando LIMIT 21 no SQL real. Board compara o contrato anterior com o modo summary usando a mesma fixture.

Medição local desta entrega (2026-10-04, PostgreSQL 16; CI usa PostgreSQL 17). Uma execução; latência depende da máquina, cache e volume, não é SLA nem evidência de ganho em produção:

| Fixture | Consultas antes → depois | Bytes antes → depois | Latência antes → depois |
|---|---|---|---|
| 81 sprints, 1.600 cards, página 20 | 493 → 11 | 2.312.424 → 7.729 | 170 ms → 32 ms |
| 1 card, 5.000 tempos encerrados + 1 ativo | 10 → 11 | 1.630.964 → 810 | 54 ms → 30 ms |

O resumo do board acrescenta uma consulta de agregação e evita transferir 5.000 registros. Os gates verificam limites/consultas/bytes, sem impor comparação de latência sujeita a ruído. Check Task Pagination executa fixture real, travessia com remoção do marcador/edição/novas tarefas, filtros, isolamento, anexos da página e regressões MCP. Dashboard Contracts cobre HTTP real através de gateway/JWT/resolvedor/controller/PostgreSQL, incluindo acesso privado, limites, cursor e revogação.
