import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: { get: vi.fn(), set: vi.fn() },
}))

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(function RedisMock() {
    return mockRedis
  }),
}))

import { authMiddleware } from '../middleware/auth'

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/cards',
    method: 'GET',
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as Request
}

function makeRes() {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.end = vi.fn().mockReturnValue(res)
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
}

function introspectResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    active: true,
    userId: 'user-1',
    tenantId: 'tenant-a',
    role: 'member',
    scopes: ['read'],
    tokenId: 'token-1',
    ...overrides,
  }
}

describe('authMiddleware — Personal Access Tokens', () => {
  const middleware = authMiddleware()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    process.env.INTERNAL_API_KEY = 'internal-key'
    process.env.AUTH_SERVICE_URL = 'http://auth-service:4001'
    mockRedis.get.mockReset()
    mockRedis.set.mockReset()
  })

  it('bloqueia /auth/api-tokens/introspect com 404, independente de autenticação', async () => {
    const req = makeReq({ path: '/auth/api-tokens/introspect', headers: {} })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(next).not.toHaveBeenCalled()
  })

  it('token PAT válido com escopo read em requisição GET chama next() e injeta headers confiáveis', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => introspectResponse() })
    vi.stubGlobal('fetch', fetchMock)

    const req = makeReq({ headers: { authorization: 'Bearer opr_pat_abc' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.headers['x-user-id']).toBe('user-1')
    expect(req.headers['x-tenant-id']).toBe('tenant-a')
    expect(req.headers['x-user-role']).toBe('member')
    expect(req.headers['x-auth-type']).toBe('pat')
    expect(req.headers['x-api-token-id']).toBe('token-1')
    expect(mockRedis.set).toHaveBeenCalledWith(expect.stringMatching(/^pat:/), expect.any(String), 'EX', 60)
  })

  it('token PAT com escopo somente read em requisição de escrita retorna 403', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => introspectResponse({ scopes: ['read'] }) }))

    const req = makeReq({ method: 'POST', headers: { authorization: 'Bearer opr_pat_abc' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('token PAT com escopo write em requisição de escrita chama next()', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => introspectResponse({ scopes: ['read', 'write'] }) }),
    )

    const req = makeReq({ method: 'POST', headers: { authorization: 'Bearer opr_pat_abc' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('token PAT revogado/expirado (active=false) retorna 401', async () => {
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue('OK')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => introspectResponse({ active: false }) }))

    const req = makeReq({ headers: { authorization: 'Bearer opr_pat_revoked' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('usa o cache do Redis quando presente, sem chamar o auth-service', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify(introspectResponse()))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const req = makeReq({ headers: { authorization: 'Bearer opr_pat_cached' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('Redis fora do ar mas auth-service disponível: segue sem cache (fail open apenas no cache)', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'))
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => introspectResponse() }))

    const req = makeReq({ headers: { authorization: 'Bearer opr_pat_noredis' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.headers['x-user-id']).toBe('user-1')
  })

  it('Redis fora e auth-service fora: falha fechada com 503 (D6)', async () => {
    mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'))
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')))

    const req = makeReq({ headers: { authorization: 'Bearer opr_pat_downstream_down' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })

  it('auth-service responde com erro (não-ok) e sem cache: falha fechada com 503', async () => {
    mockRedis.get.mockResolvedValue(null)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))

    const req = makeReq({ headers: { authorization: 'Bearer opr_pat_auth_error' } })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('remove headers de identidade forjados pelo cliente antes de qualquer autenticação', async () => {
    mockRedis.get.mockResolvedValue(null)
    const req = makeReq({
      path: '/auth/login',
      headers: {
        'x-auth-type': 'pat',
        'x-api-token-id': 'forged-id',
        'x-user-id': 'forged-user',
        'x-tenant-id': 'forged-tenant',
        'x-user-role': 'admin',
      },
    })
    const res = makeRes()
    const next = vi.fn()

    await middleware(req, res, next)

    expect(req.headers['x-auth-type']).toBeUndefined()
    expect(req.headers['x-api-token-id']).toBeUndefined()
    expect(req.headers['x-user-id']).toBeUndefined()
    expect(req.headers['x-tenant-id']).toBeUndefined()
    expect(req.headers['x-user-role']).toBeUndefined()
    expect(next).toHaveBeenCalledTimes(1)
  })
})
