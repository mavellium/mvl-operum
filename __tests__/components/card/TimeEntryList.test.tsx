import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimeEntryList from '@/components/card/TimeEntryList'

vi.mock('@/app/actions/time', () => ({
  getTimeEntriesAction: vi.fn(),
  updateTimeEntryAction: vi.fn(),
  deleteTimeEntryAction: vi.fn(),
}))

import { getTimeEntriesAction, updateTimeEntryAction, deleteTimeEntryAction } from '@/app/actions/time'

const mockGetEntries = getTimeEntriesAction as ReturnType<typeof vi.fn>
const mockUpdate = updateTimeEntryAction as ReturnType<typeof vi.fn>
const mockDelete = deleteTimeEntryAction as ReturnType<typeof vi.fn>

const ENTRIES = [
  { id: 'e1', duration: 5400, description: 'Implementação', isManual: true, createdAt: new Date('2024-01-02') },
  { id: 'e2', duration: 1800, description: null, isManual: true, createdAt: new Date('2024-01-01') },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetEntries.mockResolvedValue({ entries: ENTRIES })
  mockUpdate.mockResolvedValue({ entry: { id: 'e1', duration: 7200, description: 'Editado' } })
  mockDelete.mockResolvedValue({ success: true })
})

describe('TimeEntryList', () => {
  it('renders list of time entries', async () => {
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => {
      expect(screen.getByRole('list', { name: /registros de tempo/i })).toBeInTheDocument()
    })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows formatted duration for each entry', async () => {
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => screen.getByText('1h 30m'))
    expect(screen.getByText('30m')).toBeInTheDocument()
  })

  it('shows description when present', async () => {
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => screen.getByText('Implementação'))
  })

  it('shows empty state when no entries', async () => {
    mockGetEntries.mockResolvedValue({ entries: [] })
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => screen.getByText(/nenhum registro/i))
  })

  it('clicking edit button shows edit form with current values', async () => {
    const user = userEvent.setup()
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => screen.getAllByRole('button', { name: /editar registro/i }))
    await user.click(screen.getAllByRole('button', { name: /editar registro/i })[0])
    expect(screen.getByLabelText(/horas edição/i)).toHaveValue(1)
    expect(screen.getByLabelText(/minutos edição/i)).toHaveValue(30)
    expect(screen.getByLabelText(/descrição edição/i)).toHaveValue('Implementação')
  })

  it('clicking save in edit calls updateTimeEntryAction and updates list', async () => {
    const user = userEvent.setup()
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => screen.getAllByRole('button', { name: /editar registro/i }))
    await user.click(screen.getAllByRole('button', { name: /editar registro/i })[0])
    await user.clear(screen.getByLabelText(/horas edição/i))
    await user.type(screen.getByLabelText(/horas edição/i), '2')
    await user.click(screen.getByRole('button', { name: /salvar edição/i }))
    expect(mockUpdate).toHaveBeenCalledWith('e1', 2, 30, 'Implementação')
  })

  it('shows error in edit form when time is zero', async () => {
    const user = userEvent.setup()
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => screen.getAllByRole('button', { name: /editar registro/i }))
    await user.click(screen.getAllByRole('button', { name: /editar registro/i })[0])
    await user.clear(screen.getByLabelText(/horas edição/i))
    await user.type(screen.getByLabelText(/horas edição/i), '0')
    await user.clear(screen.getByLabelText(/minutos edição/i))
    await user.type(screen.getByLabelText(/minutos edição/i), '0')
    await user.click(screen.getByRole('button', { name: /salvar edição/i }))
    expect(screen.getByText(/tempo maior que zero/i)).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('clicking delete calls deleteTimeEntryAction and removes entry from list', async () => {
    const user = userEvent.setup()
    render(<TimeEntryList cardId="c1" />)
    await waitFor(() => screen.getAllByRole('button', { name: /excluir registro/i }))
    await user.click(screen.getAllByRole('button', { name: /excluir registro/i })[0])
    expect(mockDelete).toHaveBeenCalledWith('e1')
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  })

  it('calls onChanged after delete', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(<TimeEntryList cardId="c1" onChanged={onChanged} />)
    await waitFor(() => screen.getAllByRole('button', { name: /excluir registro/i }))
    await user.click(screen.getAllByRole('button', { name: /excluir registro/i })[0])
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('calls onChanged after successful edit', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    render(<TimeEntryList cardId="c1" onChanged={onChanged} />)
    await waitFor(() => screen.getAllByRole('button', { name: /editar registro/i }))
    await user.click(screen.getAllByRole('button', { name: /editar registro/i })[0])
    await user.click(screen.getByRole('button', { name: /salvar edição/i }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('re-fetches entries when refreshKey changes', async () => {
    const { rerender } = render(<TimeEntryList cardId="c1" refreshKey={0} />)
    await waitFor(() => screen.getAllByRole('listitem'))
    expect(mockGetEntries).toHaveBeenCalledTimes(1)
    rerender(<TimeEntryList cardId="c1" refreshKey={1} />)
    await waitFor(() => expect(mockGetEntries).toHaveBeenCalledTimes(2))
  })
})
