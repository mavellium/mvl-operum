import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Gateway } from '../gateway.js'
import { formatWhoami } from '../format.js'
import { toToolError } from '../errors.js'

interface WhoamiResponse {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
  cargo?: string | null
  departamento?: string | null
}

/** Busca o usuário autenticado pelo token atual — usada por outras tools para obter o próprio userId com segurança (nunca aceitar userId como input do modelo). */
export async function fetchWhoami(gw: Gateway): Promise<WhoamiResponse> {
  return gw.get<WhoamiResponse>('/auth/me')
}

export function registerWhoami(server: McpServer, gw: Gateway) {
  server.registerTool(
    'operum_whoami',
    {
      title: 'Quem sou eu',
      description: 'Retorna a identidade do usuário autenticado pelo token atual: nome, e-mail, papel e tenant. Use antes de qualquer outra tool se precisar confirmar em qual workspace o agente está operando.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const me = await fetchWhoami(gw)
        return { content: [{ type: 'text' as const, text: formatWhoami(me) }] }
      } catch (err) {
        return toToolError(err, 'Usuário')
      }
    },
  )
}
