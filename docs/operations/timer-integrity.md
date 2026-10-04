# Integridade dos timers — SDD 9.2

O sprint-service permite um timer ativo não excluído por usuário. A migration
`20261004010000_unique_running_timer` cria o índice parcial
`TimeEntry_one_running_per_user` no banco compartilhado, via migrations do app.
O deploy existente executa `prisma migrate deploy` do app antes de trocar containers.
Não há migration adicional no pacote sprint-service.

## Pré-verificação de dados históricos

Antes de um deploy autorizado desta versão, um operador deve executar a consulta
somente leitura no banco alvo e guardar o diagnóstico num local com acesso restrito:

```sql
SELECT "userId", COUNT(*) AS active_count,
       jsonb_agg(jsonb_build_object(
         'id', "id", 'cardId', "cardId", 'startedAt', "startedAt",
         'endedAt', "endedAt", 'duration', "duration"
       ) ORDER BY "startedAt", "id") AS entries
FROM "TimeEntry"
WHERE "isRunning" = true AND "deletedAt" IS NULL
GROUP BY "userId"
HAVING COUNT(*) > 1;
```

Sem linhas, não há duplicados ativos naquele instante. A migration volta a conferir
sob lock de escrita, eliminando a janela entre a conferência e a criação do índice.

Com linhas, **não executar correção automática**: o banco não informa qual intervalo
representa trabalho real, e encerrar todos pelo horário atual pode duplicar horas e
custos. Revisar os registros com seu responsável e registrar quais intervalos são
válidos, quais são duplicados, e como preservar o histórico. Qualquer reparo exige
plano específico, backup e autorização para alterar os dados; esta entrega não
realiza esse reparo nem inspeciona produção.

A migration aborta e faz rollback quando encontra duplicados, sem escolher vencedor,
excluir registros ou recalcular tempos. Se isso acontecer durante o deploy, o fluxo
atual aborta antes de substituir os containers. Após revisão e correção autorizada,
conferir a consulta novamente. Se Prisma tiver marcado a migration como falha, o
operador deve conferir que o rollback não deixou índice/alterações parciais antes de
marcá-la como revertida e reexecutar migrate deploy:

```sh
pnpm exec prisma migrate resolve --rolled-back 20261004010000_unique_running_timer
pnpm exec prisma migrate deploy
```

Esses comandos são procedimento do operador e não autorização para executá-los em
produção. O índice convencional bloqueia escritas durante sua criação; planejar a
janela conforme o volume do banco. Não alterar migrations já aplicadas.

## Contrato do serviço

- Iniciar exige card e usuário do tenant. Timer existente ou colisão concorrente do
  índice ativo devolve 409 com “Já existe um timer em andamento”. O timer anterior
  não é parado implicitamente. MCP conserva a opção existente `stop_running`.
- Parar só altera a linha enquanto `isRunning=true`, com filtro de proprietário,
  tenant, card e exclusão. O primeiro stop grava endedAt/duration; concorrentes e
  retries retornam o intervalo persistido, sem substituir updatedAt nem somar tempo.
- Registro manual/parado já existente retorna seus valores ao receber stop. Entrada
  de outro usuário/tenant ou excluída devolve 404. Exclusão não é desfeita por retry.
- Registros parados, manuais e excluídos não entram no índice parcial e não impedem
  novo timer. Duração calculada não fica negativa sob diferença de relógio.

## Validação

`Sprint Integrity` aplica todas as migrations em PostgreSQL 17 dedicado, compila o
sprint-service e executa testes reais de início/parada concorrentes, rollback de
escrita, índice fora do serviço, duplicados históricos, isolamento e preservação dos
tempos manuais. Os testes exigem `DATABASE_URL` e
`OPERUM_SPRINT_TEST_DATABASE_URL` iguais, host local e banco `operum_sprint_test`.
Nunca rodar essa suíte usando um banco de produção.
