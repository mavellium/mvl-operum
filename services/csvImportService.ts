import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import prisma from '@/lib/prisma'
import { CsvRowSchema } from '@/lib/validation/csvSchemas'

export interface ColumnRef {
  id: string
  title: string
}

export interface SprintRef {
  id: string
  name: string
}

export interface ImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

const PT_MONTHS: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
}

// "31 de março de 2026" → "2026-03-31"
function normalizePortugueseDate(value: string): string {
  const m = value.trim().toLowerCase().match(/^(\d{1,2})\s+de\s+(.+?)\s+de\s+(\d{4})$/)
  if (!m) return value
  const [, day, month, year] = m
  const monthNum = PT_MONTHS[month.trim()]
  if (!monthNum) return value
  return `${year}-${monthNum}-${day.padStart(2, '0')}`
}

const DATE_FIELDS = new Set(['startDate', 'endDate'])

// Maps common Portuguese/alternate header names to schema keys
const HEADER_MAP: Record<string, string> = {
  nome: 'title',
  título: 'title',
  titulo: 'title',
  tarefa: 'title',
  descrição: 'description',
  descricao: 'description',
  responsável: 'responsible',
  responsavel: 'responsible',
  'data de vencimento': 'endDate',
  'data final': 'endDate',
  'data de fim': 'endDate',
  'data de início': 'startDate',
  'data de inicio': 'startDate',
  'data inicial': 'startDate',
  cor: 'color',
  etiquetas: 'tags',
  // lowercase exact-match passthrough handled below
}

function normalizeHeaders(rows: Record<string, string>[]): Record<string, string>[] {
  if (rows.length === 0) return rows
  return rows.map(row => {
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(row)) {
      const lower = key.trim().toLowerCase()
      const mappedKey = HEADER_MAP[lower] ?? lower
      const normalizedValue = DATE_FIELDS.has(mappedKey) && value ? normalizePortugueseDate(value) : value
      normalized[mappedKey] = normalizedValue
    }
    return normalized
  })
}

export function parseCsvBuffer(csv: string): Record<string, string>[] {
  if (!csv.trim()) return []
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })
  return normalizeHeaders(result.data)
}

export function mapRowToCardData(
  row: Record<string, string | undefined>,
  columns: ColumnRef[],
  sprints: SprintRef[],
  index: number,
  basePosition = 0,
) {
  const status = (row.status ?? '').trim().toLowerCase()
  const matchedColumn =
    columns.find((col) => col.title.toLowerCase().includes(status) || status.includes(col.title.toLowerCase())) ??
    columns[0]

  const sprintName = (row.sprint ?? '').trim().toLowerCase()
  const matchedSprint = sprints.find((s) => s.name.toLowerCase() === sprintName)

  return {
    id: uuidv4(),
    title: (row.title ?? '').trim(),
    description: (row.description ?? '').trim(),
    responsible: (row.responsible ?? '').trim(),
    color: (row.color ?? '#6b7280').trim(),
    position: basePosition + index,
    columnId: matchedColumn.id,
    sprintId: matchedSprint?.id ?? null,
    tagsImport: (row.tags ?? '').trim(),
    startDate: row.startDate ? new Date(row.startDate) : null,
    endDate: row.endDate ? new Date(row.endDate) : null,
  }
}

export async function importCsvRows(
  csv: string,
  columns: ColumnRef[],
  sprints: SprintRef[],
): Promise<ImportResult> {
  const rows = parseCsvBuffer(csv)
  if (rows.length === 0) return { imported: 0, errors: [] }

  const existingCards = await prisma.card.findMany({
    where: { columnId: { in: columns.map((c) => c.id) } },
    select: { position: true },
    orderBy: { position: 'desc' },
  })
  const maxPosition = existingCards.length > 0 ? Math.max(...existingCards.map((c) => c.position)) : -1

  const validCards: ReturnType<typeof mapRowToCardData>[] = []
  const errors: { row: number; message: string }[] = []

  rows.forEach((row, i) => {
    const parsed = CsvRowSchema.safeParse(row)
    if (!parsed.success) {
      errors.push({ row: i + 1, message: parsed.error.issues[0].message })
      return
    }
    validCards.push(mapRowToCardData(row, columns, sprints, validCards.length, maxPosition + 1))
  })

  if (validCards.length > 0) {
    await prisma.card.createMany({ data: validCards })
  }

  return { imported: validCards.length, errors }
}
