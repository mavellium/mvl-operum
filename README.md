# Operum

Plataforma de gestão de projetos com Kanban/sprints, EAP/WBS, atas, planilha de custos, documentos do projeto e apontamento de horas, com isolamento multi-tenant. Integra com o Claude via MCP.

- **Produção:** https://operum.adm.br
- **Versão atual:** ver [CHANGELOG.md](CHANGELOG.md) (também exibida no rodapé da sidebar e em `/sobre`)

## Arquitetura

O front-end Next.js conversa apenas com o `api-gateway`, que roteia para os microsserviços. Cada serviço tem seu próprio `package.json`, `Dockerfile` e schema Prisma.

| Serviço | Stack | Porta | Responsabilidade |
|---|---|---|---|
| `app` (raiz) | Next.js 16, React 19, Tailwind 4 | 3000 | Interface web |
| [`api-gateway`](api-gateway/) | Express | 4000 | Roteamento, sessão/JWT, validação de PAT |
| [`auth-service`](auth-service/) | NestJS | 4001 | Usuários, tenants, papéis, Personal Access Tokens |
| [`project-service`](project-service/) | NestJS | 4002 | Projetos, membros, stakeholders |
| [`sprint-service`](sprint-service/) | NestJS | 4003 | Sprints, cards, comentários, horas |
| [`notification-service`](notification-service/) | NestJS | 4004 | Notificações (BullMQ/Redis) |
| [`file-service`](file-service/) | NestJS | 4005 | Anexos e uploads (MinIO/S3) |
| [`mcp-server`](mcp-server/) | Express + MCP SDK | 4006 | Servidor MCP remoto para o Claude |

Infraestrutura: PostgreSQL 16, Redis, MinIO, Traefik (TLS) e, em produção, Prometheus, Loki e Grafana.

Mais detalhes em [docs/architecture.md](docs/architecture.md), domínios em [docs/Domínios/](docs/Domínios/) e especificações em [docs/specs/](docs/specs/).

> **Atenção:** este projeto usa Next.js 16, que tem mudanças incompatíveis com versões anteriores. Consulte `node_modules/next/dist/docs/` antes de alterar código (ver [AGENTS.md](AGENTS.md)).

## Desenvolvimento local

Requisitos: Node 22, pnpm 11 e Docker.

```bash
# 1. Dependências (roda prisma generate no postinstall)
pnpm install

# 2. Variáveis de ambiente
cp .env.example .env   # preencha os valores

# 3. Infra: postgres, redis e minio
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis minio

# 4. Front + todos os microsserviços
pnpm dev:all
```

Acesse http://localhost:3000. Para rodar só o front, use `pnpm dev`.

### Testes e qualidade

```bash
pnpm test:run        # vitest
pnpm test:coverage
pnpm lint
npx tsc -p tsconfig.check.json --noEmit   # typecheck (o build do Next não checa tipos)
```

## Deploy

O push na `main` dispara o workflow [Deploy to Production](.github/workflows/deploy-production.yml):

1. Varredura de segredos (TruffleHog) e CodeQL
2. Lint, testes e `pnpm audit`
3. Build das imagens, push para o GHCR (`:prod` e `:<sha>`) e scan com Trivy
4. Webhook na VPS, que baixa as imagens e roda `docker compose up -d`

O deploy **não** sincroniza os arquivos `docker-compose*.yml` da VPS. Mudanças neles (labels do Traefik, novos serviços) precisam ser aplicadas manualmente no servidor:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d <serviço>
```

Staging usa `docker-compose.staging.yml` com o mesmo fluxo.

## Versionamento

Versionamento semântico, com fonte única no `version` do [package.json](package.json). O número é injetado no build como `NEXT_PUBLIC_APP_VERSION` ([next.config.ts](next.config.ts)).

Para lançar uma versão:
1. Atualize `version` no `package.json`
2. Adicione a entrada no [CHANGELOG.md](CHANGELOG.md)
3. Faça o commit e o push na `main`

## Integração com o Claude (MCP)

O Operum expõe um servidor MCP remoto que permite ao Claude consultar e operar projetos em nome do usuário, autenticado por um Personal Access Token.

1. Gere um token em **Perfil → Tokens** (`/perfil/tokens`). Ele começa com `opr_pat_`.
2. Conecte:

**Claude Code**
```bash
claude mcp add --transport http operum https://api.operum.adm.br/mcp \
  --header "Authorization: Bearer opr_pat_..."
```

**Claude Desktop**: adicione ao `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "operum": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.operum.adm.br/mcp",
               "--transport", "http-only",
               "--header", "Authorization:${OPERUM_AUTH}"],
      "env": { "OPERUM_AUTH": "Bearer opr_pat_..." }
    }
  }
}
```

Depois, reinicie o Claude Desktop por completo.

> O endereço definitivo será `https://mcp.operum.adm.br/mcp` quando o registro DNS existir. Até lá, use `api.operum.adm.br/mcp`.

Tools disponíveis e desenvolvimento local do servidor: [mcp-server/README.md](mcp-server/README.md).
