import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from '@/hooks/useAutosave'

vi.mock('@/app/actions/drafts', () => ({
  saveDraftAction: vi.fn(),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

import { saveDraftAction } from '@/app/actions/drafts'

const baseForm = {
  name: '', slogan: '', startDate: '', endDate: '', location: '',
  logoUrl: '', initialMemberId: '',
  justificativa: '', objetivos: '', metodologia: '', descricaoProduto: '',
  premissas: '', restricoes: '', limitesAutoridade: '',
  semestre: '', ano: '',
  departamentos: [] as string[],
}
const baseMacroFases = [{ fase: '', dataLimite: '', custo: '' }]

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutosave', () => {
  it('não deve chamar saveDraftAction sincronamente antes do timer disparar', () => {
    vi.mocked(saveDraftAction).mockResolvedValue({ draftId: 'd1' })

    renderHook(() =>
      useAutosave({ form: baseForm, macroFases: baseMacroFases, projectId: null, enabled: true })
    )

    // Sem avançar timers: o setTimeout(fn, 0) ainda não disparou
    expect(saveDraftAction).not.toHaveBeenCalled()
  })

  it('deve chamar saveDraftAction após o timer disparar e definir status como saved', async () => {
    vi.mocked(saveDraftAction).mockResolvedValue({ draftId: 'd1' })

    const { result } = renderHook(() =>
      useAutosave({ form: baseForm, macroFases: baseMacroFases, projectId: null, enabled: true })
    )

    await act(async () => { vi.advanceTimersByTime(1) })

    expect(saveDraftAction).toHaveBeenCalledOnce()
    expect(result.current.status).toBe('saved')
    expect(result.current.draftDbId).toBe('d1')
  })

  it('deve definir status como error quando saveDraftAction retorna erro', async () => {
    vi.mocked(saveDraftAction).mockResolvedValue({ error: 'Falha no banco' })

    const { result } = renderHook(() =>
      useAutosave({ form: baseForm, macroFases: baseMacroFases, projectId: null, enabled: true })
    )

    await act(async () => { vi.advanceTimersByTime(1) })

    expect(result.current.status).toBe('error')
  })

  it('deve fazer debounce: chamar saveDraftAction apenas uma vez para mudanças rápidas', async () => {
    vi.mocked(saveDraftAction).mockResolvedValue({ draftId: 'd1' })

    const { rerender } = renderHook(
      ({ name }: { name: string }) =>
        useAutosave({
          form: { ...baseForm, name },
          macroFases: baseMacroFases,
          projectId: null,
          enabled: true,
        }),
      { initialProps: { name: 'a' } }
    )

    // Rerenders rápidos sem avançar timers: cada um cancela o timer anterior
    rerender({ name: 'ab' })
    rerender({ name: 'abc' })

    // Só agora o timer dispara — deve chamar apenas uma vez
    await act(async () => { vi.advanceTimersByTime(1) })

    expect(saveDraftAction).toHaveBeenCalledOnce()
  })

  it('não deve chamar saveDraftAction quando enabled é false', async () => {
    vi.mocked(saveDraftAction).mockResolvedValue({ draftId: 'd1' })

    renderHook(() =>
      useAutosave({ form: baseForm, macroFases: baseMacroFases, projectId: null, enabled: false })
    )

    await act(async () => { vi.advanceTimersByTime(100) })

    expect(saveDraftAction).not.toHaveBeenCalled()
  })

  it('deve passar o projectId correto para saveDraftAction', async () => {
    vi.mocked(saveDraftAction).mockResolvedValue({ draftId: 'd2' })

    renderHook(() =>
      useAutosave({ form: baseForm, macroFases: baseMacroFases, projectId: 'p1', enabled: true })
    )

    await act(async () => { vi.advanceTimersByTime(1) })

    expect(saveDraftAction).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1' })
    )
  })
})
