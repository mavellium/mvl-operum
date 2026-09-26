import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { gateway } from './gateway.js'
import { registerWhoami } from './tools/context.js'
import { registerListProjects } from './tools/projects.js'

/** Constrói um McpServer novo por requisição (stateless, D3), autenticado com o PAT do chamador. */
export function buildServer(token: string): McpServer {
  const server = new McpServer({ name: 'operum', version: '1.0.0' })
  const gw = gateway(token)

  registerWhoami(server, gw)
  registerListProjects(server, gw)

  return server
}
