import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserSelector from '@/components/user/UserSelector'

const users = [
  { id: 'u1', name: 'Ana Silva', email: 'ana@x.com' },
  { id: 'u2', name: 'Carlos Souza', email: 'carlos@x.com' },
]

describe('UserSelector', () => {
  it('renders a select with an empty option and one option per user', () => {
    render(<UserSelector users={users} value={null} onChange={vi.fn()} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    const options = screen.getAllByRole('option')
    // empty option + 2 users
    expect(options).toHaveLength(3)
  })

  it('calls onChange with userId when selection changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<UserSelector users={users} value={null} onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox'), 'u1')
    expect(onChange).toHaveBeenCalledWith('u1')
  })

  it('shows selected user when value prop provided', () => {
    render(<UserSelector users={users} value="u2" onChange={vi.fn()} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('u2')
  })

  it('calls onChange with null when empty option selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<UserSelector users={users} value="u1" onChange={onChange} />)
    await user.selectOptions(screen.getByRole('combobox'), '')
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
