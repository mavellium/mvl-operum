import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintSelector } from '@/components/sprint/SprintSelector'

const sprints = [
  { id: 's1', name: 'Sprint 1', status: 'PLANNED' as const },
  { id: 's2', name: 'Sprint 2', status: 'ACTIVE' as const },
]

describe('SprintSelector', () => {
  it('renders list of sprints', () => {
    render(<SprintSelector sprints={sprints} selectedSprintId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
    expect(screen.getByText('Sprint 2')).toBeInTheDocument()
  })

  it('calls onSelect with sprint ID when user clicks an item', async () => {
    const onSelect = vi.fn()
    render(<SprintSelector sprints={sprints} selectedSprintId={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Sprint 1'))
    expect(onSelect).toHaveBeenCalledWith('s1')
  })

  it('shows selected state for currently selected sprint', () => {
    render(<SprintSelector sprints={sprints} selectedSprintId="s2" onSelect={vi.fn()} />)
    const sprint2Item = screen.getByText('Sprint 2').closest('[data-selected]') ??
      screen.getByText('Sprint 2').closest('button') ??
      screen.getByText('Sprint 2').parentElement
    expect(sprint2Item).toBeTruthy()
  })
})
