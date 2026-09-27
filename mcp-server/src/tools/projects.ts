import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Gateway } from '../gateway.js'
import { fetchWhoami } from './context.js'
import { formatProjectList } from '../format.js'
import { toToolError } from '../errors.js'

const PROJECT_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'ARCHIVED'] as const

interface UserProjectItem {
  projectId: string
  project: { id: string; name: string; status: string }
}

export function registerListProjects(server: McpServer, gw: Gateway) {
  server.registerTool(
    'operum_list_projects',
    {
      title: 'Listar projetos',
      description: 'Lista os projetos do usuário autenticado neste tenant. Use operum_whoami antes se precisar confirmar o tenant atual.',
      inputSchema: {
        status: z.enum(PROJECT_STATUSES).optional().describe('Filtra pelo status do projeto (aplicado no mcp-server — o endpoint do Operum não filtra por status).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status }) => {
      try {
        // O userId nunca vem de input do modelo — GET /projects/user/:userId no
        // project-service não valida que a URL bate com o token (achado de
        // segurança pré-existente), então é o mcp-server quem garante que só a
        // própria identidade do token é usada aqui.
        const me = await fetchWhoami(gw)
        const items = await gw.get<UserProjectItem[]>(`/projects/user/${me.id}`)
        const filtered = status ? items.filter(item => item.project.status === status) : items
        return { content: [{ type: 'text' as const, text: formatProjectList(filtered) }] }
      } catch (err) {
        return toToolError(err, 'Projeto')
      }
    },
  )
}
