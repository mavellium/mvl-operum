import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TenantContext, TenantRegistry } from '../tenants.js'
import { defineTool } from '../tool.js'
import { paginate, paginationShape } from '../pagination.js'
import { serializeUser } from '../serializers.js'

interface MyTenantItem {
  userId: string
  tenantId: string
  tenantName: string
  tenantSubdomain: string
  role: string
  isCurrent: boolean
}

export interface TenantUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

/** Usuários do tenant (não exige admin) — base para mapear responsáveis entre tenants por e-mail. */
export function fetchTenantUsers(ctx: TenantContext): Promise<TenantUser[]> {
  return ctx.gw.get<TenantUser[]>('/auth/all-users')
}

export function registerContextTools(server: McpServer, registry: TenantRegistry) {
  defineTool(
    server,
    registry,
    'operum_whoami',
    {
      title: 'Quem sou eu',
      description:
        'Identidade do usuário no tenant indicado (padrão: token do header Authorization): id, nome, e-mail, papel, tenant (id e nome) e a lista de tenants configurados neste servidor MCP.',
      inputSchema: {},
      entity: 'Usuário',
      annotations: { readOnlyHint: true },
    },
    async (_args, ctx) => {
      const { contexts } = await registry.listAll()
      return {
        user: { id: ctx.userId, name: ctx.userName, email: ctx.email, role: ctx.role },
        tenant: { id: ctx.tenantId, name: ctx.tenantName },
        configured_tenants: contexts.map(c => ({ tenant_id: c.tenantId, tenant_name: c.tenantName, is_default: c.isDefault })),
      }
    },
  )

  defineTool(
    server,
    registry,
    'operum_list_tenants',
    {
      title: 'Listar tenants',
      description:
        'Lista todos os tenants (workspaces) do usuário, com papel em cada um. has_token=true indica que este servidor MCP tem um PAT para operar o tenant; para os demais, o usuário precisa gerar um PAT nele e adicioná-lo ao header X-Operum-Tokens.',
      inputSchema: {},
      entity: 'Tenant',
      annotations: { readOnlyHint: true },
    },
    async (_args, ctx) => {
      const [memberships, { contexts, failures }] = await Promise.all([
        ctx.gw.get<MyTenantItem[]>('/auth/my-tenants'),
        registry.listAll(),
      ])
      const withToken = new Map(contexts.map(c => [c.tenantId, c]))
      return {
        tenants: memberships.map(m => ({
          tenant_id: m.tenantId,
          name: m.tenantName,
          subdomain: m.tenantSubdomain,
          role: m.role,
          user_id: m.userId,
          has_token: withToken.has(m.tenantId),
          is_default: withToken.get(m.tenantId)?.isDefault ?? false,
        })),
        ...(failures.length ? { token_failures: failures } : {}),
      }
    },
  )

  defineTool(
    server,
    registry,
    'operum_list_users',
    {
      title: 'Listar usuários do tenant',
      description:
        'Membros do tenant: id, nome, e-mail, papel e se está ativo. Use para achar o user_id de um responsável ou mapear pessoas entre tenants pelo e-mail.',
      inputSchema: {
        q: z.string().optional().describe('Filtra por trecho do nome ou e-mail (sem diferenciar maiúsculas).'),
        include_inactive: z.boolean().optional().describe('Inclui usuários desativados (padrão false).'),
        ...paginationShape,
      },
      entity: 'Usuário',
      annotations: { readOnlyHint: true },
    },
    async ({ q, include_inactive, cursor, limit }, ctx) => {
      let users = await fetchTenantUsers(ctx)
      if (!include_inactive) users = users.filter(u => u.isActive !== false)
      if (q) {
        const needle = q.toLowerCase()
        users = users.filter(u => u.name?.toLowerCase().includes(needle) || u.email?.toLowerCase().includes(needle))
      }
      const page = paginate(users, cursor, limit)
      return { ...page, items: page.items.map(u => serializeUser(u as never)) }
    },
  )
}
