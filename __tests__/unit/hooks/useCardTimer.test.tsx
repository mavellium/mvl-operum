import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCardTimer } from '@/hooks/useCardTimer'
import { getActiveTimerAction, getCardTimeAction, pauseTimerAction, startTimerAction } from '@/app/actions/time'
vi.mock('@/app/actions/time', () => ({ getActiveTimerAction: vi.fn(), getCardTimeAction: vi.fn(), pauseTimerAction: vi.fn(), startTimerAction: vi.fn() }))
const active = { id: 'entry', startedAt: '2026-10-04T00:00:00Z', isRunning: true }
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.mocked(getCardTimeAction).mockResolvedValue({ seconds: 90 }); vi.mocked(getActiveTimerAction).mockResolvedValue({ entry: active } as never) })
afterEach(() => vi.useRealTimers())
async function ready() { await act(async () => { await Promise.resolve() }) }
describe('timer confirmado e compartilhado', () => {
  it('pausa rejeitada mantém entry e reconcilia as duas superfícies', async () => {
    vi.mocked(pauseTimerAction).mockResolvedValue({ error: '403' })
    const { result } = renderHook(() => ({ mini: useCardTimer('failure'), modal: useCardTimer('failure') }))
    await ready()
    await act(async () => { expect(await result.current.mini.toggle()).toBe(false) })
    expect(result.current.mini.entry?.id).toBe('entry')
    expect(result.current.modal.entry?.id).toBe('entry')
    expect(result.current.modal.error).toBe('403')
    expect(getActiveTimerAction).toHaveBeenCalledTimes(2)
  })
  it('erro de carregamento é desconhecido e não zero confirmado', async () => {
    vi.mocked(getCardTimeAction).mockResolvedValue({ error: '500' })
    const { result } = renderHook(() => useCardTimer('unknown'))
    await ready()
    expect(result.current.known).toBe(false)
    expect(result.current.error).toBe('500')
    await act(async () => { expect(await result.current.toggle()).toBe(false) })
    expect(startTimerAction).not.toHaveBeenCalled()
  })
  it('cliques rápidos compartilham uma única parada pendente', async () => {
    let release!: (value: unknown) => void
    vi.mocked(pauseTimerAction).mockImplementation(() => new Promise(resolve => { release = resolve }) as never)
    const { result } = renderHook(() => useCardTimer('quick'))
    await ready()
    let first!: Promise<boolean>, second!: Promise<boolean>
    act(() => { first = result.current.toggle(); second = result.current.toggle() })
    expect(result.current.entry?.id).toBe('entry')
    expect(pauseTimerAction).toHaveBeenCalledTimes(1)
    await act(async () => { release({ entry: { id: 'entry', duration: 30 } }); expect(await first).toBe(true); expect(await second).toBe(true) })
    expect(result.current.entry).toBeNull()
  })
  it('timeout da pausa e da reconciliação deixa estado desconhecido explícito', async () => {
    const { result } = renderHook(() => useCardTimer('timeout'))
    await ready()
    vi.mocked(pauseTimerAction).mockImplementation(() => new Promise(() => {}))
    vi.mocked(getActiveTimerAction).mockImplementation(() => new Promise(() => {}))
    let operation!: Promise<boolean>
    act(() => { operation = result.current.toggle() })
    await act(async () => { await vi.advanceTimersByTimeAsync(30001); expect(await operation).toBe(false) })
    expect(result.current.known).toBe(false)
    expect(result.current.entry?.id).toBe('entry')
    expect(result.current.loading).toBe(false)
  })
})
