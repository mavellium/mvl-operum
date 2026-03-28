import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm'

vi.mock('@/app/actions/profile', () => ({
  changePasswordAction: vi.fn(),
  updateProfileAction: vi.fn(),
  uploadAvatarAction: vi.fn(),
}))

describe('ChangePasswordForm', () => {
  it('renders all password fields', () => {
    render(<ChangePasswordForm />)
    expect(screen.getByLabelText('Senha atual')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<ChangePasswordForm />)
    expect(screen.getByRole('button', { name: /alterar senha/i })).toBeInTheDocument()
  })

  it('password fields are of type password', () => {
    render(<ChangePasswordForm />)
    const inputs = screen.getAllByDisplayValue('')
    inputs.forEach(input => {
      if ((input as HTMLInputElement).name !== '') {
        expect((input as HTMLInputElement).type).toBe('password')
      }
    })
  })
})
