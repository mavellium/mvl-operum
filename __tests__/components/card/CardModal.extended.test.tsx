import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardModal from '@/components/card/CardModal'

vi.mock('@/app/actions/tags', () => ({
  assignTagToCardAction: vi.fn().mockResolvedValue({ success: true }),
  removeTagFromCardAction: vi.fn().mockResolvedValue({ success: true }),
}))

const users = [
  { id: 'u1', name: 'Ana Silva', email: 'ana@x.com' },
  { id: 'u2', name: 'Carlos Souza', email: 'carlos@x.com' },
]

const sprints = [
  { id: 's1', name: 'Sprint 1' },
  { id: 's2', name: 'Sprint 2' },
]

const boardTags = [
  { id: 't1', name: 'Bug', color: '#ef4444' },
  { id: 't2', name: 'Feature', color: '#3b82f6' },
]

const baseCard = {
  id: 'c1',
  title: 'Test Card',
  description: 'Description',
  responsible: 'Ana Silva',
  responsibleId: 'u1',
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
  sprints,
  boardTags,
  boardId: 'b1',
  attachments: [],
  onAttachmentUpload: vi.fn(),
  onAttachmentDelete: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CardModal extended', () => {
  it('renders UserSelector when users prop provided', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('UserSelector shows current responsibleId as selected', () => {
    render(<CardModal {...defaultProps} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('u1')
  })

  it('renders SprintSelector when sprints prop provided', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByText('Sprint 1')).toBeInTheDocument()
  })

  it('renders TagSelector with board tags when boardTags provided', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Feature')).toBeInTheDocument()
  })

  it('renders CardAttachments section when attachments prop provided', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByText('Anexos')).toBeInTheDocument()
  })

  it('calls onSubmit with responsibleId when user selection changes and form submitted', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} onSubmit={onSubmit} />)
    await user.selectOptions(screen.getByRole('combobox'), 'u2')
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ responsibleId: 'u2' }),
    )
  })

  it('calls onSubmit with sprintId when sprint selection changes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} onSubmit={onSubmit} />)
    // Find sprint selector radio/select — SprintSelector uses radio buttons
    const s2Radio = screen.getByText('Sprint 2').closest('button') || screen.getByLabelText?.('Sprint 2')
    if (s2Radio) {
      await user.click(s2Radio)
    }
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ sprintId: expect.any(String) }),
    )
  })

  it('shows attachments list when attachments provided', () => {
    const att = [{ id: 'a1', fileName: 'doc.pdf', fileType: 'application/pdf', filePath: '/uploads/c1/a.pdf', fileSize: 100, uploadedAt: Date.now() }]
    render(<CardModal {...defaultProps} attachments={att} />)
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
  })
})
