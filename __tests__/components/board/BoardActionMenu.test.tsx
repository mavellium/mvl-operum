import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BoardActionMenu from '@/components/board/BoardActionMenu'

describe('BoardActionMenu', () => {
  it('renders button with aria-label "Board actions"', () => {
    render(<BoardActionMenu onImportCsv={vi.fn()} onCreateSprint={vi.fn()} onManageTags={vi.fn()} />)
    expect(screen.getByRole('button', { name: /board actions/i })).toBeInTheDocument()
  })

  it('does not show menu items before clicking', () => {
    render(<BoardActionMenu onImportCsv={vi.fn()} onCreateSprint={vi.fn()} onManageTags={vi.fn()} />)
    expect(screen.queryByText('Importar CSV')).not.toBeInTheDocument()
  })

  it('opens dropdown with all three menu items when button clicked', async () => {
    const user = userEvent.setup()
    render(<BoardActionMenu onImportCsv={vi.fn()} onCreateSprint={vi.fn()} onManageTags={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /board actions/i }))
    expect(screen.getByText('Importar CSV')).toBeInTheDocument()
    expect(screen.getByText('Criar Sprint')).toBeInTheDocument()
    expect(screen.getByText('Gerenciar Tags')).toBeInTheDocument()
  })

  it('calls onImportCsv when Importar CSV clicked', async () => {
    const user = userEvent.setup()
    const onImportCsv = vi.fn()
    render(<BoardActionMenu onImportCsv={onImportCsv} onCreateSprint={vi.fn()} onManageTags={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /board actions/i }))
    await user.click(screen.getByText('Importar CSV'))
    expect(onImportCsv).toHaveBeenCalledOnce()
  })

  it('calls onCreateSprint when Criar Sprint clicked', async () => {
    const user = userEvent.setup()
    const onCreateSprint = vi.fn()
    render(<BoardActionMenu onImportCsv={vi.fn()} onCreateSprint={onCreateSprint} onManageTags={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /board actions/i }))
    await user.click(screen.getByText('Criar Sprint'))
    expect(onCreateSprint).toHaveBeenCalledOnce()
  })

  it('calls onManageTags when Gerenciar Tags clicked', async () => {
    const user = userEvent.setup()
    const onManageTags = vi.fn()
    render(<BoardActionMenu onImportCsv={vi.fn()} onCreateSprint={vi.fn()} onManageTags={onManageTags} />)
    await user.click(screen.getByRole('button', { name: /board actions/i }))
    await user.click(screen.getByText('Gerenciar Tags'))
    expect(onManageTags).toHaveBeenCalledOnce()
  })
})
