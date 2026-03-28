import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RegisterForm } from '@/components/auth/RegisterForm'

vi.mock('@/app/actions/auth', () => ({
  signupAction: vi.fn().mockResolvedValue(undefined),
}))

describe('RegisterForm', () => {
  it('renders name, email and password fields', () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<RegisterForm />)
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
  })
})
