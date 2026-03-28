import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BottomNav from '@/components/layout/BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/sprints'),
}))

describe('BottomNav', () => {
  it('renders 4 navigation tabs', () => {
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sprints' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Board' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Perfil' })).toBeInTheDocument()
  })

  it('links point to correct routes', () => {
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Sprints' })).toHaveAttribute('href', '/sprints')
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/board')
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil')
  })

  it('marks the active tab based on current path', () => {
    render(<BottomNav />)
    const sprintsLink = screen.getByRole('link', { name: /sprints/i })
    // Active link should have aria-current="page"
    expect(sprintsLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive tabs as current', () => {
    render(<BottomNav />)
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page')
  })
})
