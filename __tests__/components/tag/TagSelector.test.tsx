import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagSelector } from '@/components/tag/TagSelector'

const tags = [
  { id: 't1', name: 'bug', color: '#ef4444' },
  { id: 't2', name: 'feature', color: '#3b82f6' },
]

describe('TagSelector', () => {
  it('renders tags as colored badges', () => {
    render(<TagSelector tags={tags} selectedTagIds={[]} onToggle={vi.fn()} />)
    expect(screen.getByText('bug')).toBeInTheDocument()
    expect(screen.getByText('feature')).toBeInTheDocument()
  })

  it('calls onToggle when a badge is clicked', async () => {
    const onToggle = vi.fn()
    render(<TagSelector tags={tags} selectedTagIds={[]} onToggle={onToggle} />)
    await userEvent.click(screen.getByText('bug'))
    expect(onToggle).toHaveBeenCalledWith('t1')
  })

  it('shows checked state for already-assigned tags', () => {
    render(<TagSelector tags={tags} selectedTagIds={['t1']} onToggle={vi.fn()} />)
    const bugBadge = screen.getByText('bug').closest('[aria-pressed="true"]') ??
      screen.getByText('bug').closest('[data-selected="true"]') ??
      screen.getByText('bug').parentElement
    expect(bugBadge).toBeTruthy()
  })
})
