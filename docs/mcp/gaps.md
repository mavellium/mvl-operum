# MCP do Operum — o que o spec pediu e o que o modelo de dados tem

Resposta ao spec "MCP do Operum (acesso total para agentes)". O MCP foi implementado sobre o modelo de dados **existente**, sem mudanças de banco. Este documento registra como cada conceito do spec foi mapeado e o que ficou de fora.

## Como o spec foi mapeado

| Spec | Operum | Observação |
|---|---|---|
| tenant | `Tenant` | Listado por `operum_list_tenants`. Um PAT só alcança o próprio tenant, por isso um servidor MCP recebe vários PATs (`X-Operum-Tokens`). |
| usuário | `User` | Uma linha por tenant; a mesma pessoa em dois tenants tem dois ids, ligados pelo e-mail. |
| projeto | `Project` + `ProjectMacroFase` + `UserProject` | O termo de abertura (charter) é formado por campos do próprio `Project`. |
| seção / fase / quadro | `Sprint` + `SprintColumn` | Cada sprint tem as próprias colunas, ordenadas por `position`. |
| status da tarefa | coluna da sprint | Não existe um enum de status. Tarefa fora de sprint = backlog do projeto. |
| tarefa | `Card` + `CardResponsible` + `CardTag` | Prioridade é texto (`baixa`, `media`, `alta`). |
| etiqueta | `Tag` | Única por (nome, dono) e visível no tenant inteiro. |
| comentário | `Comment` | Só o autor edita ou exclui. |
| histórico | `CardMovement` + `AuditLog` | Movimentos entre colunas, mais a auditoria. |

## Lacunas (fora do MCP nesta versão)

| Pedido do spec | Situação | Proposta |
|---|---|---|
| Subtarefas (`parent_id`) | `Card` não tem hierarquia. | **Épico de produto:** `Card.parentId` + UI de subtarefas. Depois disso, o MCP expõe `parent_id` em `get/create/update_task` e na migração. |
| Campos personalizados | Não há modelo para eles. | **Mesmo épico:** definição de campo por projeto + valores por card. |
| Seções/status configuráveis por projeto | As colunas são por sprint; não há um status global do projeto. | Avaliar junto com o épico; hoje o MCP trata a coluna como status. |
| Documentos do projeto (WBS, EAP, atas, termo em versões) | Existem só no monólito Next.js, acessados direto pelo Prisma, fora do api-gateway. | Migrar essas rotas para um serviço atrás do gateway e então expor pelo MCP. |
| Anexos (listar/baixar/enviar) | O file-service existe, mas não foi exposto nesta fase. | Fase 4 do spec. A migração lista os anexos como não copiados. |
| Busca global, resumos, "minhas tarefas", horas | Adiados (fase 4 do spec). | `operum_list_tasks` já filtra por responsável, prazo e texto dentro de um projeto. |
| Autoria "Claude via MCP" visível na tela de atividade | O `AuditLog` grava (`details.via = "mcp"`, `authType`, `apiTokenId`), mas nenhuma tela do Operum lê o `AuditLog`. | Criar a tela de atividade (ou um painel no card) que leia `GET /audit`. |
| Datas e autoria originais na importação | A API não aceita `createdAt` nem autor. | A data e o autor originais entram no texto do comentário, e a origem da importação entra na descrição do projeto. |
| Escopos `read` / `write` / `admin` | O PAT tem `read` e `write`. Operações de conta e sessão ficam bloqueadas para PAT. | Suficiente por ora. |

## Achados de segurança corrigidos junto (Fase 0)

Expor o Operum a um agente ampliaria o impacto destes problemas, que já existiam:

1. **sprint-service sem escopo de tenant.** Sprints, colunas, cards, comentários, horas e métricas eram lidos e alterados por id, sem conferir o tenant. Agora toda rota exige `x-tenant-id` e responde 404 fora do tenant (`sprint-service/src/common/tenant-scope.ts`).
2. **PAT podia virar sessão em outro tenant.** Um PAT com `write` chamava `/auth/switch-tenant` e recebia um JWT completo. Agora o gateway aplica uma allowlist para PAT em `/auth/*` (só `me`, `my-tenants` e `all-users`), e o auth-service repete o bloqueio com `NoPatGuard`.
3. **Rotas do project-service sem escopo:** papéis por projeto, stakeholders por projeto e reordenação. Também `addMember`, que aceitava usuário de outro tenant.
4. **Filtros que viravam "todos os tenants"** quando `x-tenant-id` vinha vazio: `GET /audit` e `GET /auth/all-users`.

Fica registrado, sem implementar: **não existe checagem de participação no projeto** nos serviços. Qualquer membro do tenant lê e altera todos os projetos do tenant, e o MCP herda esse comportamento.

## Épico para o backlog do Operum

> **Suporte nativo a subtarefas e campos personalizados**
> - `Card.parentId` (auto-relação) com UI de subtarefas no card e no quadro.
> - Campos personalizados: definição por projeto (nome, tipo, opções) e valores por card.
> - Quando estiver pronto: expor `parent_id` e `custom_fields` no MCP (`get/create/update_task`, `list_tasks` e export/import).
