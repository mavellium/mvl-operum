import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordInput from '@/components/ui/PasswordInput'

describe('PasswordInput (SDD 4.6)', () => {
  it('começa oculto e o olho alterna entre mostrar e ocultar', async () => {
    const user = userEvent.setup()
    render(<label>Senha<PasswordInput defaultValue="segredo-1" /></label>)
    const campo = screen.getByLabelText('Senha')
    expect(campo).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(campo).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('o olho não envia o formulário', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(<form onSubmit={onSubmit}><PasswordInput name="senha" /></form>)
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('repassa as props do input (name, id, required) e desabilita o olho junto', () => {
    render(<PasswordInput id="novaSenha" name="novaSenha" required disabled className="campo" />)
    const campo = document.getElementById('novaSenha')!
    expect(campo).toHaveAttribute('name', 'novaSenha')
    expect(campo).toBeRequired()
    expect(campo).toBeDisabled()
    expect(campo.className).toContain('campo')
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeDisabled()
  })
})
