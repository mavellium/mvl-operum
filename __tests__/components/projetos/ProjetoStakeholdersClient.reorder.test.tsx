import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/app/actions/stakeholders', () => ({
  createStakeholderAction: vi.fn(),
  updateStakeholderAction: vi.fn(),
  bindStakeholderAction: vi.fn(),
  unbindStakeholderAction: vi.fn(),
  reorderStakeholdersAction: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/app/actions/projects', () => ({
  addMemberAction: vi.fn(),
  removeMemberAction: vi.fn(),
}))

vi.mock('@/app/actions/projetos', () => ({
  updateProjetoMemberAction: vi.fn(),
}))

vi.mock('@/app/actions/admin', () => ({
  adminCreateUserAction: vi.fn(),
}))

vi.mock('@/components/profile/AvatarUpload', () => ({
  default: ({ name }: { name: string }) => <div data-testid="avatar-upload">{name}</div>,
}))

vi.mock('@/components/ui/AddressFields', () => ({
  default: () => <div data-testid="address-fields" />,
  emptyAddress: {
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  },
}))

import ProjetoStakeholdersClient, { type StakeholderUnificado } from '@/components/projetos/ProjetoStakeholdersClient'
import { reorderStakeholdersAction } from '@/app/actions/stakeholders'

const PROJ_ID = 'p1'

const makeSk = (id: string, name: string): StakeholderUnificado => ({
  id,
  tipo: 'externo',
  stakeholderId: id,
  tenantId: 't1',
  name,
  email: `${id}@test.com`,
  avatarUrl: null,
  phone: null,
  cep: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: null,
  estado: null,
  notes: null,
  company: 'Empresa Teste',
  competence: null,
  isActive: true,
})

const DEFAULT_STAKEHOLDERS: StakeholderUnificado[] = [
  makeSk('sk1', 'Empresa Beta'),
  makeSk('sk2', 'Empresa Alpha'),
]

function renderComponent(stakeholders = DEFAULT_STAKEHOLDERS) {
  return render(
    <ProjetoStakeholdersClient
      projetoId={PROJ_ID}
      stakeholders={stakeholders}
      stakeholdersDisponiveis={[]}
      usuariosDisponiveis={[]}
      funcoesExistentes={[]}
      departamentosExistentes={[]}
      userRole="admin"
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(reorderStakeholdersAction).mockResolvedValue({ success: true })
})

describe('ProjetoStakeholdersClient — reordenação por drag and drop', () => {
  it('renderiza os dois stakeholders na lista', () => {
    renderComponent()
    expect(screen.getByText('Empresa Beta')).toBeInTheDocument()
    expect(screen.getByText('Empresa Alpha')).toBeInTheDocument()
  })

  it('chama reorderStakeholdersAction com IDs na nova ordem ao fazer drop', async () => {
    renderComponent()

    const items = screen.getAllByRole('listitem')
    // item[0] = Empresa Beta (sk1), item[1] = Empresa Alpha (sk2)
    // drag sk1 → drop na posição de sk2 → nova ordem: [sk2, sk1]
    fireEvent.dragStart(items[0])
    fireEvent.dragOver(items[1])
    fireEvent.drop(items[1])

    await waitFor(() => {
      expect(reorderStakeholdersAction).toHaveBeenCalledWith(PROJ_ID, ['sk2', 'sk1'])
    })
  })

  it('exibe mensagem de erro inline quando reorderStakeholdersAction falha', async () => {
    vi.mocked(reorderStakeholdersAction).mockResolvedValue({ error: 'Erro de rede' })

    renderComponent()

    const items = screen.getAllByRole('listitem')
    fireEvent.dragStart(items[0])
    fireEvent.dragOver(items[1])
    fireEvent.drop(items[1])

    await waitFor(() => {
      expect(screen.getByText(/Falha ao salvar a nova ordem/i)).toBeInTheDocument()
    })
  })

  it('reverte a ordem localmente quando a API falha', async () => {
    vi.mocked(reorderStakeholdersAction).mockResolvedValue({ error: 'Erro de rede' })

    renderComponent()

    const items = screen.getAllByRole('listitem')
    fireEvent.dragStart(items[0])
    fireEvent.dragOver(items[1])
    fireEvent.drop(items[1])

    await waitFor(() => {
      const names = screen.getAllByRole('listitem').map(li => li.textContent)
      // Após reversão, Beta deve voltar a ser o primeiro
      expect(names[0]).toContain('Empresa Beta')
    })
  })
})
