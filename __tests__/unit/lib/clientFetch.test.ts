import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWithSession } from '@/lib/clientFetch'
import { logoutAction } from '@/app/actions/auth'

vi.mock('@/app/actions/auth', () => ({
  logoutAction: vi.fn(async () => {
    await new Promise(r => setTimeout(r, 5))
  }),
}))

describe('fetchWithSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('repassa a resposta 401 sem encerrar a sessão (navegação comum)', async () => {
    const res = new Response('{"error":"Não autorizado"}', { status: 401 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))

    const out = await fetchWithSession('/api/me')

    expect(out.status).toBe(401)
    expect(logoutAction).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('repassa respostas de sucesso', async () => {
    const res = new Response('{"user":{}}', { status: 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))

    const out = await fetchWithSession('/api/me')

    expect(out.status).toBe(200)
    expect(logoutAction).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('repassa erros que não são de sessão', async () => {
    const res = new Response('{"error":"Internal"}', { status: 500 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))

    await fetchWithSession('/api/me')

    expect(logoutAction).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('nunca chama logoutAction em chamadas concorrentes com 401', async () => {
    const res = new Response('{}', { status: 401 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res))

    await Promise.all([fetchWithSession('/api/me'), fetchWithSession('/api/me')])

    expect(logoutAction).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
