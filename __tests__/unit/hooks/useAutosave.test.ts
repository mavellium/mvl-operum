import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from '@/hooks/useAutosave'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

function setup(initial: string, save = vi.fn().mockResolvedValue(undefined), enabled = true) {
  const hook = renderHook(({ value }) => useAutosave(value, save, { delay: 800, enabled }), {
    initialProps: { value: initial },
  })
  return { ...hook, save }
}

describe('useAutosave', () => {
  it('não salva o valor inicial', async () => {
    const { save } = setup('a')
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(save).not.toHaveBeenCalled()
  })

  it('salva uma vez só depois que o usuário para de digitar (debounce)', async () => {
    const { rerender, result, save } = setup('')
    rerender({ value: 'o' })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    rerender({ value: 'ol' })
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    rerender({ value: 'olá' })
    expect(result.current.status).toBe('pending')
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('olá')
    expect(result.current.status).toBe('saved')
  })

  it('flush salva na hora, sem esperar o debounce', async () => {
    const { rerender, result, save } = setup('')
    rerender({ value: 'texto' })
    await act(async () => { await result.current.flush() })
    expect(save).toHaveBeenCalledWith('texto')
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('salva o pendente ao desmontar (fechar o modal)', async () => {
    const { rerender, unmount, save } = setup('')
    rerender({ value: 'não perder' })
    unmount()
    await act(async () => { await Promise.resolve() })
    expect(save).toHaveBeenCalledWith('não perder')
  })

  it('reset marca o novo valor como já salvo', async () => {
    const { rerender, result, save } = setup('card A')
    act(() => { result.current.reset('card B') })
    rerender({ value: 'card B' })
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(save).not.toHaveBeenCalled()
  })

  it('erro no save fica visível e o próximo flush tenta de novo', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValue(undefined)
    const { rerender, result } = setup('', save)
    rerender({ value: 'x' })
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    expect(result.current.status).toBe('error')
    await act(async () => { await result.current.flush() })
    expect(save).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('saved')
  })

  it('desligado não salva', async () => {
    const { rerender, save } = setup('', undefined, false)
    rerender({ value: 'x' })
    await act(async () => { await vi.advanceTimersByTimeAsync(2000) })
    expect(save).not.toHaveBeenCalled()
  })
})
