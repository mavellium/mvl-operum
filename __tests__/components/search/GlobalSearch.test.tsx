import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GlobalSearch from '@/components/search/GlobalSearch'

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
          { id: 'c1', title: 'Fix bug', description: '', responsible: 'Ana', color: '#3b82f6', column: 'A Fazer', sprint: null, tags: [] },
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
      json: async () => ({ results: [{ id: 'c1', title: 'Fix bug', description: '', responsible: '', color: '#333', column: 'Backlog', sprint: null, tags: [] }] }),
    }))
    const user = userEvent.setup()
    render(<GlobalSearch />)
    await user.type(screen.getByRole('searchbox'), 'fix')
    await waitFor(() => screen.getByText('Fix bug'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByText('Fix bug')).not.toBeInTheDocument())
  })
})
