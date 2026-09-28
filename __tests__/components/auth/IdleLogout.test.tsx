import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({ usePathname: () => '/projetos/p1/sprints/s1' }))
vi.mock('@/app/actions/auth', () => ({
  expireSessionAction: vi.fn(),
  touchSessionAction: vi.fn().mockResolvedValue({ ok: true }),
}))

import IdleLogout from '@/components/auth/IdleLogout'
import { expireSessionAction, touchSessionAction } from '@/app/actions/auth'

const MIN = 60_000

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  window.localStorage.clear()
})
afterEach(() => vi.useRealTimers())

async function passar(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

describe('IdleLogout', () => {
  it('avisa 1 minuto antes e expira aos 30 min sem uso, voltando para a mesma página', async () => {
    render(<IdleLogout />)
    await passar(29 * MIN + 15_000)
    expect(screen.getByRole('alertdialog')).toHaveTextContent('vai expirar em 1 minuto')
    expect(expireSessionAction).not.toHaveBeenCalled()

    await passar(MIN)
    expect(expireSessionAction).toHaveBeenCalledWith('/projetos/p1/sprints/s1')
    expect(expireSessionAction).toHaveBeenCalledTimes(1)
  })

  it('atividade reinicia a contagem', async () => {
    render(<IdleLogout />)
    await passar(20 * MIN)
    fireEvent.keyDown(window)
    await passar(20 * MIN)
    expect(expireSessionAction).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('"Continuar conectado" fecha o aviso e renova no servidor', async () => {
    render(<IdleLogout />)
    await passar(29 * MIN + 15_000)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar conectado' }))
    expect(touchSessionAction).toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await passar(10 * MIN)
    expect(expireSessionAction).not.toHaveBeenCalled()
  })

  it('com atividade na tela, avisa o servidor periodicamente (renova o last_seen)', async () => {
    render(<IdleLogout />)
    await passar(4 * MIN)
    fireEvent.pointerDown(window)
    await passar(2 * MIN)
    expect(touchSessionAction).toHaveBeenCalledTimes(1)
  })

  it('atividade em outra aba (localStorage) mantém esta aba conectada', async () => {
    render(<IdleLogout />)
    await passar(25 * MIN)
    window.localStorage.setItem('operum:lastActivity', String(Date.now()))
    await passar(10 * MIN)
    expect(expireSessionAction).not.toHaveBeenCalled()
  })
})
