// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/documentRevisionService', () => ({ documentoVigente: vi.fn().mockResolvedValue(null) }))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/projectAccess', () => ({
  canProjectPermission: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findFirst: vi.fn() },
    userProject: { findMany: vi.fn() },
    projectStakeholder: { findMany: vi.fn() },
    userProjectRole: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}))

import { verifySession } from '@/lib/dal'
import { canProjectPermission } from '@/services/projectAccess'
import prisma from '@/lib/prisma'
import { GET } from '@/app/api/projects/[projetoId]/documento/route'
import { documentoVigente } from '@/services/documentRevisionService'

const mockVerifySession = verifySession as ReturnType<typeof vi.fn>
const mockCan = canProjectPermission as ReturnType<typeof vi.fn>
const mockPrisma = prisma as {
  project: { findFirst: ReturnType<typeof vi.fn> }
  userProject: { findMany: ReturnType<typeof vi.fn> }
  projectStakeholder: { findMany: ReturnType<typeof vi.fn> }
  userProjectRole: { findMany: ReturnType<typeof vi.fn> }
  user: { findMany: ReturnType<typeof vi.fn> }
}

function makeRequest(projetoId: string) {
  return new Request(`http://localhost/api/projects/${projetoId}/documento`)
}

const MOCK_PROJECT = {
  id: 'p1',
  name: 'Projeto Teste',
  tenantId: 't1',
  deletedAt: null,
  startDate: new Date('2026-01-01'),
  departamentos: ['TI'],
  semestre: '1',
  ano: '2026',
  location: null,
  logoUrl: null,
}

const MOCK_USER_PROJECTS = [
  {
    userId: 'u1',
    role: 'Desenvolvedor',
    startDate: new Date('2026-01-01'),
    hourlyRate: null,
    user: {
      name: 'Ana Lima',
      email: 'ana@test.com',
      phone: null,
      logradouro: null,
      numero: null,
      bairro: null,
      cidade: null,
      estado: null,
      notes: null,
      deletedAt: null,
      isActive: true,
    },
    department: { name: 'TI' },
  },
]

const MOCK_PROJECT_STAKEHOLDERS = [
  {
    stakeholder: {
      id: 'sk1',
      name: 'Empresa Beta',
      company: 'Beta LTDA',
      competence: 'Consultoria',
      email: 'beta@test.com',
      phone: null,
      logradouro: null,
      numero: null,
      bairro: null,
      cidade: null,
      estado: null,
      notes: null,
    },
    order: 0,
  },
  {
    stakeholder: {
      id: 'sk2',
      name: 'Empresa Alpha',
      company: 'Alpha LTDA',
      competence: 'Suporte',
      email: 'alpha@test.com',
      phone: null,
      logradouro: null,
      numero: null,
      bairro: null,
      cidade: null,
      estado: null,
      notes: null,
    },
    order: 1,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
    vi.mocked(canProjectPermission).mockResolvedValue(true)
  mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'admin', userId: 'u1' })
  mockCan.mockResolvedValue(true)
  mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT)
  mockPrisma.userProject.findMany.mockResolvedValue(MOCK_USER_PROJECTS)
  mockPrisma.projectStakeholder.findMany.mockResolvedValue(MOCK_PROJECT_STAKEHOLDERS)
  mockPrisma.userProjectRole.findMany.mockResolvedValue([])
  mockPrisma.user.findMany.mockResolvedValue([])
})

describe('GET /api/projects/[projetoId]/documento', () => {
  it('busca stakeholders do projeto ordenados pelo campo order (não pelo nome)', async () => {
    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })

    expect(res.status).toBe(200)
    expect(mockPrisma.projectStakeholder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { order: 'asc' },
      }),
    )
  })

  it('retorna stakeholders externos na ordem definida pelo campo order (Beta antes de Alpha)', async () => {
    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })

    const data = await res.json()
    const externos = data.stakeholders.filter((s: { nome: string }) =>
      s.nome === 'Empresa Beta' || s.nome === 'Empresa Alpha',
    )

    expect(externos[0].nome).toBe('Empresa Beta')
    expect(externos[1].nome).toBe('Empresa Alpha')
  })

  it('retorna 403 quando usuário não tem acesso ao projeto', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'member', userId: 'u2' })
    mockCan.mockResolvedValue(false)

    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })
    expect(res.status).toBe(403)
  })

  it('retorna 404 quando projeto não encontrado', async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null)

    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })
    expect(res.status).toBe(404)
  })

  it('retorna signatureUrl no header quando gerente tem assinatura cadastrada', async () => {
    mockPrisma.userProjectRole.findMany.mockResolvedValue([{ userId: 'g1' }])
    mockPrisma.user.findMany.mockResolvedValue([{ name: 'João', signatureUrl: 'https://storage/sig.png' }])

    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.header.signatureUrl).toBe('https://storage/sig.png')
  })

  it('retorna null no campo signatureUrl quando nenhum gerente tem assinatura', async () => {
    mockPrisma.userProjectRole.findMany.mockResolvedValue([])
    mockPrisma.user.findMany.mockResolvedValue([])

    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.header.signatureUrl).toBeNull()
  })

  it('stakeholder inativo sai marcado (inativo + motivo) e o ativo não ganha a marca', async () => {
    mockPrisma.projectStakeholder.findMany.mockResolvedValue([
      { ...MOCK_PROJECT_STAKEHOLDERS[0], stakeholder: { ...MOCK_PROJECT_STAKEHOLDERS[0].stakeholder, isActive: true } },
      { ...MOCK_PROJECT_STAKEHOLDERS[1], stakeholder: { ...MOCK_PROJECT_STAKEHOLDERS[1].stakeholder, isActive: false, inactiveReason: 'Contrato encerrado' } },
    ])
    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })
    const data = await res.json() as { stakeholders: { nome: string; inativo?: boolean; motivoInativo?: string }[] }
    const beta = data.stakeholders.find(s => s.nome === 'Empresa Beta')!
    const alpha = data.stakeholders.find(s => s.nome === 'Empresa Alpha')!
    expect(beta.inativo).toBeUndefined()
    expect(alpha).toMatchObject({ inativo: true, motivoInativo: 'Contrato encerrado' })
  })

  it('versão vigente antiga (sem a marca) ganha o vermelho pelo nome do stakeholder inativo', async () => {
    mockPrisma.projectStakeholder.findMany.mockResolvedValue([
      { ...MOCK_PROJECT_STAKEHOLDERS[1], stakeholder: { ...MOCK_PROJECT_STAKEHOLDERS[1].stakeholder, isActive: false, inactiveReason: 'Saiu' } },
    ])
    vi.mocked(documentoVigente).mockResolvedValueOnce({
      payload: {
        header: {},
        stakeholders: [
          { ref: '01', nome: ' empresa alpha ' },
          { ref: '02', nome: 'Outra', inativo: false },
        ],
      },
    } as never)
    const res = await GET(makeRequest('p1') as never, { params: Promise.resolve({ projetoId: 'p1' }) })
    const data = await res.json() as { stakeholders: { nome: string; inativo?: boolean; motivoInativo?: string }[] }
    expect(data.stakeholders[0]).toMatchObject({ inativo: true, motivoInativo: 'Saiu' })
    expect(data.stakeholders[1].inativo).toBe(false)
  })
})

