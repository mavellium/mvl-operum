# mcp-server

Servidor MCP remoto do Operum (Streamable HTTP, stateless). Expõe tools de leitura/escrita para o Claude operar projetos, sprints, cards e apontamento de horas em nome de um usuário autenticado, com isolamento por tenant.

Este serviço **nunca** acessa o banco de dados diretamente — é apenas mais um cliente HTTP do `api-gateway`, autenticado com um Personal Access Token (PAT) do Operum (`opr_pat_...`). Toda autorização e isolamento por tenant acontece no gateway/auth-service (ver `SDD — Integração MCP Operum ↔ Claude`, seções 3 e 6).

## Gerar um token

Gere um PAT em `/perfil/tokens` no Operum.

## Conectar no Claude Code

Global (por usuário):

```bash
claude mcp add --transport http operum https://mcp.operum.adm.br/mcp \
  --header "Authorization: Bearer opr_pat_XXXXXXXX"
```

Por projeto (`.mcp.json` versionado, token via variável de ambiente, nunca commitado):

```json
{
  "mcpServers": {
    "operum": {
      "type": "http",
      "url": "https://mcp.operum.adm.br/mcp",
      "headers": { "Authorization": "Bearer ${OPERUM_TOKEN}" }
    }
  }
}
```

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

## Tools disponíveis (Fase 2a)

| Tool | Escopo | Descrição |
|------|--------|-----------|
| `operum_whoami` | read | Identidade do usuário autenticado pelo token atual |
| `operum_list_projects` | read | Lista os projetos do usuário autenticado no tenant atual |

Demais tools (sprints, cards, comentários, apontamento de horas) chegam nas fases seguintes do SDD.
