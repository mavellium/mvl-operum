import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

describe('ConfirmDialog focus', () => {
  afterEach(() => vi.useRealTimers())

  it('foca Cancelar ao abrir e o focus trap circula dentro do modal', async () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <ConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} title="T" message="M" />
    )
    await vi.runAllTimersAsync()

    const cancel = screen.getByRole('button', { name: 'Cancelar' })
    const confirm = screen.getByRole('button', { name: 'Excluir' })
    const close = screen.getByRole('button', { name: 'Fechar modal' })

    // Foco inicial no Cancelar (não no X do cabeçalho)
    expect(document.activeElement).toBe(cancel)

    // No browser, Tab de Cancelar → Confirmar (ordem do DOM). No jsdom,
    // validamos o wrap do trap: Tab a partir do último volta ao primeiro.
    confirm.focus()
    fireEvent.keyDown(confirm, { key: 'Tab' })
    expect(document.activeElement).toBe(close)

    // Shift+Tab a partir do primeiro volta ao último
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirm)

    // Tab com foco fora do modal puxa o foco para dentro
    ;(document.activeElement as HTMLElement).blur()
    fireEvent.keyDown(document.body, { key: 'Tab' })
    expect(document.activeElement).toBe(close)

    unmount()
  })
})
