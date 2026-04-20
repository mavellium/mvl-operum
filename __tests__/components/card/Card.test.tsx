import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from '@/components/card/Card'
import type { Card as CardType } from '@/types/kanban'

vi.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: { children: (p: object, s: object) => React.ReactNode }) =>
    <>{children({ innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} }, { isDragging: false })}</>,
}))

vi.mock('@/components/card/CardModal', () => ({
  default: () => null,
}))

vi.mock('@/components/ui/ConfirmDialog', () => ({
  default: () => null,
}))

vi.mock('@/app/actions/tags', () => ({
  assignTagToCardAction: vi.fn(),
  removeTagFromCardAction: vi.fn(),
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

const makeCard = (overrides: Partial<CardType> = {}): CardType => ({
  id: 'c1',
  title: 'Test Card',
  description: 'Some description',
  color: '#6b7280',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

const defaultProps = {
  index: 0,
  columnId: 'col1',
  onClick: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
  users: [{ id: 'u1', name: 'Alice', email: 'alice@test.com', avatarUrl: null }],
  boardTags: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Card priority badge', () => {
  it('renders alta priority badge with red color class', () => {
    render(<Card {...defaultProps} card={makeCard({ priority: 'alta' })} />)
    const container = screen.getByText('alta').closest('div')
    expect(container?.innerHTML).toMatch(/red/)
  })

  it('renders media priority badge with amber color class', () => {
    render(<Card {...defaultProps} card={makeCard({ priority: 'media' })} />)
    const container = screen.getByText('media').closest('div')
    expect(container?.innerHTML).toMatch(/amber/)
  })

  it('renders baixa priority badge with emerald color class', () => {
    render(<Card {...defaultProps} card={makeCard({ priority: 'baixa' })} />)
    const container = screen.getByText('baixa').closest('div')
    expect(container?.innerHTML).toMatch(/emerald/)
  })

  it('does not render priority badge when priority is not set', () => {
    render(<Card {...defaultProps} card={makeCard({ priority: undefined })} />)
    expect(screen.queryByText('alta')).not.toBeInTheDocument()
    expect(screen.queryByText('media')).not.toBeInTheDocument()
    expect(screen.queryByText('baixa')).not.toBeInTheDocument()
  })
})

describe('Card responsible avatars', () => {
  it('renders responsible avatars on card face', () => {
    const card = makeCard({
      responsibles: [
        { user: { id: 'u1', name: 'Alice', avatarUrl: null } },
        { user: { id: 'u2', name: 'Bob', avatarUrl: null } },
      ],
    })
    render(<Card {...defaultProps} card={card} />)
    expect(screen.getByTitle('Alice')).toBeInTheDocument()
    expect(screen.getByTitle('Bob')).toBeInTheDocument()
  })

  it('renders +N indicator when more than 3 responsibles', () => {
    const card = makeCard({
      responsibles: [
        { user: { id: 'u1', name: 'A', avatarUrl: null } },
        { user: { id: 'u2', name: 'B', avatarUrl: null } },
        { user: { id: 'u3', name: 'C', avatarUrl: null } },
        { user: { id: 'u4', name: 'D', avatarUrl: null } },
      ],
    })
    render(<Card {...defaultProps} card={card} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})
