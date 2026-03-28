import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintManager } from '@/components/sprint/SprintManager'

vi.mock('@/app/actions/sprints', () => ({
  createSprintAction: vi.fn().mockResolvedValue({
    sprint: { id: 's-new', name: 'Sprint X', status: 'PLANNED', startDate: null, endDate: null },
  }),
}))

beforeEach(() => vi.clearAllMocks())

const defaultProps = {
  boardId: 'b1',
  sprints: [
    { id: 's1', name: 'Sprint 1', status: 'ACTIVE' as const, startDate: null, endDate: null },
  ],
}

describe('SprintManager — date inputs', () => {
  it('renders start date input', () => {
    render(<SprintManager {...defaultProps} />)
    expect(screen.getByLabelText(/data de in[íi]cio/i)).toBeInTheDocument()
  })

  it('renders end date input', () => {
    render(<SprintManager {...defaultProps} />)
    expect(screen.getByLabelText(/data de fim/i)).toBeInTheDocument()
  })

  it('shows validation error when end date is before start date', async () => {
    const user = userEvent.setup()
    render(<SprintManager {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome/i), 'Sprint X')
    await user.type(screen.getByLabelText(/data de in[íi]cio/i), '2025-03-10')
    await user.type(screen.getByLabelText(/data de fim/i), '2025-03-05')
    await user.click(screen.getByRole('button', { name: /criar/i }))

    expect(screen.getByText(/data de fim deve ser/i)).toBeInTheDocument()
  })

  it('creates sprint with dates when valid', async () => {
    const { createSprintAction } = await import('@/app/actions/sprints')
    const user = userEvent.setup()
    render(<SprintManager {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome/i), 'Sprint X')
    await user.type(screen.getByLabelText(/data de in[íi]cio/i), '2025-03-01')
    await user.type(screen.getByLabelText(/data de fim/i), '2025-03-15')
    await user.click(screen.getByRole('button', { name: /criar/i }))

    expect(createSprintAction).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        name: 'Sprint X',
        startDate: '2025-03-01',
        endDate: '2025-03-15',
      })
    )
  })

  it('allows creating sprint without dates', async () => {
    const { createSprintAction } = await import('@/app/actions/sprints')
    const user = userEvent.setup()
    render(<SprintManager {...defaultProps} />)

    await user.type(screen.getByLabelText(/nome/i), 'Sprint Y')
    await user.click(screen.getByRole('button', { name: /criar/i }))

    expect(createSprintAction).toHaveBeenCalledOnce()
  })

  it('displays existing sprint names in the list', () => {
    render(<SprintManager {...defaultProps} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
  })

  it('shows link to sprint board for each sprint', () => {
    render(<SprintManager {...defaultProps} />)
    const link = screen.getByRole('link', { name: /abrir board/i })
    expect(link).toHaveAttribute('href', '/sprints/s1')
  })
})
