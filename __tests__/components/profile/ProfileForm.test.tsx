import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfileForm from '@/components/profile/ProfileForm'

vi.mock('@/app/actions/profile', () => ({
  updateProfileAction: vi.fn(),
  changePasswordAction: vi.fn(),
  uploadAvatarAction: vi.fn(),
}))

const defaultProps = {
  name: 'Ana Silva',
  email: 'ana@x.com',
  cargo: 'Dev',
  departamento: 'TI',
  valorHora: 75,
}

describe('ProfileForm', () => {
  it('renders all profile fields with default values', () => {
    render(<ProfileForm {...defaultProps} />)
    expect(screen.getByLabelText(/nome/i)).toHaveValue('Ana Silva')
    expect(screen.getByLabelText(/email/i)).toHaveValue('ana@x.com')
    expect(screen.getByLabelText(/cargo/i)).toHaveValue('Dev')
    expect(screen.getByLabelText(/departamento/i)).toHaveValue('TI')
    expect(screen.getByLabelText(/valor\/hora/i)).toHaveValue(75)
  })

  it('renders submit button', () => {
    render(<ProfileForm {...defaultProps} />)
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })

  it('handles null cargo and departamento', () => {
    render(<ProfileForm name="Ana" email="ana@x.com" valorHora={0} cargo={null} departamento={null} />)
    expect(screen.getByLabelText(/cargo/i)).toHaveValue('')
    expect(screen.getByLabelText(/departamento/i)).toHaveValue('')
  })
})
