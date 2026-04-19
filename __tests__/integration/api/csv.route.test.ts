// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/csvImportService', () => ({
  importCsvRows: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    sprintColumn: { findMany: vi.fn() },
    sprint: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/session', () => ({
  decrypt: vi.fn(),
}))

import { POST } from '@/app/api/csv/route'
import { importCsvRows } from '@/services/csvImportService'
import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'

const mockImport = importCsvRows as ReturnType<typeof vi.fn>
const mockDecrypt = decrypt as ReturnType<typeof vi.fn>
const mockPrisma = prisma as {
  sprintColumn: { findMany: ReturnType<typeof vi.fn> }
  sprint: { findUnique: ReturnType<typeof vi.fn> }
  user: { findUnique: ReturnType<typeof vi.fn> }
}

const MOCK_SPRINT = { id: 's1', name: 'Sprint 1', project: { tenantId: 't1' } }

function makeRequest(body: FormData, sessionToken?: string): Request {
  const headers: Record<string, string> = {}
  if (sessionToken) headers['cookie'] = `session=${sessionToken}`
  return new Request('http://localhost/api/csv', {
    method: 'POST',
    body,
    headers,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDecrypt.mockResolvedValue({ userId: 'u1', tenantId: 't1' })
  mockPrisma.user.findUnique.mockResolvedValue({ tokenVersion: 0, isActive: true, deletedAt: null })
})

describe('POST /api/csv', () => {
  it('returns 401 when session cookie is missing', async () => {
    mockDecrypt.mockResolvedValue(null)
    const form = new FormData()
    const res = await POST(makeRequest(form))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is attached', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    const form = new FormData()
    form.set('sprintId', 's1')
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when file MIME type is not csv/plain', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    const form = new FormData()
    form.set('sprintId', 's1')
    form.set('file', new File(['data'], 'data.json', { type: 'application/json' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 200 with imported count for valid CSV', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    mockPrisma.sprint.findUnique.mockResolvedValue(MOCK_SPRINT)
    mockPrisma.sprintColumn.findMany.mockResolvedValue([{ id: 'col1', title: 'A Fazer' }])
    mockImport.mockResolvedValue({ imported: 2, errors: [] })

    const csv = 'title,status\nTask 1,A Fazer\nTask 2,A Fazer'
    const form = new FormData()
    form.set('sprintId', 's1')
    form.set('file', new File([csv], 'tasks.csv', { type: 'text/csv' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(2)
    expect(body.errors).toHaveLength(0)
  })

  it('returns 200 with errors array for partially invalid CSV', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member', tenantId: 't1' })
    mockPrisma.sprint.findUnique.mockResolvedValue(MOCK_SPRINT)
    mockPrisma.sprintColumn.findMany.mockResolvedValue([{ id: 'col1', title: 'A Fazer' }])
    mockImport.mockResolvedValue({ imported: 1, errors: [{ row: 2, message: 'Título é obrigatório' }] })

    const csv = 'title,status\nTask 1,A Fazer\n,A Fazer'
    const form = new FormData()
    form.set('sprintId', 's1')
    form.set('file', new File([csv], 'tasks.csv', { type: 'text/csv' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.errors.length).toBeGreaterThan(0)
  })
})
