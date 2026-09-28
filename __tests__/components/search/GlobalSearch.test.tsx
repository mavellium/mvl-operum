import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GlobalSearch from '@/components/search/GlobalSearch'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GlobalSearch', () => {
  it('renders search input', () => {
    render(<GlobalSearch />)
    expect(screen.getByRole('searchbox', { name: /busca global/i })).toBeInTheDocument()
  })

  it('does not show results if query is empty', () => {
    render(<GlobalSearch />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows results when API returns data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 'c1', title: 'Fix bug', description: '', color: '#3b82f6', sprintId: 's1', sprint: null, sprintColumn: null, tags: [] },
        ],
      }),
    }))
    const user = userEvent.setup()
    render(<GlobalSearch />)
    const input = screen.getByRole('searchbox')
    await user.type(input, 'fix')
    await waitFor(() => expect(screen.getByText('Fix bug')).toBeInTheDocument(), { timeout: 2000 })
  })

  it('shows empty state when no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    }))
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.type(screen.getByRole('searchbox'), 'xyz')
    await waitFor(() => expect(screen.getByText(/nenhum resultado/i)).toBeInTheDocument(), { timeout: 2000 })
  })

  it('clears and closes on Escape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 'c1', title: 'Fix bug', description: '', color: '#333', sprintId: 's1', sprint: null, sprintColumn: null, tags: [] }] }),
    }))
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.type(screen.getByRole('searchbox'), 'fix')
    await waitFor(() => screen.getByText('Fix bug'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Fix bug')).not.toBeInTheDocument())
  })

  it('clicking result navigates to /sprints/[id]?card=[id]', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 'c1', title: 'Fix bug', type: 'card', description: '', color: '#3b82f6', sprintId: 's1', sprint: 'Sprint 1', sprintColumn: 'A Fazer', tags: [] },
        ],
      }),
    }))
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.type(screen.getByRole('searchbox'), 'fix')
    await waitFor(() => screen.getByText('Fix bug'))
    await user.click(screen.getByText('Fix bug'))
    expect(mockPush).toHaveBeenCalledWith('/sprints/s1?card=c1')
  })

  it('closes dropdown and clears query on select', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 'c1', title: 'Fix bug', description: '', color: '#3b82f6', sprintId: 's1', sprint: null, sprintColumn: null, tags: [] },
        ],
      }),
    }))
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.type(screen.getByRole('searchbox'), 'fix')
    await waitFor(() => screen.getByText('Fix bug'))
    await user.click(screen.getByText('Fix bug'))
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  describe('busca unificada do projeto', () => {
    const results = [
      { id: 'a', title: 'Card atual', type: 'card', group: 'sprint_atual', sprintId: 's1', sprint: 'Sprint 1', sprintStatus: 'ACTIVE', sprintColumn: 'A Fazer', priority: 'alta', responsibles: ['Ana'], tempoSegundos: 4200, projectId: 'p1' },
      { id: 'o', title: 'Card antigo', type: 'card', group: 'outras_sprints', sprintId: 's0', sprint: 'Sprint 0', sprintStatus: 'COMPLETED', sprintColumn: 'Concluído', projectId: 'p1' },
      { id: 'b', title: 'Card backlog', type: 'card', group: 'backlog', sprint: null, projectId: 'p1' },
      { id: 'm', title: 'Card do Márcio', type: 'card', group: 'cards_pessoa', personName: 'Márcio', sprintId: 's0', sprint: 'Sprint 0', projectId: 'p1' },
    ]

    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results }) }))
    })

    it('envia a sprint atual e mostra os grupos na ordem, com sprint, status, prioridade, responsável e tempo', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch searchContext="project_items" contextId="p1" currentSprintId="s1" />)
      await user.type(screen.getByRole('searchbox'), 'card')
      await waitFor(() => expect(screen.getByText('Card atual')).toBeInTheDocument(), { timeout: 2000 })

      const url = String(vi.mocked(fetch).mock.calls.at(-1)?.[0])
      expect(url).toContain('sprintId=s1')

      const listbox = screen.getByRole('listbox')
      const headers = ['Nesta sprint', 'Outras sprints', 'Backlog do projeto', 'Cards de Márcio']
      const text = listbox.textContent ?? ''
      const posicoes = headers.map(h => text.indexOf(h))
      expect(posicoes.every(p => p >= 0)).toBe(true)
      expect([...posicoes].sort((x, y) => x - y)).toEqual(posicoes)

      expect(screen.getByText('Sprint 0 (concluída)', { exact: false })).toBeInTheDocument()
      expect(text).toContain('Alta')
      expect(text).toContain('Ana')
      expect(text).toContain('1h 10m')
    })

    it('card do backlog abre no board da sprint aberta', async () => {
      const user = userEvent.setup()
      render(<GlobalSearch searchContext="project_items" contextId="p1" currentSprintId="s1" />)
      await user.type(screen.getByRole('searchbox'), 'card')
      await waitFor(() => expect(screen.getByText('Card backlog')).toBeInTheDocument(), { timeout: 2000 })
      await user.click(screen.getByText('Card backlog'))
      expect(mockPush).toHaveBeenCalledWith('/projetos/p1/sprints/s1?card=b')
    })
  })
})
