import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Card from '@/components/card/Card'
import type { CardColor } from '@/types/kanban'

vi.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: { children: (p: object, s: object) => React.ReactNode }) =>
    <>{children({ innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} }, { isDragging: false })}</>,
}))

vi.mock('@/app/actions', () => ({
  updateCardAction: vi.fn(),
  deleteCardAction: vi.fn(),
  addColumnAction: vi.fn(),
}))

vi.mock('@/app/actions/tags', () => ({
  assignTagToCardAction: vi.fn(),
  removeTagFromCardAction: vi.fn(),
}))

vi.mock('@/app/actions/sprints', () => ({
  assignCardToSprintAction: vi.fn(),
}))

vi.mock('@/app/actions/cardResponsible', () => ({
  addResponsibleAction: vi.fn(),
  removeResponsibleAction: vi.fn(),
  getResponsiblesAction: vi.fn().mockResolvedValue({ responsibles: [] }),
}))

vi.mock('@/app/actions/time', () => ({
  startTimerAction: vi.fn(),
  pauseTimerAction: vi.fn(),
  getCardTimeAction: vi.fn().mockResolvedValue({ seconds: 0 }),
  getActiveTimerAction: vi.fn().mockResolvedValue({ entry: null }),
}))

const card = {
  id: 'c1',
  title: 'My Task',
  description: 'Some desc',
  responsible: '',
  color: '#6b7280' as CardColor,
  sprintId: null,
  createdAt: 0,
  updatedAt: 0,
}

const onUpdate = vi.fn()
const onDelete = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Card click behavior', () => {
  it('opens modal when clicking on card body', async () => {
    const user = userEvent.setup()
    render(<Card card={card} index={0} columnId="col-1" onUpdate={onUpdate} onDelete={onDelete} />)
    await user.click(screen.getByText('My Task'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render edit button', () => {
    render(<Card card={card} index={0} columnId="col-1" onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.queryByRole('button', { name: /editar card/i })).not.toBeInTheDocument()
  })

  it('delete button does not open edit modal', async () => {
    const user = userEvent.setup()
    render(<Card card={card} index={0} columnId="col-1" onUpdate={onUpdate} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: /excluir card/i }))
    // ConfirmDialog opens (not CardModal) — CardModal has a "Título" label
    expect(screen.queryByLabelText(/título/i)).not.toBeInTheDocument()
  })

  it('delete button opens confirm dialog', async () => {
    const user = userEvent.setup()
    render(<Card card={card} index={0} columnId="col-1" onUpdate={onUpdate} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: /excluir card/i }))
    expect(screen.getByText(/tem certeza/i)).toBeInTheDocument()
  })
})
