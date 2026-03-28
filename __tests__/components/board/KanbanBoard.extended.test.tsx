import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KanbanBoard from '@/components/board/KanbanBoard'
import type { BoardState } from '@/types/kanban'

// Mock DnD context — render children directly
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Droppable: ({ children }: { children: (p: object, s: object) => React.ReactNode }) =>
    <>{children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false })}</>,
  Draggable: ({ children }: { children: (p: object, s: object) => React.ReactNode }) =>
    <>{children({ innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} }, { isDragging: false })}</>,
}))

vi.mock('@/app/actions', () => ({
  getOrCreateBoard: vi.fn(),
  updateCardAction: vi.fn(),
  addCardAction: vi.fn(),
  deleteCardAction: vi.fn(),
  moveCardAction: vi.fn(),
  addColumnAction: vi.fn(),
  renameColumnAction: vi.fn(),
  deleteColumnAction: vi.fn(),
  reorderColumnsAction: vi.fn(),
  renameBoardAction: vi.fn(),
}))

vi.mock('@/app/actions/tags', () => ({
  assignTagToCardAction: vi.fn(),
  removeTagFromCardAction: vi.fn(),
}))

vi.mock('@/app/actions/auth', () => ({
  logoutAction: vi.fn(),
}))

vi.mock('@/app/actions/sprints', () => ({
  createSprintAction: vi.fn(),
  updateSprintAction: vi.fn(),
  deleteSprintAction: vi.fn(),
  assignCardToSprintAction: vi.fn(),
  completeSprintAction: vi.fn(),
  getSprintsForBoardAction: vi.fn(),
}))

const boardState: BoardState = {
  projectName: 'Test Board',
  columns: [
    { id: 'col-1', title: 'A Fazer', cardIds: ['c1', 'c2'] },
  ],
  cards: {
    c1: { id: 'c1', title: 'Card Sprint 1', description: '', responsible: '', color: '#3b82f6', sprintId: 's1', createdAt: 0, updatedAt: 0 },
    c2: { id: 'c2', title: 'Card Sem Sprint', description: '', responsible: '', color: '#6b7280', sprintId: null, createdAt: 0, updatedAt: 0 },
  },
}

const sprints = [
  { id: 's1', name: 'Sprint 1', status: 'ACTIVE' as const },
]

const currentUser = { id: 'u1', name: 'Ana Silva', email: 'ana@x.com' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KanbanBoard extended', () => {
  it('renders SprintFilterBar when sprints prop provided', () => {
    render(<KanbanBoard initialState={boardState} boardId="b1" sprints={sprints} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sprint 1' })).toBeInTheDocument()
  })

  it('does not render SprintFilterBar when no sprints prop', () => {
    render(<KanbanBoard initialState={boardState} boardId="b1" />)
    expect(screen.queryByText('Todos')).not.toBeInTheDocument()
  })

  it('shows all cards when no sprint filter active', () => {
    render(<KanbanBoard initialState={boardState} boardId="b1" sprints={sprints} />)
    expect(screen.getByText('Card Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Card Sem Sprint')).toBeInTheDocument()
  })

  it('hides cards from other sprints when sprint filter active', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialState={boardState} boardId="b1" sprints={sprints} />)
    // Click the SprintFilterBar chip (button), not the SprintBadge in the card (span)
    await user.click(screen.getByRole('button', { name: 'Sprint 1' }))
    expect(screen.getByText('Card Sprint 1')).toBeInTheDocument()
    expect(screen.queryByText('Card Sem Sprint')).not.toBeInTheDocument()
  })

  it('shows all cards again when "Todos" clicked after filtering', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialState={boardState} boardId="b1" sprints={sprints} />)
    await user.click(screen.getByRole('button', { name: 'Sprint 1' }))
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(screen.getByText('Card Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Card Sem Sprint')).toBeInTheDocument()
  })

  it('renders UserAvatar in BoardHeader when currentUser provided', () => {
    render(<KanbanBoard initialState={boardState} boardId="b1" currentUser={currentUser} />)
    expect(screen.getByTitle('Ana Silva')).toBeInTheDocument()
  })

  it('renders BoardActionMenu button in header', () => {
    render(<KanbanBoard initialState={boardState} boardId="b1" />)
    expect(screen.getByRole('button', { name: /board actions/i })).toBeInTheDocument()
  })
})
