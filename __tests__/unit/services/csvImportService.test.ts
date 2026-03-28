// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    card: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { parseCsvBuffer, mapRowToCardData, importCsvRows } from '@/services/csvImportService'

const mockPrisma = prisma as {
  card: {
    findMany: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
  }
}

const columns = [
  { id: 'col-todo', title: 'A Fazer' },
  { id: 'col-doing', title: 'Em Andamento' },
  { id: 'col-done', title: 'Concluído' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parseCsvBuffer', () => {
  it('returns empty array for empty CSV', () => {
    const rows = parseCsvBuffer('')
    expect(rows).toEqual([])
  })

  it('returns correct row count for valid CSV', () => {
    const csv = 'title,description\nFix bug,Some details\nAdd feature,Another detail'
    const rows = parseCsvBuffer(csv)
    expect(rows).toHaveLength(2)
  })

  it('parses header row correctly', () => {
    const csv = 'title,responsible\nTask 1,João'
    const rows = parseCsvBuffer(csv)
    expect(rows[0]).toMatchObject({ title: 'Task 1', responsible: 'João' })
  })

  it('handles quoted fields with commas', () => {
    const csv = 'title,description\n"Task, with comma","Desc with, comma"'
    const rows = parseCsvBuffer(csv)
    expect(rows[0].title).toBe('Task, with comma')
    expect(rows[0].description).toBe('Desc with, comma')
  })
})

describe('parseCsvBuffer — Portuguese header normalization', () => {
  it('maps "Nome" header to title field', () => {
    const csv = 'Nome,Status\nCorrigir bug,A Fazer'
    const rows = parseCsvBuffer(csv)
    expect(rows[0].title).toBe('Corrigir bug')
  })

  it('maps "Descrição" header to description field', () => {
    const csv = 'Nome,Descrição\nTask,Detalhes aqui'
    const rows = parseCsvBuffer(csv)
    expect(rows[0].description).toBe('Detalhes aqui')
  })

  it('maps "Responsável" header to responsible field', () => {
    const csv = 'Nome,Responsável\nTask,Maria'
    const rows = parseCsvBuffer(csv)
    expect(rows[0].responsible).toBe('Maria')
  })

  it('maps "Data de Vencimento" header to endDate field', () => {
    const csv = 'Nome,Data de Vencimento\nTask,2026-03-31'
    const rows = parseCsvBuffer(csv)
    expect(rows[0].endDate).toBe('2026-03-31')
  })

  it('parses real-world Portuguese CSV correctly', () => {
    const csv = 'Nome,Data de Vencimento,Descrição,Prioridade,Responsável,Status,Tags\n13Q9A1H - Erro upload de PDFs,31 de março de 2026,,Alta,Marcio Piva Junior,Concluído,'
    const rows = parseCsvBuffer(csv)
    expect(rows[0].title).toBe('13Q9A1H - Erro upload de PDFs')
    expect(rows[0].responsible).toBe('Marcio Piva Junior')
    expect(rows[0].status).toBe('Concluído')
  })

  it('converts Portuguese date "31 de março de 2026" to ISO string in endDate', () => {
    const csv = 'Nome,Data de Vencimento\nTask,31 de março de 2026'
    const rows = parseCsvBuffer(csv)
    expect(rows[0].endDate).toBeTruthy()
    expect(isNaN(Date.parse(rows[0].endDate!))).toBe(false)
  })

  it('converts Portuguese date with all months correctly', () => {
    const months = [
      ['janeiro', '01'], ['fevereiro', '02'], ['março', '03'], ['abril', '04'],
      ['maio', '05'], ['junho', '06'], ['julho', '07'], ['agosto', '08'],
      ['setembro', '09'], ['outubro', '10'], ['novembro', '11'], ['dezembro', '12'],
    ]
    for (const [ptMonth, num] of months) {
      const csv = `Nome,Data de Vencimento\nTask,15 de ${ptMonth} de 2026`
      const rows = parseCsvBuffer(csv)
      expect(rows[0].endDate).toContain(`2026-${num}-15`)
    }
  })
})

describe('mapRowToCardData', () => {
  it('maps status "A Fazer" to correct columnId', () => {
    const result = mapRowToCardData({ title: 'Task', status: 'A Fazer' }, columns, [], 0)
    expect(result.columnId).toBe('col-todo')
  })

  it('maps status case-insensitively', () => {
    const result = mapRowToCardData({ title: 'Task', status: 'a fazer' }, columns, [], 0)
    expect(result.columnId).toBe('col-todo')
  })

  it('falls back to first column for unknown status', () => {
    const result = mapRowToCardData({ title: 'Task', status: 'Unknown' }, columns, [], 0)
    expect(result.columnId).toBe('col-todo')
  })

  it('uses empty string status → falls back to first column', () => {
    const result = mapRowToCardData({ title: 'Task' }, columns, [], 0)
    expect(result.columnId).toBe('col-todo')
  })

  it('maps responsible field to responsible on card', () => {
    const result = mapRowToCardData({ title: 'Task', responsible: 'Maria' }, columns, [], 0)
    expect(result.responsible).toBe('Maria')
  })

  it('sets position correctly based on index', () => {
    const result = mapRowToCardData({ title: 'Task' }, columns, [], 3)
    expect(result.position).toBe(3)
  })
})

describe('importCsvRows', () => {
  it('calls prisma.card.createMany with correct number of valid rows', async () => {
    mockPrisma.card.findMany.mockResolvedValue([])
    mockPrisma.card.createMany.mockResolvedValue({ count: 2 })

    const csv = 'title,status\nFix bug,A Fazer\nAdd feature,Em Andamento'
    const result = await importCsvRows(csv, columns, [])
    expect(result.imported).toBe(2)
    expect(mockPrisma.card.createMany).toHaveBeenCalledOnce()
  })

  it('skips invalid rows and collects errors', async () => {
    mockPrisma.card.findMany.mockResolvedValue([])
    mockPrisma.card.createMany.mockResolvedValue({ count: 1 })

    const csv = 'title,status\nValid task,A Fazer\n,A Fazer'
    const result = await importCsvRows(csv, columns, [])
    expect(result.imported).toBe(1)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].row).toBe(2)
  })

  it('sets position as maxExisting + row index', async () => {
    mockPrisma.card.findMany.mockResolvedValue([{ position: 4 }, { position: 7 }])
    mockPrisma.card.createMany.mockResolvedValue({ count: 2 })

    const csv = 'title\nTask 1\nTask 2'
    await importCsvRows(csv, columns, [])
    const createCall = mockPrisma.card.createMany.mock.calls[0][0]
    expect(createCall.data[0].position).toBe(8)
    expect(createCall.data[1].position).toBe(9)
  })

  it('returns empty imported and no errors for empty CSV', async () => {
    mockPrisma.card.findMany.mockResolvedValue([])
    const result = await importCsvRows('', columns, [])
    expect(result.imported).toBe(0)
    expect(result.errors).toHaveLength(0)
  })
})
