import { describe, it, expect, vi } from 'vitest'
import { registerWhoami } from '../tools/context'
import { registerListProjects } from '../tools/projects'
import type { Gateway } from '../gateway'

function fakeServer() {
  const handlers = new Map<string, (args: unknown) => Promise<unknown>>()
  return {
    registerTool: vi.fn((name: string, _config: unknown, handler: (args: unknown) => Promise<unknown>) => {
      handlers.set(name, handler)
    }),
    handlers,
  }
}

function fakeGateway(overrides: Partial<Gateway> = {}): Gateway {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }
}

describe('operum_whoami', () => {
  it('retorna a identidade formatada quando o gateway responde com sucesso', async () => {
    const server = fakeServer()
    const gw = fakeGateway({ get: vi.fn().mockResolvedValue({ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'admin', tenantId: 't1' }) })

    registerWhoami(server as never, gw)
    const result = (await server.handlers.get('operum_whoami')!({})) as { content: { text: string }[] }

    expect(gw.get).toHaveBeenCalledWith('/auth/me')
    expect(result.content[0].text).toContain('Ana <a@x.com>')
  })

  it('mapeia erro do gateway para isError sem vazar detalhes internos', async () => {
    const server = fakeServer()
    const err = new Error('Token inválido') as Error & { status: number }
    err.status = 401
    const gw = fakeGateway({ get: vi.fn().mockRejectedValue(err) })

    registerWhoami(server as never, gw)
    const result = (await server.handlers.get('operum_whoami')!({})) as { isError: boolean; content: { text: string }[] }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/revogado/)
  })
})

describe('operum_list_projects', () => {
  it('deriva o userId do whoami — nunca aceita userId como input da tool', async () => {
    const server = fakeServer()
    const get = vi.fn()
      .mockResolvedValueOnce({ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'member', tenantId: 't1' })
      .mockResolvedValueOnce([{ projectId: 'p1', project: { id: 'p1', name: 'Projeto X', status: 'ACTIVE' } }])
    const gw = fakeGateway({ get })

    registerListProjects(server as never, gw)
    const result = (await server.handlers.get('operum_list_projects')!({})) as { content: { text: string }[] }

    expect(get).toHaveBeenNthCalledWith(1, '/auth/me')
    expect(get).toHaveBeenNthCalledWith(2, '/projects/user/u1')
    expect(result.content[0].text).toContain('Projeto X')
  })

  it('filtra por status no lado do mcp-server (o endpoint do Operum não filtra)', async () => {
    const server = fakeServer()
    const get = vi.fn()
      .mockResolvedValueOnce({ id: 'u1', name: 'Ana', email: 'a@x.com', role: 'member', tenantId: 't1' })
      .mockResolvedValueOnce([
        { projectId: 'p1', project: { id: 'p1', name: 'Ativo', status: 'ACTIVE' } },
        { projectId: 'p2', project: { id: 'p2', name: 'Arquivado', status: 'ARCHIVED' } },
      ])
    const gw = fakeGateway({ get })

    registerListProjects(server as never, gw)
    const result = (await server.handlers.get('operum_list_projects')!({ status: 'ACTIVE' })) as { content: { text: string }[] }

    expect(result.content[0].text).toContain('Ativo')
    expect(result.content[0].text).not.toContain('Arquivado')
  })

  it('mapeia erro do gateway para isError', async () => {
    const server = fakeServer()
    const err = new Error('fora do ar') as Error & { status: number }
    err.status = 500
    const gw = fakeGateway({ get: vi.fn().mockRejectedValue(err) })

    registerListProjects(server as never, gw)
    const result = (await server.handlers.get('operum_list_projects')!({})) as { isError: boolean }

    expect(result.isError).toBe(true)
  })
})
