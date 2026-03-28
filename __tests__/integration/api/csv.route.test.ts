// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/csvImportService', () => ({
  importCsvRows: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    board: { findFirst: vi.fn() },
    column: { findMany: vi.fn() },
    sprint: { findMany: vi.fn() },
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
  board: { findFirst: ReturnType<typeof vi.fn> }
  column: { findMany: ReturnType<typeof vi.fn> }
  sprint: { findMany: ReturnType<typeof vi.fn> }
}

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
})

describe('POST /api/csv', () => {
  it('returns 401 when session cookie is missing', async () => {
    mockDecrypt.mockResolvedValue(null)
    const form = new FormData()
    const res = await POST(makeRequest(form))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is attached', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member' })
    const form = new FormData()
    form.set('boardId', 'b1')
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when file MIME type is not csv/plain', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member' })
    const form = new FormData()
    form.set('boardId', 'b1')
    form.set('file', new File(['data'], 'data.json', { type: 'application/json' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('returns 200 with imported count for valid CSV', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockPrisma.board.findFirst.mockResolvedValue({ id: 'b1' })
    mockPrisma.column.findMany.mockResolvedValue([{ id: 'col1', title: 'A Fazer' }])
    mockPrisma.sprint.findMany.mockResolvedValue([])
    mockImport.mockResolvedValue({ imported: 2, errors: [] })

    const csv = 'title,status\nTask 1,A Fazer\nTask 2,A Fazer'
    const form = new FormData()
    form.set('boardId', 'b1')
    form.set('file', new File([csv], 'tasks.csv', { type: 'text/csv' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported).toBe(2)
    expect(body.errors).toHaveLength(0)
  })

  it('returns 200 with errors array for partially invalid CSV', async () => {
    mockDecrypt.mockResolvedValue({ userId: 'u1', role: 'member' })
    mockPrisma.board.findFirst.mockResolvedValue({ id: 'b1' })
    mockPrisma.column.findMany.mockResolvedValue([{ id: 'col1', title: 'A Fazer' }])
    mockPrisma.sprint.findMany.mockResolvedValue([])
    mockImport.mockResolvedValue({ imported: 1, errors: [{ row: 2, message: 'Título é obrigatório' }] })

    const csv = 'title,status\nTask 1,A Fazer\n,A Fazer'
    const form = new FormData()
    form.set('boardId', 'b1')
    form.set('file', new File([csv], 'tasks.csv', { type: 'text/csv' }))
    const res = await POST(makeRequest(form, 'valid-token'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.errors.length).toBeGreaterThan(0)
  })
})
