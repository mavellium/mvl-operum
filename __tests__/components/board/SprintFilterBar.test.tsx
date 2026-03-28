import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SprintFilterBar from '@/components/board/SprintFilterBar'

const sprints = [
  { id: 's1', name: 'Sprint 1' },
  { id: 's2', name: 'Sprint 2' },
]

describe('SprintFilterBar', () => {
  it('always renders a "Todos" chip', () => {
    render(<SprintFilterBar sprints={sprints} activeSprintId={null} onFilterChange={vi.fn()} />)
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('renders one chip per sprint', () => {
    render(<SprintFilterBar sprints={sprints} activeSprintId={null} onFilterChange={vi.fn()} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 2')).toBeInTheDocument()
  })

  it('"Todos" chip is active when activeSprintId is null', () => {
    render(<SprintFilterBar sprints={sprints} activeSprintId={null} onFilterChange={vi.fn()} />)
    const todosBtn = screen.getByText('Todos').closest('button')
    expect(todosBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('sprint chip is active when its id matches activeSprintId', () => {
    render(<SprintFilterBar sprints={sprints} activeSprintId="s1" onFilterChange={vi.fn()} />)
    const s1Btn = screen.getByText('Sprint 1').closest('button')
    expect(s1Btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onFilterChange with sprintId when sprint chip clicked', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(<SprintFilterBar sprints={sprints} activeSprintId={null} onFilterChange={onFilterChange} />)
    await user.click(screen.getByText('Sprint 1'))
    expect(onFilterChange).toHaveBeenCalledWith('s1')
  })

  it('calls onFilterChange with null when "Todos" clicked', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(<SprintFilterBar sprints={sprints} activeSprintId="s1" onFilterChange={onFilterChange} />)
    await user.click(screen.getByText('Todos'))
    expect(onFilterChange).toHaveBeenCalledWith(null)
  })
})
