import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import KPICard from '@/components/dashboard/KPICard'

describe('KPICard', () => {
  it('renders label and value', () => {
    render(<KPICard label="Total de Cards" value={42} />)
    expect(screen.getByText('Total de Cards')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders sub text when provided', () => {
    render(<KPICard label="Custo" value="R$ 1.500" sub="este mês" />)
    expect(screen.getByText('este mês')).toBeInTheDocument()
  })
})
