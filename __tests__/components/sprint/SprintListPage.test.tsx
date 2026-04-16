import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SprintListPage from '@/components/sprint/SprintListPage'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: vi.fn().mockReturnValue('/sprints'),
}))

vi.mock('@/app/actions/sprints', () => ({
  createSprintAction: vi.fn(),
}))

vi.mock('@/app/actions/migration', () => ({
  migrateOrphanCardsAction: vi.fn(),
  getOrphanCardCountAction: vi.fn(),
}))

vi.mock('@/app/actions/auth', () => ({
  logoutAction: vi.fn(),
}))

vi.mock('@/app/actions/tags', () => ({
  createTagAction: vi.fn(),
  assignTagToCardAction: vi.fn(),
  removeTagFromCardAction: vi.fn(),
}))

const currentUser = { id: 'u1', name: 'Ana Lima', email: 'ana@example.com', avatarUrl: null }
const tags = [{ id: 't1', name: 'Bug', color: '#ef4444' }]

const sprintsWithMetrics = [
  {
    sprint: {
      id: 's1',
      name: 'Sprint 1',
      status: 'ACTIVE' as const,
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-15'),
      qualidade: 8,
      dificuldade: 6,
    },
    metrics: {
      horasTotais: 24.5,
      custoTotal: 1800,
      cardsTotal: 10,
      cardsConcluidos: 7,
      cardsAtrasados: 1,
    },
  },
  {
    sprint: {
      id: 's2',
      name: 'Sprint 2',
      status: 'PLANNED' as const,
      startDate: null,
      endDate: null,
      qualidade: null,
      dificuldade: null,
    },
    metrics: {
      horasTotais: 0,
      custoTotal: 0,
      cardsTotal: 0,
      cardsConcluidos: 0,
      cardsAtrasados: 0,
    },
  },
]

describe('SprintListPage', () => {
  it('renders sprint names', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 2')).toBeInTheDocument()
  })

  it('renders hours for each sprint', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics} />)
    expect(screen.getByText(/24h/)).toBeInTheDocument()
  })

  it('renders progress percentage', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics} />)
    const matches = screen.getAllByText(/70%/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders quality when set', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics} />)
    expect(screen.getByText(/8\/10/)).toBeInTheDocument()
  })

  it('each sprint card links to its Mavellium Operum', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics} />)
    const links = screen.getAllByRole('link').filter(l => l.getAttribute('href')?.startsWith('/sprints/'))
    expect(links.length).toBeGreaterThanOrEqual(2)
    expect(links[0]).toHaveAttribute('href', '/sprints/s1')
    expect(links[1]).toHaveAttribute('href', '/sprints/s2')
  })

  it('shows "Nova Sprint" button', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics} />)
    expect(screen.getByRole('button', { name: /nova sprint/i })).toBeInTheDocument()
  })

  it('shows empty state when no sprints', () => {
    render(<SprintListPage sprintsWithMetrics={[]} />)
    expect(screen.getByText(/nenhuma sprint/i)).toBeInTheDocument()
  })

  // Header features
  it('renders global search input', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics}/>)
    expect(screen.getByRole('searchbox', { name: /busca global/i })).toBeInTheDocument()
  })

  it('renders board action menu button', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics}  />)
    expect(screen.getByRole('button', { name: /board actions/i })).toBeInTheDocument()
  })

  it('renders user avatar and name when currentUser is passed', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics}  currentUser={currentUser} />)
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /menu do usuário/i })).toBeInTheDocument()
  })

  it('opens CSV import modal when "Importar CSV" is clicked via action menu', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics}  />)
    fireEvent.click(screen.getByRole('button', { name: /board actions/i }))
    fireEvent.click(screen.getByText(/importar csv/i))
    // Modal title "Importar CSV" should now appear in the modal header
    expect(screen.getAllByText(/importar csv/i).length).toBeGreaterThanOrEqual(1)
  })

  it('opens tag manager modal when "Gerenciar Tags" is clicked via action menu', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics}  tags={tags} />)
    fireEvent.click(screen.getByRole('button', { name: /board actions/i }))
    fireEvent.click(screen.getByText(/gerenciar tags/i))
    // TagManager heading "Tags" should appear after modal opens
    const tagHeadings = screen.getAllByText(/^tags$/i)
    expect(tagHeadings.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render "Nova Coluna" button (sprint list, not board)', () => {
    render(<SprintListPage sprintsWithMetrics={sprintsWithMetrics}  />)
    expect(screen.queryByText(/nova coluna/i)).not.toBeInTheDocument()
  })
})
