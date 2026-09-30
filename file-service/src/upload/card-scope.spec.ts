// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { CardScope } from './card-scope'

const originalFetch = global.fetch
let fetchMock: ReturnType<typeof vi.fn>

function responde(ids: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ids }), { status, headers: { 'Content-Type': 'application/json' } }))
}

beforeEach(() => {
  process.env.INTERNAL_API_KEY = 'chave-interna'
  process.env.SPRINT_SERVICE_URL = 'http://sprint-service:4003'
  fetchMock = vi.fn()
  global.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('CardScope', () => {
  it('pergunta ao sprint-service com a chave interna e o tenant', async () => {
    responde(['c1'])
    const allowed = await new CardScope().inTenant('t1', ['c1', 'c-outro'])
    expect([...allowed]).toEqual(['c1'])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://sprint-service:4003/cards/in-tenant')
    expect(init.headers).toMatchObject({ 'X-Internal-Api-Key': 'chave-interna', 'X-Tenant-Id': 't1' })
    expect(JSON.parse(init.body)).toEqual({ ids: ['c1', 'c-outro'] })
  })

  it('guarda em cache só o que é do tenant: o mesmo card não gera nova chamada', async () => {
    const scope = new CardScope()
    responde(['c1'])
    await scope.inTenant('t1', ['c1'])
    await scope.assert('t1', 'c1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('o cache é por tenant', async () => {
    const scope = new CardScope()
    responde(['c1'])
    await scope.inTenant('t1', ['c1'])
    responde([])
    await expect(scope.assert('t2', 'c1')).rejects.toThrow(NotFoundException)
  })

  it('ignora id que não foi pedido, mesmo se o sprint-service devolver', async () => {
    responde(['c1', 'c-intruso'])
    const allowed = await new CardScope().inTenant('t1', ['c1'])
    expect([...allowed]).toEqual(['c1'])
  })

  it('card de outro tenant: 404', async () => {
    responde([])
    await expect(new CardScope().assert('t1', 'c-outro')).rejects.toThrow(NotFoundException)
  })

  it.each([
    ['sprint-service fora do ar', () => fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'))],
    ['sprint-service com erro', () => responde(null, 500)],
  ])('falha fechada (503) com %s', async (_caso, prepara) => {
    prepara()
    await expect(new CardScope().assert('t1', 'c1')).rejects.toThrow(ServiceUnavailableException)
  })

  it('sem a chave interna, não confere nada: 503', async () => {
    delete process.env.INTERNAL_API_KEY
    await expect(new CardScope().assert('t1', 'c1')).rejects.toThrow(ServiceUnavailableException)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('divide em lotes de 500 ids', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `c${i}`)
    responde(ids.slice(0, 500))
    responde([ids[500]])
    const allowed = await new CardScope().inTenant('t1', ids)
    expect(allowed.size).toBe(501)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
