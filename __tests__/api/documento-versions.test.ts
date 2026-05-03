// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/services/projectRoleService', () => ({
  isProjectManager: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findFirst: vi.fn() },
    documentVersion: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { verifySession } from '@/lib/dal'
import { isProjectManager } from '@/services/projectRoleService'
import prisma from '@/lib/prisma'
import { GET, POST } from '@/app/api/projects/[projetoId]/documento/versions/route'
import { PATCH } from '@/app/api/projects/[projetoId]/documento/versions/[versionId]/route'

const mockVerifySession = verifySession as ReturnType<typeof vi.fn>
const mockIsProjectManager = isProjectManager as ReturnType<typeof vi.fn>
const mockPrisma = prisma as {
  project: { findFirst: ReturnType<typeof vi.fn> }
  documentVersion: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

function makeGetRequest(projetoId: string, search?: string) {
  const url = search
    ? `http://localhost/api/projects/${projetoId}/documento/versions?search=${search}`
    : `http://localhost/api/projects/${projetoId}/documento/versions`
  return new Request(url)
}

function makePostRequest(projetoId: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/projects/${projetoId}/documento/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makePatchRequest(projetoId: string, versionId: string, action: string) {
  return new Request(
    `http://localhost/api/projects/${projetoId}/documento/versions/${versionId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    },
  )
}

const MOCK_PROJECT = { id: 'p1', tenantId: 't1', deletedAt: null }

const VALID_COMMIT_BODY = {
  commitTitle: 'Atualização inicial do documento',
  versao: '1.0',
  elaboradoPor: 'Ana Lima',
  aprovadoPor: 'João Silva',
  dataAprovacao: '01/05/2026',
}

const MOCK_VERSION_PENDING = {
  id: 'v1',
  projectId: 'p1',
  commitTitle: 'Atualização inicial do documento',
  versao: '1.0',
  elaboradoPor: 'Ana Lima',
  aprovadoPor: 'João Silva',
  dataAprovacao: '01/05/2026',
  authorId: 'u1',
  author: { name: 'Ana Lima' },
  status: 'PENDING',
  approvedAt: null,
  approvedById: null,
  createdAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'member', userId: 'u1' })
  mockIsProjectManager.mockResolvedValue(false)
  mockPrisma.project.findFirst.mockResolvedValue(MOCK_PROJECT)
  mockPrisma.documentVersion.findMany.mockResolvedValue([MOCK_VERSION_PENDING])
  mockPrisma.documentVersion.create.mockResolvedValue(MOCK_VERSION_PENDING)
  mockPrisma.documentVersion.findFirst.mockResolvedValue(MOCK_VERSION_PENDING)
  mockPrisma.documentVersion.update.mockResolvedValue({
    ...MOCK_VERSION_PENDING,
    status: 'APPROVED',
    approvedAt: new Date().toISOString(),
    approvedById: 'g1',
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// POST — criação de commit
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/projects/[projetoId]/documento/versions', () => {
  it('Teste 1: membro cria commit → status deve ser PENDING', async () => {
    mockIsProjectManager.mockResolvedValue(false)
    mockPrisma.documentVersion.create.mockResolvedValue({
      ...MOCK_VERSION_PENDING,
      status: 'PENDING',
    })

    const res = await POST(
      makePostRequest('p1', VALID_COMMIT_BODY) as never,
      { params: Promise.resolve({ projetoId: 'p1' }) },
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('PENDING')
    expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          authorId: 'u1',
          commitTitle: 'Atualização inicial do documento',
        }),
      }),
    )
  })

  it('Teste 2 (auto-approve): gerente cria commit → status deve ser APPROVED imediatamente', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'member', userId: 'g1' })
    mockIsProjectManager.mockResolvedValue(true)
    mockPrisma.documentVersion.create.mockResolvedValue({
      ...MOCK_VERSION_PENDING,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedById: 'g1',
    })

    const res = await POST(
      makePostRequest('p1', VALID_COMMIT_BODY) as never,
      { params: Promise.resolve({ projetoId: 'p1' }) },
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('APPROVED')
    expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedById: 'g1',
        }),
      }),
    )
  })

  it('retorna 400 quando commitTitle está ausente', async () => {
    const bodyWithoutTitle = { versao: '1.0', elaboradoPor: 'Ana', aprovadoPor: 'João', dataAprovacao: '01/05/2026' }

    const res = await POST(
      makePostRequest('p1', bodyWithoutTitle) as never,
      { params: Promise.resolve({ projetoId: 'p1' }) },
    )

    expect(res.status).toBe(400)
    expect(mockPrisma.documentVersion.create).not.toHaveBeenCalled()
  })

  it('retorna 403 quando usuário não tem acesso', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'member', userId: 'u99' })
    mockIsProjectManager.mockResolvedValue(false)
    // canMemberCreate é chamado primeiro; retorna null → usuário não é membro → 403
    mockPrisma.project.findFirst.mockResolvedValueOnce(null)

    const res = await POST(
      makePostRequest('p1', VALID_COMMIT_BODY) as never,
      { params: Promise.resolve({ projetoId: 'p1' }) },
    )

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET — listagem com busca
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/projects/[projetoId]/documento/versions', () => {
  it('Teste 3: aceita query ?search= e filtra por commitTitle no Prisma', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'admin', userId: 'u1' })
    mockPrisma.documentVersion.findMany.mockResolvedValue([MOCK_VERSION_PENDING])

    const res = await GET(
      makeGetRequest('p1', 'inicial') as never,
      { params: Promise.resolve({ projetoId: 'p1' }) },
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.documentVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'p1',
          OR: expect.arrayContaining([
            expect.objectContaining({ commitTitle: expect.objectContaining({ contains: 'inicial' }) }),
          ]),
        }),
      }),
    )
  })

  it('inclui dados do autor (author.name) no retorno', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'admin', userId: 'u1' })

    const res = await GET(
      makeGetRequest('p1') as never,
      { params: Promise.resolve({ projetoId: 'p1' }) },
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.documentVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          author: expect.objectContaining({ select: { name: true } }),
        }),
      }),
    )
  })

  it('retorna 403 quando usuário não tem acesso', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'member', userId: 'u99' })
    mockIsProjectManager.mockResolvedValue(false)

    const res = await GET(
      makeGetRequest('p1') as never,
      { params: Promise.resolve({ projetoId: 'p1' }) },
    )

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — aprovar / rejeitar (somente gerente)
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/projects/[projetoId]/documento/versions/[versionId]', () => {
  it('Teste 4: membro tenta aprovar → 403 Forbidden', async () => {
    mockIsProjectManager.mockResolvedValue(false)

    const res = await PATCH(
      makePatchRequest('p1', 'v1', 'approve') as never,
      { params: Promise.resolve({ projetoId: 'p1', versionId: 'v1' }) },
    )

    expect(res.status).toBe(403)
    expect(mockPrisma.documentVersion.update).not.toHaveBeenCalled()
  })

  it('gerente aprova → status muda para APPROVED', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'member', userId: 'g1' })
    mockIsProjectManager.mockResolvedValue(true)

    const res = await PATCH(
      makePatchRequest('p1', 'v1', 'approve') as never,
      { params: Promise.resolve({ projetoId: 'p1', versionId: 'v1' }) },
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('APPROVED')
    expect(mockPrisma.documentVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'v1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedById: 'g1',
        }),
      }),
    )
  })

  it('gerente rejeita → status muda para REJECTED', async () => {
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'member', userId: 'g1' })
    mockIsProjectManager.mockResolvedValue(true)
    mockPrisma.documentVersion.update.mockResolvedValueOnce({
      ...MOCK_VERSION_PENDING,
      status: 'REJECTED',
      approvedAt: null,
      approvedById: null,
    })

    const res = await PATCH(
      makePatchRequest('p1', 'v1', 'reject') as never,
      { params: Promise.resolve({ projetoId: 'p1', versionId: 'v1' }) },
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('REJECTED')
  })

  it('retorna 404 quando versão não encontrada', async () => {
    mockIsProjectManager.mockResolvedValue(true)
    mockPrisma.documentVersion.findFirst.mockResolvedValue(null)

    const res = await PATCH(
      makePatchRequest('p1', 'inexistente', 'approve') as never,
      { params: Promise.resolve({ projetoId: 'p1', versionId: 'inexistente' }) },
    )

    expect(res.status).toBe(404)
  })

  it('retorna 400 para action inválida', async () => {
    mockIsProjectManager.mockResolvedValue(true)

    const res = await PATCH(
      makePatchRequest('p1', 'v1', 'invalid_action') as never,
      { params: Promise.resolve({ projetoId: 'p1', versionId: 'v1' }) },
    )

    expect(res.status).toBe(400)
  })
})
