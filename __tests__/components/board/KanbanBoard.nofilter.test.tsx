import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import KanbanBoard from '@/components/board/KanbanBoard'
import type { BoardState } from '@/types/kanban'

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

vi.mock('@/app/actions/time', () => ({
  startTimerAction: vi.fn(),
  pauseTimerAction: vi.fn(),
  getCardTimeAction: vi.fn().mockResolvedValue({ seconds: 0 }),
  getActiveTimerAction: vi.fn().mockResolvedValue({ entry: null }),
}))

vi.mock('@/app/actions/cardResponsible', () => ({
  addResponsibleAction: vi.fn(),
  removeResponsibleAction: vi.fn(),
  getResponsiblesAction: vi.fn().mockResolvedValue({ responsibles: [] }),
}))

const boardState: BoardState = {
  projectName: 'Test Project',
  columns: [{ id: 'col1', title: 'To Do', cardIds: [] }],
  cards: {},
}

const sprints = [
  { id: 's1', name: 'Sprint 1', status: 'ACTIVE' as const },
  { id: 's2', name: 'Sprint 2', status: 'PLANNED' as const },
]

beforeEach(() => vi.clearAllMocks())

describe('KanbanBoard — no sprint filter bar', () => {
  it('does NOT render SprintFilterBar even when sprints are provided', () => {
    render(
      <KanbanBoard
        initialState={boardState}
        boardId="b1"
        sprints={sprints}
        tags={[]}
        users={[]}
        currentUser={null}
      />
    )
    // SprintFilterBar would render a "Todos" button — should NOT be present
    expect(screen.queryByRole('button', { name: /todos/i })).not.toBeInTheDocument()
  })

  it('renders board header with project name', () => {
    render(
      <KanbanBoard
        initialState={boardState}
        boardId="b1"
        sprints={[]}
        tags={[]}
        users={[]}
        currentUser={null}
      />
    )
    expect(screen.getByText('Test Project')).toBeInTheDocument()
  })

  it('renders all columns without sprint filter', () => {
    const state: BoardState = {
      ...boardState,
      columns: [
        { id: 'col1', title: 'Backlog', cardIds: [] },
        { id: 'col2', title: 'Doing', cardIds: [] },
      ],
    }
    render(
      <KanbanBoard
        initialState={state}
        boardId="b1"
        sprints={sprints}
        tags={[]}
        users={[]}
        currentUser={null}
      />
    )
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Doing')).toBeInTheDocument()
  })
})
