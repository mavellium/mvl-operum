// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findFirst: vi.fn() },
    documentVersion: { findMany: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('@/services/projectRoleService', () => ({
  isProjectManager: vi.fn(),
}))

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { isProjectManager } from '@/services/projectRoleService'
import { GET, POST } from '@/app/api/projects/[projetoId]/charter/versions/route'

const PROJETO_ID = 'proj-1'
const USER_ID = 'user-1'
const TENANT_ID = 'tenant-1'

function makeRequest(body?: object, search?: string): Request {
  const url = `http://localhost/api/projects/${PROJETO_ID}/charter/versions${search ? `?search=${search}` : ''}`
  return new Request(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method: 'GET' })
}

const params = Promise.resolve({ projetoId: PROJETO_ID })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifySession).mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, role: 'admin' })
  vi.mocked(isProjectManager).mockResolvedValue(false)
  vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: PROJETO_ID } as never)
})

describe('GET /charter/versions', () => {
  it('retorna versões com documentType CHARTER', async () => {
    const mockVersions = [
      { id: 'v1', commitTitle: 'Inicial', versao: '1.0', documentType: 'CHARTER', status: 'APPROVED', author: { name: 'Admin' }, createdAt: new Date() },
    ]
    vi.mocked(prisma.documentVersion.findMany).mockResolvedValue(mockVersions as never)

    const res = await GET(makeRequest(), { params })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(prisma.documentVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ documentType: 'CHARTER' }) }),
    )
  })

  it('retorna 403 para usuário sem acesso', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, role: 'member' })
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null as never)

    const res = await GET(makeRequest(), { params })
    expect(res.status).toBe(403)
  })
})

describe('POST /charter/versions', () => {
  it('cria versão com documentType CHARTER e auto-aprova para admin', async () => {
    const created = { id: 'v2', documentType: 'CHARTER', status: 'APPROVED' }
    vi.mocked(prisma.documentVersion.create).mockResolvedValue(created as never)

    const body = { commitTitle: 'Primeiro commit', versao: '1.0', elaboradoPor: 'Admin', aprovadoPor: 'Admin', dataAprovacao: '06/05/2026' }
    const res = await POST(makeRequest(body), { params })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(prisma.documentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentType: 'CHARTER', status: 'APPROVED' }),
      }),
    )
    expect(data.documentType).toBe('CHARTER')
  })

  it('retorna 400 quando campos obrigatórios ausentes', async () => {
    const body = { commitTitle: 'Sem versao' }
    const res = await POST(makeRequest(body), { params })
    expect(res.status).toBe(400)
  })
})
