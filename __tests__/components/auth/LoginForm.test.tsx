import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginForm } from '@/components/auth/LoginForm'

vi.mock('@/app/actions/auth', () => ({
  loginAction: vi.fn().mockResolvedValue(undefined),
}))

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('renders submit button labeled Entrar', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

})
