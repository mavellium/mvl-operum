import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SprintBoard from '@/components/sprint/SprintBoard'

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Droppable: ({ children }: { children: (p: object, s: object) => React.ReactNode }) =>
    <>{children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false })}</>,
  Draggable: ({ children }: { children: (p: object, s: object) => React.ReactNode }) =>
    <>{children({ innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} }, { isDragging: false })}</>,
}))

vi.mock('@/app/actions/sprintBoard', () => ({
  moveCardInSprintAction: vi.fn(),
  addSprintColumnAction: vi.fn(),
  updateSprintMetaAction: vi.fn(),
  createCardInSprintAction: vi.fn(),
}))

const sprint = {
  id: 's1',
  name: 'Sprint 1',
  status: 'ACTIVE' as const,
  startDate: null,
  endDate: null,
  description: null,
  qualidade: null,
  dificuldade: null,
}

const columns = [
  {
    id: 'sc1', title: 'A Fazer', position: 0,
    cards: [{ id: 'c1', title: 'Task 1', description: '', responsible: '', color: '#3b82f6', tags: [] }],
  },
  {
    id: 'sc2', title: 'Concluído', position: 1,
    cards: [],
  },
]

beforeEach(() => vi.clearAllMocks())

describe('SprintBoard', () => {
  it('renders sprint name in header', () => {
    render(<SprintBoard sprint={sprint} columns={columns} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
  })

  it('renders all columns', () => {
    render(<SprintBoard sprint={sprint} columns={columns} />)
    expect(screen.getByText('A Fazer')).toBeInTheDocument()
    expect(screen.getByText('Concluído')).toBeInTheDocument()
  })

  it('renders cards in columns', () => {
    render(<SprintBoard sprint={sprint} columns={columns} />)
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  it('renders add column button', () => {
    render(<SprintBoard sprint={sprint} columns={columns} />)
    expect(screen.getByText(/nova coluna/i)).toBeInTheDocument()
  })

  it('renders status badge', () => {
    render(<SprintBoard sprint={sprint} columns={columns} />)
    expect(screen.getByText('Ativa')).toBeInTheDocument()
  })
})
