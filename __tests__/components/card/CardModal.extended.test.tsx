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
  addManualTimeAction: vi.fn().mockResolvedValue({ entry: { id: 'm1' } }),
  updateTimeEntryAction: vi.fn().mockResolvedValue({ entry: { id: 'm1' } }),
  deleteTimeEntryAction: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/app/actions/sprintBoard', () => ({
  getCardMovementsAction: vi.fn().mockResolvedValue({ movements: [] }),
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
  it('renders MultiUserSelector when users prop provided for editing', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByText(/responsáveis/i)).toBeInTheDocument()
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

  it('calls onSubmit with title, description, and color', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Card', description: 'Description', color: '#3b82f6' }),
    )
  })

  it('does not include responsibleId or sprintId in onSubmit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))
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

  it('shows priority buttons for baixa, media, alta', () => {
    render(<CardModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: /baixa/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /média|media/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alta/i })).toBeInTheDocument()
  })

  it('onSubmit includes priority field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CardModal {...defaultProps} initialCard={{ ...baseCard, priority: 'alta' }} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'alta' }),
    )
  })

  it('readOnly renders title as static text and hides editing actions', () => {
    render(<CardModal {...defaultProps} readOnly />)
    expect(screen.getByRole('heading', { name: /test card/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /salvar alterações/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /fechar/i }).length).toBeGreaterThan(0)
  })

  it('readOnly shows responsibles as chips and priority as static badge', () => {
    const card = {
      ...baseCard,
      priority: 'alta',
      responsibles: [{ user: { id: 'u1', name: 'Ana Silva', avatarUrl: null } }],
    }
    render(<CardModal {...defaultProps} readOnly initialCard={card} />)
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText(/alta/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /baixa/i })).not.toBeInTheDocument()
  })

  it('readOnly hides comment composer', () => {
    render(<CardModal {...defaultProps} readOnly />)
    expect(screen.queryByPlaceholderText(/escreva um comentário/i)).not.toBeInTheDocument()
  })

  describe('autosave da descrição', () => {
    it('fechar pelo X logo após digitar grava a descrição (não perde o texto)', async () => {
      const onPatch = vi.fn().mockResolvedValue(undefined)
      const onClose = vi.fn()
      render(<CardModal {...defaultProps} onClose={onClose} onPatch={onPatch} />)
      await userEvent.click(screen.getByText('Description'))
      const textarea = screen.getByPlaceholderText('Adicione detalhes, critérios de aceite...')
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Texto novo')
      await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
      expect(onPatch).toHaveBeenCalledWith({ description: 'Texto novo' })
      expect(onClose).toHaveBeenCalled()
    })

    it('sem onPatch mantém o fluxo antigo (Salvar/Cancelar)', async () => {
      render(<CardModal {...defaultProps} />)
      await userEvent.click(screen.getByText('Description'))
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    })

    it('mostra "Salvo" depois do autosave', async () => {
      const onPatch = vi.fn().mockResolvedValue(undefined)
      render(<CardModal {...defaultProps} onPatch={onPatch} />)
      await userEvent.click(screen.getByText('Description'))
      const textarea = screen.getByPlaceholderText('Adicione detalhes, critérios de aceite...')
      await userEvent.type(textarea, '!')
      await userEvent.tab()
      expect(await screen.findByText('Salvo')).toBeInTheDocument()
      expect(onPatch).toHaveBeenCalledWith({ description: 'Description!' })
    })
  })

  describe('datas do card', () => {
    it('definir o prazo grava pelo onPatch ao sair do campo', async () => {
      const onPatch = vi.fn().mockResolvedValue(undefined)
      render(<CardModal {...defaultProps} onPatch={onPatch} />)
      const prazo = screen.getByLabelText('Prazo (entrega)')
      await userEvent.type(prazo, '2026-09-30T23:59')
      await userEvent.tab()
      expect(onPatch).toHaveBeenCalledWith({ startDate: null, endDate: new Date('2026-09-30T23:59').toISOString() })
    })

    it('remover o prazo envia null', async () => {
      const onPatch = vi.fn().mockResolvedValue(undefined)
      const card = { ...baseCard, endDate: new Date('2026-09-30T23:59') }
      render(<CardModal {...defaultProps} initialCard={card} onPatch={onPatch} />)
      await userEvent.click(screen.getByRole('button', { name: 'Remover prazo (entrega)' }))
      await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
      expect(onPatch).toHaveBeenCalledWith({ startDate: null, endDate: null })
    })

    it('prazo antes do início mostra erro e não salva', async () => {
      const onPatch = vi.fn().mockResolvedValue(undefined)
      const card = { ...baseCard, startDate: new Date('2026-09-30T10:00') }
      render(<CardModal {...defaultProps} initialCard={card} onPatch={onPatch} />)
      await userEvent.type(screen.getByLabelText('Prazo (entrega)'), '2026-09-29T10:00')
      await userEvent.tab()
      expect(screen.getByRole('alert')).toHaveTextContent('O prazo não pode ser antes do início.')
      expect(onPatch).not.toHaveBeenCalledWith(expect.objectContaining({ endDate: expect.any(String) }))
    })

    it('na criação, as datas vão junto do onSubmit', async () => {
      const onSubmit = vi.fn()
      render(<CardModal {...defaultProps} initialCard={undefined} onSubmit={onSubmit} />)
      await userEvent.type(screen.getByPlaceholderText('Título da tarefa...'), 'Novo')
      await userEvent.type(screen.getByLabelText('Prazo (entrega)'), '2026-10-01T09:00')
      await userEvent.click(screen.getByRole('button', { name: /^(Salvar|Criar)/ }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Novo',
        endDate: new Date('2026-10-01T09:00').toISOString(),
        startDate: null,
      }))
    })
  })
})
