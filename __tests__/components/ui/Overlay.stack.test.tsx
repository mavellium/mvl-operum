import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import Drawer from '@/components/ui/Drawer'
import Modal from '@/components/ui/Modal'
import { useOverlay } from '@/hooks/useOverlay'
function History() {
  const [history, setHistory] = useState(false), [confirm, setConfirm] = useState(false)
  return <><button onClick={() => setHistory(true)}>Histórico</button><button>Fundo</button>
    <Drawer isOpen={history} onClose={() => setHistory(false)} title="Histórico do Termo"><button onClick={() => setConfirm(true)}>Aprovar versão</button></Drawer>
    <Modal isOpen={confirm} onClose={() => setConfirm(false)} title="Confirmar aprovação"><button onClick={() => setConfirm(false)}>Voltar ao histórico</button></Modal></>
}
describe('pilha de overlays', () => {
  it('contém Tab, identifica títulos, fecha somente o superior e restaura acionadores', async () => {
    const user = userEvent.setup()
    render(<History />)
    const trigger = screen.getByRole('button', { name: 'Histórico' })
    await user.click(trigger)
    const drawer = screen.getByRole('dialog', { name: 'Histórico do Termo' })
    expect(trigger.closest('[inert]')).not.toBeNull()
    const approval = screen.getByRole('button', { name: 'Aprovar versão' })
    approval.focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(approval).toHaveFocus()
    await user.click(approval)
    const modal = screen.getByRole('dialog', { name: 'Confirmar aprovação' })
    expect(modal.getAttribute('aria-labelledby')).not.toBe(drawer.getAttribute('aria-labelledby'))
    expect(drawer).toHaveAttribute('inert')
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Confirmar aprovação' })).not.toBeInTheDocument()
    expect(approval).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(approval, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger.closest('[inert]')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
  it('sem controles focáveis mantém foco na região e restaura inert anterior', () => {
    function Empty() {
      const ref = useRef<HTMLDivElement>(null)
      useOverlay(ref, vi.fn(), true)
      return <div ref={ref} role="dialog" aria-label="Vazio" tabIndex={-1}>Conteúdo</div>
    }
    const background = document.createElement('div'); background.setAttribute('inert', ''); document.body.append(background)
    const { unmount } = render(<Empty />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(dialog).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(dialog).toHaveFocus()
    unmount(); expect(background).toHaveAttribute('inert'); background.remove()
  })
})
