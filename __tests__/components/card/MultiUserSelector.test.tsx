import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultiUserSelector from '@/components/card/MultiUserSelector'

vi.mock('@/app/actions/cardResponsible', () => ({
  addResponsibleAction: vi.fn(),
  removeResponsibleAction: vi.fn(),
  getResponsiblesAction: vi.fn(),
}))

import { addResponsibleAction, removeResponsibleAction, getResponsiblesAction } from '@/app/actions/cardResponsible'

const mockGetResponsibles = getResponsiblesAction as ReturnType<typeof vi.fn>
const mockAdd = addResponsibleAction as ReturnType<typeof vi.fn>
const mockRemove = removeResponsibleAction as ReturnType<typeof vi.fn>

const users = [
  { id: 'u1', name: 'Ana', email: 'ana@x.com', cargo: 'Dev', avatarUrl: null },
  { id: 'u2', name: 'Bruno', email: 'b@x.com', cargo: 'QA', avatarUrl: null },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetResponsibles.mockResolvedValue({ responsibles: [] })
  mockAdd.mockResolvedValue({ entry: {} })
  mockRemove.mockResolvedValue({ success: true })
})

describe('MultiUserSelector', () => {
  it('renders user options in dropdown', async () => {
    render(<MultiUserSelector cardId="c1" users={users} />)
    await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument())
    expect(screen.getByRole('option', { name: /Ana/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Bruno/i })).toBeInTheDocument()
  })

  it('shows existing responsibles as chips', async () => {
    mockGetResponsibles.mockResolvedValue({
      responsibles: [{ userId: 'u1', user: { id: 'u1', name: 'Ana', cargo: 'Dev', avatarUrl: null } }],
    })
    render(<MultiUserSelector cardId="c1" users={users} />)
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
  })

  it('calls addResponsibleAction when user selected', async () => {
    const user = userEvent.setup()
    render(<MultiUserSelector cardId="c1" users={users} />)
    await waitFor(() => screen.getByRole('combobox', { name: /adicionar responsável/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /adicionar responsável/i }), 'u1')
    expect(mockAdd).toHaveBeenCalledWith('c1', 'u1')
  })

  it('calls removeResponsibleAction when chip × clicked', async () => {
    const user = userEvent.setup()
    mockGetResponsibles.mockResolvedValue({
      responsibles: [{ userId: 'u1', user: { id: 'u1', name: 'Ana', cargo: 'Dev', avatarUrl: null } }],
    })
    render(<MultiUserSelector cardId="c1" users={users} />)
    await waitFor(() => screen.getByRole('button', { name: /remover Ana/i }))
    await user.click(screen.getByRole('button', { name: /remover Ana/i }))
    expect(mockRemove).toHaveBeenCalledWith('c1', 'u1')
  })
})
