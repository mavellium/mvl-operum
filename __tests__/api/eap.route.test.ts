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
  },
}))

vi.mock('@/services/eapService', async () => {
  class EapValidationError extends Error {}
  class EapNotFoundError extends Error {}
  return {
    getOrCreateDocument: vi.fn(),
    saveDocument: vi.fn(),
    resetDocument: vi.fn(),
    formatInstitucionalInfo: vi.fn(() => ({})),
    EapValidationError,
    EapNotFoundError,
  }
})

import { verifySession } from '@/lib/dal'
import prisma from '@/lib/prisma'
import { getOrCreateDocument, EapValidationError } from '@/services/eapService'
import { GET } from '@/app/api/projects/[projetoId]/eap/route'

const mockVerifySession = verifySession as ReturnType<typeof vi.fn>
const mockFindFirst = (prisma as unknown as { project: { findFirst: ReturnType<typeof vi.fn> } }).project.findFirst
const mockGetOrCreate = getOrCreateDocument as ReturnType<typeof vi.fn>

const ctx = { params: Promise.resolve({ projetoId: 'p1' }) }

describe('GET /api/projects/:id/eap — tratamento de erro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockVerifySession.mockResolvedValue({ tenantId: 't1', role: 'admin', userId: 'u1' })
    mockFindFirst.mockResolvedValue({ id: 'p1', name: 'Projeto', departamentos: [], semestre: null, ano: null })
  })

  it('tabela inexistente (P2021) -> 503 com mensagem de banco desatualizado', async () => {
    mockGetOrCreate.mockRejectedValue(Object.assign(new Error('table does not exist'), { code: 'P2021' }))
    const res = await GET(new Request('http://localhost/api/projects/p1/eap'), ctx)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toMatch(/banco de dados está desatualizado/)
  })

  it('documento inválido -> 422 com a mensagem de validação', async () => {
    mockGetOrCreate.mockRejectedValue(new EapValidationError('O documento deve ter uma única raiz ("1").'))
    const res = await GET(new Request('http://localhost/api/projects/p1/eap'), ctx)
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/única raiz/)
  })

  it('erro desconhecido -> 500', async () => {
    mockGetOrCreate.mockRejectedValue(new Error('boom'))
    const res = await GET(new Request('http://localhost/api/projects/p1/eap'), ctx)
    expect(res.status).toBe(500)
  })
})
