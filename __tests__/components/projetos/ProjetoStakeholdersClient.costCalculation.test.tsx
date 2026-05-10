import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

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

const PROJ_ID = 'p1'

const makeInterno = (id: string, name: string): StakeholderUnificado => ({
  id,
  tipo: 'interno',
  userId: `u-${id}`,
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
  cargos: [],
  departamento: [],
  isGerente: false,
  hourlyRate: null,
  remuneracao: null,
  horasDiarias: null,
})

function renderWithInterno(member = makeInterno('m1', 'Joao Silva')) {
  const { container } = render(
    <ProjetoStakeholdersClient
      projetoId={PROJ_ID}
      stakeholders={[member]}
      stakeholdersDisponiveis={[]}
      usuariosDisponiveis={[]}
      funcoesExistentes={[]}
      departamentosExistentes={[]}
      userRole="admin"
    />,
  )
  // click pencil edit button to open detail panel
  fireEvent.click(screen.getByTitle('Editar'))
  return { container }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProjetoStakeholdersClient — calculo de custo por remuneracao', () => {
  it('exibe inputs de Remuneracao mensal e Horas por dia', () => {
    renderWithInterno()
    expect(screen.getByLabelText(/Remunera/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Horas por dia/i)).toBeInTheDocument()
  })

  it('calcula corretamente dia, hora e minuto a partir de remuneracao e horas/dia', () => {
    renderWithInterno()

    // Currency handler treats raw digits as cents (divide by 100), so '100000' -> R$ 1.000,00
    fireEvent.change(screen.getByLabelText(/Remunera/i), { target: { value: '100000' } })
    fireEvent.change(screen.getByLabelText(/Horas por dia/i), { target: { value: '4' } })

    // valor_dia = 1000 / 30 ≈ 33,33
    // valor_hora = 33,33 / 4 ≈ 8,33
    // valor_minuto = 8,33 / 60 ≈ 0,14
    // Use regex to handle non-breaking space in pt-BR currency format
    expect(screen.getByTestId('valor-dia')).toHaveTextContent(/33,3[23]/)
    expect(screen.getByTestId('valor-hora')).toHaveTextContent(/8,3[23]/)
    expect(screen.getByTestId('valor-minuto')).toHaveTextContent(/0,1[34]/)
  })

  it('exibe tracos quando horas/dia e zero', () => {
    renderWithInterno()

    fireEvent.change(screen.getByLabelText(/Remunera/i), { target: { value: '100000' } })
    fireEvent.change(screen.getByLabelText(/Horas por dia/i), { target: { value: '0' } })

    expect(screen.getByTestId('valor-dia')).toHaveTextContent('—')
    expect(screen.getByTestId('valor-hora')).toHaveTextContent('—')
    expect(screen.getByTestId('valor-minuto')).toHaveTextContent('—')
  })

  it('exibe tracos quando horas/dia esta vazio', () => {
    renderWithInterno()

    fireEvent.change(screen.getByLabelText(/Remunera/i), { target: { value: '100000' } })
    fireEvent.change(screen.getByLabelText(/Horas por dia/i), { target: { value: '' } })

    expect(screen.getByTestId('valor-dia')).toHaveTextContent('—')
    expect(screen.getByTestId('valor-hora')).toHaveTextContent('—')
    expect(screen.getByTestId('valor-minuto')).toHaveTextContent('—')
  })

  it('nao exibe o campo antigo Valor/hora como input editavel', () => {
    renderWithInterno()
    expect(screen.queryByLabelText('Valor/hora')).not.toBeInTheDocument()
  })
})
