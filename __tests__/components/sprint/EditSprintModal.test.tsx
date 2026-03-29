import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditSprintModal from '@/components/sprint/EditSprintModal'

vi.mock('@/app/actions/sprintBoard', () => ({
  updateSprintMetaAction: vi.fn().mockResolvedValue({ sprint: {} }),
}))

import { updateSprintMetaAction } from '@/app/actions/sprintBoard'
const mockUpdate = updateSprintMetaAction as ReturnType<typeof vi.fn>

const baseSprint = {
  id: 's1',
  name: 'Sprint 1',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2025-01-15T00:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EditSprintModal', () => {
  it('renders inputs for name, startDate and endDate with current values', () => {
    render(<EditSprintModal sprint={baseSprint} onClose={vi.fn()} onUpdated={vi.fn()} />)
    expect(screen.getByDisplayValue('Sprint 1')).toBeInTheDocument()
    expect(screen.getByLabelText(/início|start/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fim|end/i)).toBeInTheDocument()
  })

  it('calls updateSprintMetaAction with updated name on submit', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    render(<EditSprintModal sprint={baseSprint} onClose={vi.fn()} onUpdated={onUpdated} />)
    const nameInput = screen.getByDisplayValue('Sprint 1')
    await user.clear(nameInput)
    await user.type(nameInput, 'Sprint Updated')
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    expect(mockUpdate).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ name: 'Sprint Updated' }),
    )
  })

  it('closes modal on cancel click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<EditSprintModal sprint={baseSprint} onClose={onClose} onUpdated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows validation error if name is empty', async () => {
    const user = userEvent.setup()
    render(<EditSprintModal sprint={baseSprint} onClose={vi.fn()} onUpdated={vi.fn()} />)
    const nameInput = screen.getByDisplayValue('Sprint 1')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    expect(screen.getByText(/nome.*obrigat/i)).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
