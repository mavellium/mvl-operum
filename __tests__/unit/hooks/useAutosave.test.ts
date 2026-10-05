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

it('serializa PATCH lento e confirma o texto mais recente antes de resolver flush', async () => {
  let release!: () => void
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve })).mockResolvedValue(undefined)
  const { rerender, result } = setup('', save)
  rerender({ value: 'primeiro' })
  let completed = false
  let flushing!: Promise<boolean>
  act(() => { flushing = result.current.flush(); void flushing.then(() => { completed = true }) })
  rerender({ value: 'segundo' })
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(save).toHaveBeenCalledTimes(1)
  expect(completed).toBe(false)
  await act(async () => { release(); expect(await flushing).toBe(true) })
  expect(save.mock.calls.map(([value]) => value)).toEqual(['primeiro', 'segundo'])
  expect(result.current.status).toBe('saved')
})
it('resposta antiga não marca o novo registro como salvo depois de reset', async () => {
  let release!: () => void
  const save = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
  const { rerender, result } = setup('', save)
  rerender({ value: 'registro A' })
  let flushing!: Promise<boolean>
  act(() => { flushing = result.current.flush() })
  act(() => { result.current.reset('registro B') })
  rerender({ value: 'registro B' })
  await act(async () => { release(); expect(await flushing).toBe(false) })
  expect(result.current.status).toBe('idle')
  expect(save).toHaveBeenCalledTimes(1)
})
it('falha mantém pendência e avisa o navegador antes de sair', async () => {
  const { rerender, result } = setup('', vi.fn().mockRejectedValue(new Error('503')))
  rerender({ value: 'rascunho' })
  await act(async () => { expect(await result.current.flush()).toBe(false) })
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  expect(result.current.status).toBe('error')
})
it('novo registro pode salvar enquanto resposta do anterior está pendente', async () => {
  let release!: () => void
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve })).mockResolvedValue(undefined)
  const { rerender, result } = setup('', save)
  rerender({ value: 'A editado' })
  let old!: Promise<boolean>
  act(() => { old = result.current.flush() })
  act(() => { result.current.reset('B') }); rerender({ value: 'B editado' })
  await act(async () => { expect(await result.current.flush()).toBe(true) })
  await act(async () => { release(); expect(await old).toBe(false) })
  expect(result.current.status).toBe('saved')
  expect(save.mock.calls.map(([value]) => value)).toEqual(['A editado', 'B editado'])
})
