import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardModal from '@/components/card/CardModal'

vi.mock('@/app/actions/tags', () => ({
  assignTagToCardAction: vi.fn().mockResolvedValue({ success: true }),
  removeTagFromCardAction: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/app/actions/time', () => ({
  startTimerAction: vi.fn(),
  pauseTimerAction: vi.fn(),
  getCardTimeAction: vi.fn().mockResolvedValue({ seconds: 0 }),
  getActiveTimerAction: vi.fn().mockResolvedValue({ entry: null }),
  getTimeEntriesAction: vi.fn().mockResolvedValue({ entries: [] }),
}))

vi.mock('@/app/actions/cardResponsible', () => ({
  addResponsibleAction: vi.fn(),
  removeResponsibleAction: vi.fn(),
  getResponsiblesAction: vi.fn().mockResolvedValue({ responsibles: [] }),
}))

const users = [
  { id: 'u1', name: 'Ana Silva', email: 'ana@x.com' },
  { id: 'u2', name: 'Carlos Souza', email: 'carlos@x.com' },
]

const boardTags = [
  { id: 't1', name: 'Bug', color: '#ef4444' },
  { id: 't2', name: 'Feature', color: '#3b82f6' },
]

const baseCard = {
  id: 'c1',
  title: 'Test Card',
  description: 'Description',
  color: '#3b82f6' as const,
  sprintId: 's1',
  tags: [{ tagId: 't1', tag: { id: 't1', name: 'Bug', color: '#ef4444' } }],
  attachments: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  initialCard: baseCard,
  users,
  boardTags,
  attachments: [],
  onAttachmentUpload: vi.fn(),
  onAttachmentDelete: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CardModal extended', () => {
  it('renders MultiUserSelector when users prop provided for editing', async () => {
    const user = userEvent.setup()
    render(<CardModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Props' }))
    expect(screen.getByText(/responsáveis/i)).toBeInTheDocument()
  })

  it('renders TagSelector with board tags when boardTags provided', async () => {
    const user = userEvent.setup()
    render(<CardModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Props' }))
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Feature')).toBeInTheDocument()
  })

  it('renders CardAttachments section when attachments prop provided', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByText('Anexos')).toBeInTheDocument()
  })

  it('calls onSubmit with title, description, and color', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Card', description: 'Description', color: '#3b82f6' }),
    )
  })

  it('does not include responsibleId or sprintId in onSubmit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    const callArg = onSubmit.mock.calls[0][0]
    expect(callArg).not.toHaveProperty('responsibleId')
    expect(callArg).not.toHaveProperty('sprintId')
  })

  it('shows attachments list when attachments provided', () => {
    const att = [{ id: 'a1', fileName: 'doc.pdf', fileType: 'application/pdf', filePath: '/uploads/c1/a.pdf', fileSize: 100, uploadedAt: Date.now() }]
    render(<CardModal {...defaultProps} attachments={att} />)
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
  })

  it('does not show sprint selector', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.queryByText(/sprint 1/i)).not.toBeInTheDocument()
  })

  it('shows priority select with options baixa, media, alta', async () => {
    const user = userEvent.setup()
    render(<CardModal {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Props' }))
    expect(screen.getByRole('combobox', { name: /prioridade/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /baixa/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /média|media/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /alta/i })).toBeInTheDocument()
  })

  it('onSubmit includes priority field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} initialCard={{ ...baseCard, priority: 'alta' }} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'alta' }),
    )
  })
})
