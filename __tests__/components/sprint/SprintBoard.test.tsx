import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SprintBoard from '@/components/sprint/SprintBoard'
import { ToastProvider } from '@/components/ui/Toast'

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

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
  renameSprintColumnAction: vi.fn(),
  deleteSprintColumnAction: vi.fn(),
  reorderSprintColumnsAction: vi.fn(),
  updateCardInSprintAction: vi.fn(),
  deleteCardInSprintAction: vi.fn(),
  getProjectBacklogAction: vi.fn().mockResolvedValue([]),
  moveCardToSprintAction: vi.fn(),
  moveCardToBacklogAction: vi.fn(),
  createBacklogCardAction: vi.fn(),
  getCardMovementsAction: vi.fn().mockResolvedValue({ movements: [] }),
}))

vi.mock('@/app/actions/tags', () => ({
  assignTagToCardAction: vi.fn(),
  removeTagFromCardAction: vi.fn(),
  createTagAction: vi.fn(),
}))

vi.mock('@/app/actions/auth', () => ({
  logoutAction: vi.fn(),
}))

vi.mock('@/app/actions/time', () => ({
  startTimerAction: vi.fn(),
  pauseTimerAction: vi.fn(),
  getCardTimeAction: vi.fn().mockResolvedValue({ seconds: 0 }),
  getActiveTimerAction: vi.fn().mockResolvedValue({ entry: null }),
  getTimeEntriesAction: vi.fn().mockResolvedValue({ entries: [] }),
  addManualTimeAction: vi.fn().mockResolvedValue({ entry: { id: 'm1' } }),
  updateTimeEntryAction: vi.fn().mockResolvedValue({ entry: { id: 'm1' } }),
  deleteTimeEntryAction: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/app/actions/cardResponsible', () => ({
  addResponsibleAction: vi.fn(),
  removeResponsibleAction: vi.fn(),
  getResponsiblesAction: vi.fn(),
}))

vi.mock('@/app/actions/comentarios', () => ({
  createCommentAction: vi.fn(),
  getCommentsAction: vi.fn().mockResolvedValue({ comments: [] }),
}))

vi.mock('@/app/actions/attachments', () => ({
  deleteAttachmentAction: vi.fn(),
  setCoverAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
  usePathname: vi.fn().mockReturnValue('/sprints/s1'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
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

const users = [
  { id: 'u1', name: 'Ana Lima', email: 'ana@example.com', avatarUrl: null },
]

const tags = [
  { id: 't1', name: 'Bug', color: '#ef4444' },
]

const columns = [
  {
    id: 'sc1', title: 'A Fazer', position: 0,
    cards: [
      {
        id: 'c1',
        title: 'Task 1',
        description: 'Descrição da task',
        color: '#3b82f6',
        tags: [{ tagId: 't1', tag: { id: 't1', name: 'Bug', color: '#ef4444' } }],
        attachments: [],
        timeEntries: [],
      },
    ],
  },
  {
    id: 'sc2', title: 'Concluído', position: 1,
    cards: [],
  },
]

beforeEach(() => vi.clearAllMocks())

describe('SprintBoard', () => {
  it('renders sprint name in header', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
  })

  it('renders all columns', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    expect(screen.getByText('A Fazer')).toBeInTheDocument()
    expect(screen.getByText('Concluído')).toBeInTheDocument()
  })

  it('renders cards in columns', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    expect(screen.getByText('Task 1')).toBeInTheDocument()
  })

  it('renders add column button', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    expect(screen.getByText(/nova coluna/i)).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    expect(screen.getByText('Ativa')).toBeInTheDocument()
  })

  it('renders delete column button for each column', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    expect(screen.getByRole('button', { name: /excluir coluna a fazer/i })).toBeInTheDocument()
  })

  it('renders card with tags', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" users={users} tags={tags} />)
    expect(screen.getByText('Bug')).toBeInTheDocument()
  })

  it('column header has inline editable title', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    const titles = screen.getAllByText('A Fazer')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders board action menu button', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    expect(screen.getByRole('button', { name: /board actions/i })).toBeInTheDocument()
  })

  it('opens CSV import modal via action menu', () => {
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" />)
    fireEvent.click(screen.getByRole('button', { name: /board actions/i }))
    fireEvent.click(screen.getByText(/importar csv/i))
    expect(screen.getAllByText(/importar csv/i).length).toBeGreaterThanOrEqual(1)
  })

  it('opens card modal when clicking a backlog card', () => {
    const backlogCard = {
      id: 'bc1',
      title: 'Backlog Task',
      description: '',
      color: '#3b82f6',
      tags: [],
      attachments: [],
    }
    renderWithProviders(<SprintBoard sprint={sprint} columns={columns} projectId="proj1" backlogCards={[backlogCard]} />)
    fireEvent.click(screen.getByText('Backlog Task'))
    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument()
  })

  it('opens concluded card in read-only mode', () => {
    const concludedColumns = [
      columns[0],
      {
        id: 'sc2', title: 'Concluído', position: 1,
        cards: [{ id: 'c9', title: 'Done Task', description: 'feito', color: '#3b82f6', tags: [], attachments: [] }],
      },
    ]
    renderWithProviders(<SprintBoard sprint={sprint} columns={concludedColumns} projectId="proj1" />)
    fireEvent.click(screen.getByText('Done Task'))
    expect(screen.getByRole('heading', { name: /done task/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /salvar alterações/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /fechar/i }).length).toBeGreaterThan(0)
  })
})
