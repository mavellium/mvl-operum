// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'tok' }) }),
  headers: async () => ({ get: () => null }),
}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { cardsApi } from '@/lib/api-client'

afterEach(() => vi.unstubAllGlobals())

describe('api-client: resposta 200 sem corpo', () => {
  it('card sem timer ativo devolve null em vez de "Unexpected end of JSON input"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })))
    await expect(cardsApi.getActiveTimer('c1')).resolves.toBeNull()
  })

  it('corpo JSON continua sendo lido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'e1', isRunning: true }), { status: 200 })))
    await expect(cardsApi.getActiveTimer('c1')).resolves.toEqual({ id: 'e1', isRunning: true })
  })
})
