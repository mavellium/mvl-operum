# mcp-server

Servidor MCP remoto do Operum (Streamable HTTP, stateless). Expõe tools de leitura, escrita e migração para o Claude operar projetos, sprints, tarefas e comentários em nome de um usuário autenticado, em todos os tenants dele, com isolamento por tenant.

Este serviço **nunca** acessa o banco de dados diretamente — é apenas mais um cliente HTTP do `api-gateway`, autenticado com um Personal Access Token (PAT) do Operum (`opr_pat_...`). Toda autorização e isolamento por tenant acontece no gateway/auth-service (ver `SDD — Integração MCP Operum ↔ Claude`, seções 3 e 6).

## Gerar um token

Gere um PAT em `/perfil/tokens` no Operum.

> Endpoint atual: `https://api.operum.adm.br/mcp`. O endereço definitivo `https://mcp.operum.adm.br/mcp` depende do registro DNS.

## Conectar no Claude Code

Um único servidor opera todos os seus workspaces (tenants). Cada PAT do Operum é preso a um tenant, então gere **um token em cada workspace** (`/perfil/tokens`, logado nele) e passe todos:

- `Authorization: Bearer <pat>` — tenant padrão (usado quando a tool não recebe `tenant_id`);
- `X-Operum-Tokens: <pat>,<pat>` — demais tenants (até 10 tokens no total).

```bash
claude mcp add --transport http operum https://api.operum.adm.br/mcp \
  --header "Authorization: Bearer opr_pat_MAVELLIUM" \
  --header "X-Operum-Tokens: opr_pat_OUTRO_TENANT"
```

Por projeto (`.mcp.json` versionado, tokens via variável de ambiente, nunca commitados):

```json
{
  "mcpServers": {
    "operum": {
      "type": "http",
      "url": "https://api.operum.adm.br/mcp",
      "headers": {
        "Authorization": "Bearer ${OPERUM_TOKEN}",
        "X-Operum-Tokens": "${OPERUM_EXTRA_TOKENS}"
      }
    }
  }
}
```

Escritas exigem tokens com escopo `write`. Um token revogado deixa de funcionar imediatamente (o gateway introspecta cada chamada).

Cópias de projetos grandes podem levar alguns minutos (o servidor respeita o limite de 20 req/s por token do gateway). Se o cliente MCP cortar a chamada, aumente o timeout de tools (no Claude Code: `MCP_TOOL_TIMEOUT`, em ms).

## Desenvolvimento local

```bash
pnpm --dir mcp-server install
pnpm --dir mcp-server start:dev
```

Requer `API_GATEWAY_INTERNAL_URL` apontando para um `api-gateway` acessível (por padrão `http://api-gateway:4000`, ajuste para `http://localhost:4000` fora do Docker Compose).

Validar com o [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector
```

## Tools disponíveis

Toda tool aceita `tenant_id` (omitido = tenant do token padrão) e responde JSON. Listas usam `cursor` + `limit`.

| Grupo | Tools |
|---|---|
| Identidade | `operum_whoami`, `operum_list_tenants`, `operum_list_users` |
| Projetos | `operum_list_projects`, `operum_get_project`, `operum_create_project`, `operum_update_project`, `operum_archive_project`, `operum_delete_project`, `operum_add_project_member`, `operum_remove_project_member` |
| Sprints e colunas | `operum_list_sprints`, `operum_get_sprint`, `operum_create_sprint`, `operum_update_sprint`, `operum_delete_sprint`, `operum_create_column`, `operum_update_column`, `operum_delete_column` |
| Tarefas | `operum_list_tasks`, `operum_get_task`, `operum_create_task`, `operum_update_task`, `operum_move_task`, `operum_delete_task`, `operum_set_task_tags`, `operum_set_task_responsibles`, `operum_bulk_update_tasks` |
| Etiquetas | `operum_list_tags`, `operum_create_tag` |
| Anexos | `operum_upload_attachment`, `operum_add_link`, `operum_delete_attachment` (a leitura vem em `operum_get_task` e `operum_list_tasks` com `fields="full"`) |
| Comentários | `operum_list_comments`, `operum_create_comment`, `operum_update_comment`, `operum_delete_comment` |
| Histórico | `operum_get_activity` |
| Migração | `operum_export_project`, `operum_import_project`, `operum_copy_project` |

Segurança das escritas:

- `delete_*` / `remove_*` exigem `confirm: true`.
- `bulk_update_tasks`, `import_project` e `copy_project` rodam em `dry_run` por padrão.
- `create_task` aceita `idempotency_key` (memória de 24h por token; vale com uma réplica do servidor).
- Toda escrita é registrada no `AuditLog` do Operum com `details.via = "mcp"`; o sprint-service acrescenta `authType`/`apiTokenId` a partir dos headers do gateway.

### Anexos

- `operum_upload_attachment` recebe o arquivo em `content_base64` (até 10 MB; aceita `data:` URL) ou em `url`, que o servidor baixa (até 50 MB). Tipos aceitos: imagens, vídeos MP4/WebM/MOV, PDF, Word, Excel, PowerPoint, OpenDocument, TXT, CSV e ZIP. A lista é a mesma do app e do file-service, e um teste de paridade garante isso.
- O download por `url` só aceita HTTPS na porta 443. Ele recusa endereço privado, loopback, link-local (metadados de nuvem) e reservado. A checagem acontece no momento da conexão (resiste a DNS rebinding) e vale também para cada redirecionamento, no máximo 3. O prazo total é de 60 s.
- `operum_add_link` anexa só a URL (YouTube, Vimeo, Loom, Drive...), sem baixar nada. No card, vídeo do YouTube ganha miniatura. O mesmo link na mesma tarefa não é duplicado.
- Toda tool confere antes, por `GET /cards/:id`, se a tarefa é do tenant do token. O file-service não conhece tenant.

### Migração entre tenants

`operum_copy_project` (export + import numa chamada) recria no destino: projeto e termo de abertura, macro-fases, membros, stakeholders, etiquetas, sprints com colunas, tarefas (coluna, posição, prioridade, datas), responsáveis e comentários.

- Pessoas são casadas por **e-mail**; `user_mapping` cobre exceções. Quem não existir no destino fica sem vínculo e aparece em `unmapped_users`.
- Comentários são criados em nome do dono do token de destino; autor e data originais vão no início do texto.
- Não são copiados: anexos (arquivos), histórico de movimentação, métricas/feedback de sprint, horas e documentos do monólito (WBS/EAP/atas).
- O relatório final traz contagens planejadas/criadas, `skipped`, `errors` e o mapa de ids. Se a importação falhar no meio, exclua o projeto criado (`target.project_id`) e rode de novo — o conflito de nome impede duplicar sem querer.

Lacunas do modelo de dados em relação ao spec original: ver [`docs/mcp/gaps.md`](../docs/mcp/gaps.md).
