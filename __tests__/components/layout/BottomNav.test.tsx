import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BottomNav from '@/components/layout/BottomNav'

const mockUsePathname = vi.fn().mockReturnValue('/dashboard')

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('BottomNav', () => {
  it('renders base navigation tabs (Dashboard and Projetos)', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projetos' })).toBeInTheDocument()
  })

  it('does NOT render a Board tab', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<BottomNav />)
    expect(screen.queryByRole('link', { name: 'Board' })).not.toBeInTheDocument()
  })

  it('links point to correct routes', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Projetos' })).toHaveAttribute('href', '/projetos')
  })

  it('marks the active tab based on current path', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive tabs as current', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: 'Projetos' })).not.toHaveAttribute('aria-current', 'page')
  })

  it('does not render on /login', () => {
    mockUsePathname.mockReturnValue('/login')
    const { container } = render(<BottomNav />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render on /register', () => {
    mockUsePathname.mockReturnValue('/register')
    const { container } = render(<BottomNav />)
    expect(container.firstChild).toBeNull()
  })

  it('renders on /dashboard', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<BottomNav />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
