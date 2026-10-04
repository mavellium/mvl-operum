import { describe, it, expect, vi } from 'vitest'
import { paginate } from '../pagination'
import { withIdempotency, clearIdempotencyStore } from '../idempotency'
import { throttledGateway } from '../migration/throttle'
import { mapLimit } from '../concurrency'
import { toIso } from '../dates'
import type { Gateway } from '../gateway'
import { serializeTask } from '../serializers'

describe('tempos resumidos do quadro', () => {
  it('preserva total agregado e timer ativo sem precisar do histórico encerrado', () => {
    const entry = { id: 'active', userId: 'u1', isRunning: true, startedAt: '2026-10-04T12:00:00Z', duration: 0 }
    const task = serializeTask({ id: 'c1', totalDurationSeconds: 50000, timeEntries: [entry] })
    expect(task?.time).toEqual({ total_seconds: 50000, running: [{ entry_id: 'active', user_id: 'u1', started_at: entry.startedAt }] })
    expect(serializeTask({ id: 'c1', timeEntries: [{ duration: 10, isRunning: false }, entry] })?.time?.total_seconds).toBe(10)
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 5 }, (_, i) => i)

  it('corta e devolve cursor até o fim', () => {
    const p1 = paginate(items, undefined, 2)
    expect(p1).toMatchObject({ items: [0, 1], total: 5 })
    const p2 = paginate(items, p1.next_cursor!, 2)
    const p3 = paginate(items, p2.next_cursor!, 2)
    expect(p2.items).toEqual([2, 3])
    expect(p3).toMatchObject({ items: [4], next_cursor: null })
  })

  it('cursor inválido vira erro acionável', () => {
    expect(() => paginate(items, 'lixo!!')).toThrow(/cursor inválido/)
  })
})

describe('withIdempotency', () => {
  it('executa uma vez por chave, inclusive com chamadas concorrentes', async () => {
    clearIdempotencyStore()
    const fn = vi.fn().mockImplementation(async () => ({ id: 'x' }))
    const [a, b] = await Promise.all([withIdempotency('s', 'k', fn), withIdempotency('s', 'k', fn)])
    expect(fn).toHaveBeenCalledTimes(1)
    expect([a.replayed, b.replayed].sort()).toEqual([false, true])
  })

  it('não memoriza falhas e isola escopos (tokens diferentes)', async () => {
    clearIdempotencyStore()
    const failing = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok')
    await expect(withIdempotency('s', 'k', failing)).rejects.toThrow('boom')
    expect((await withIdempotency('s', 'k', failing)).result).toBe('ok')
    const other = vi.fn().mockResolvedValue('outro')
    expect((await withIdempotency('outro-token', 'k', other)).result).toBe('outro')
  })

  it('sem chave sempre executa', async () => {
    const fn = vi.fn().mockResolvedValue(1)
    await withIdempotency('s', undefined, fn)
    await withIdempotency('s', undefined, fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('throttledGateway', () => {
  const err = (status?: number) => Object.assign(new Error('x'), { status })
  const fakeGw = (impl: Partial<Gateway>): Gateway => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), ...impl })

  it('repete qualquer método em 429', async () => {
    const post = vi.fn().mockRejectedValueOnce(err(429)).mockResolvedValue('ok')
    const gw = throttledGateway(fakeGw({ post }), { rps: 1e6, sleep: async () => {} })
    await expect(gw.post('/cards', {})).resolves.toBe('ok')
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('não repete POST em 5xx/timeout (pode ter criado o recurso)', async () => {
    const post = vi.fn().mockRejectedValue(err(503))
    const gw = throttledGateway(fakeGw({ post }), { rps: 1e6, sleep: async () => {} })
    await expect(gw.post('/cards', {})).rejects.toMatchObject({ status: 503 })
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('repete GET em 503 e erro de rede, com backoff, até o limite', async () => {
    const sleeps: number[] = []
    const get = vi.fn().mockRejectedValue(err(undefined))
    const gw = throttledGateway(fakeGw({ get }), { rps: 1e6, maxRetries: 2, baseDelayMs: 100, sleep: async ms => void sleeps.push(ms) })
    await expect(gw.get('/x')).rejects.toBeTruthy()
    expect(get).toHaveBeenCalledTimes(3)
    expect(sleeps.filter(ms => ms >= 100)).toEqual([100, 200])
  })

  it('não repete 4xx de negócio', async () => {
    const patch = vi.fn().mockRejectedValue(err(400))
    const gw = throttledGateway(fakeGw({ patch }), { rps: 1e6, sleep: async () => {} })
    await expect(gw.patch('/x', {})).rejects.toMatchObject({ status: 400 })
    expect(patch).toHaveBeenCalledTimes(1)
  })

  it('espaça as chamadas conforme o rps', async () => {
    const sleeps: number[] = []
    const gw = throttledGateway(fakeGw({ get: vi.fn().mockResolvedValue(1) }), { rps: 10, sleep: async ms => void sleeps.push(ms) })
    await Promise.all([gw.get('/a'), gw.get('/b'), gw.get('/c')])
    expect(sleeps).toHaveLength(2)
    expect(sleeps[1]).toBeGreaterThan(sleeps[0])
  })
})

describe('mapLimit', () => {
  it('respeita o limite de concorrência e preserva a ordem', async () => {
    let active = 0
    let peak = 0
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async n => {
      active++
      peak = Math.max(peak, active)
      await new Promise(r => setTimeout(r, 1))
      active--
      return n * 10
    })
    expect(out).toEqual([10, 20, 30, 40, 50, 60])
    expect(peak).toBe(2)
  })
})

describe('toIso', () => {
  it('normaliza datas para ISO UTC (formato exigido pelos serviços)', () => {
    expect(toIso('2026-10-01', 'd')).toBe('2026-10-01T00:00:00.000Z')
    expect(toIso('2026-10-01T09:00:00-03:00', 'd')).toBe('2026-10-01T12:00:00.000Z')
    expect(toIso(undefined, 'd')).toBeUndefined()
    expect(() => toIso('ontem', 'prazo')).toThrow(/prazo: data inválida/)
  })
})
