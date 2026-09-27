import { describe, it, expect, vi, beforeEach } from 'vitest'
import { gateway } from '../gateway'

describe('gateway', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    process.env.API_GATEWAY_INTERNAL_URL = 'http://api-gateway:4000'
  })

  it('injeta Authorization: Bearer <token> em toda requisição', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)

    await gateway('opr_pat_abc').get('/auth/me')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer opr_pat_abc')
  })

  it('get() serializa query params ignorando undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)

    await gateway('opr_pat_abc').get('/projects', { status: 'ACTIVE', page: undefined })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api-gateway:4000/projects?status=ACTIVE')
  })

  it('lança erro com status quando a resposta não é ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ message: 'não encontrado' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(gateway('opr_pat_abc').get('/projects/x')).rejects.toMatchObject({
      message: 'não encontrado',
      status: 404,
    })
  })

  it('só marca publicMessage quando a mensagem vem de corpo JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, text: async () => JSON.stringify({ message: 'Projeto com esse nome já existe' }) }))
    await expect(gateway('opr_pat_abc').post('/projects', {})).rejects.toMatchObject({ status: 409, publicMessage: 'Projeto com esse nome já existe' })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => '<html>Bad Gateway nginx</html>' }))
    const err = await gateway('opr_pat_abc').get('/projects').catch(e => e)
    expect(err.status).toBe(502)
    expect(err.publicMessage).toBeUndefined()
  })

  it('limita o tamanho da publicMessage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'x'.repeat(5000) }) }))
    const err = await gateway('opr_pat_abc').get('/projects').catch(e => e)
    expect(err.publicMessage).toHaveLength(300)
  })

  it('retorna undefined para 204 No Content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await gateway('opr_pat_abc').delete('/auth/api-tokens/x')
    expect(result).toBeUndefined()
  })

  it('post() envia body serializado em JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: '1' }) })
    vi.stubGlobal('fetch', fetchMock)

    await gateway('opr_pat_abc').post('/cards', { title: 'x' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ title: 'x' }))
  })
})
