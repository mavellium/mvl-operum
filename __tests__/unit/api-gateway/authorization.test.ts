// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response as ExpressResponse } from 'express'
import { authorizationMiddleware } from '../../../api-gateway/src/middleware/authorization'
const fetchMock = vi.fn()
const json = vi.fn()
const status = vi.fn(() => ({ json }))
const next = vi.fn()
const req = () => ({ path: '/cards/search', originalUrl: '/cards/search?q=test', method: 'GET', headers: { 'x-user-id': 'user-A', 'x-tenant-id': 'tenant-A', 'x-authorized-projects': 'forged' } }) as unknown as Request
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockResolvedValue(Response.json({ allowed: true, projectIds: ['project-A'] })) })
afterEach(() => { vi.unstubAllGlobals() })
const res = { status } as unknown as ExpressResponse

describe('gateway authorization', () => {
  it('descarta escopo forjado e repassa somente o autorizado', async () => {
    const request = req()
    await authorizationMiddleware()(request, res, next)
    expect(request.headers['x-authorized-projects']).toBe('project-A')
    expect(next).toHaveBeenCalledOnce()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ userId: 'user-A', tenantId: 'tenant-A', method: 'GET' })
  })
  it('lista vazia é escopo vazio explícito, nunca ausência de filtro', async () => {
    fetchMock.mockResolvedValue(Response.json({ allowed: true, projectIds: [] }))
    const request = req(); await authorizationMiddleware()(request, res, next)
    expect(request.headers['x-authorized-projects']).toBe('-')
  })
  it.each([403,500,503])('erro %s não encaminha a operação', async code => {
    fetchMock.mockResolvedValue(new Response(null, { status: code }))
    await authorizationMiddleware()(req(), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(code === 403 ? 403 : 503)
  })
  it('timeout/falha de rede falha fechado', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'))
    await authorizationMiddleware()(req(), res, next)
    expect(status).toHaveBeenCalledWith(503); expect(next).not.toHaveBeenCalled()
  })
  it('IDs malformados na resposta não viram headers confiáveis', async () => {
    fetchMock.mockResolvedValue(Response.json({ allowed: true, projectIds: ['bad\r\nheader'] }))
    await authorizationMiddleware()(req(), res, next)
    expect(status).toHaveBeenCalledWith(503); expect(next).not.toHaveBeenCalled()
  })
})
