import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UserAvatar from '@/components/user/UserAvatar'

describe('UserAvatar', () => {
  it('renders initials from two-word name', () => {
    render(<UserAvatar name="João Silva" />)
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('renders single initial for one-word name', () => {
    render(<UserAvatar name="Ana" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('falls back to "?" when name is undefined', () => {
    render(<UserAvatar name={undefined} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('applies title attribute with full name', () => {
    render(<UserAvatar name="João Silva" />)
    const el = screen.getByTitle('João Silva')
    expect(el).toBeInTheDocument()
  })
})
