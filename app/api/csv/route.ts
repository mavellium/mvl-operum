import { cookies } from 'next/headers'
import { decrypt } from '@/lib/session'
import { importCsvRows } from '@/services/csvImportService'
import prisma from '@/lib/prisma'

const ALLOWED_CSV_TYPES = ['text/csv', 'text/plain']

export async function POST(request: Request) {
  // Auth check
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionToken = cookieHeader.match(/session=([^;]+)/)?.[1]
  const session = await decrypt(sessionToken)
  if (!session?.userId) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const boardId = formData.get('boardId') as string | null
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'Arquivo CSV é obrigatório' }, { status: 400 })
  }

  if (!ALLOWED_CSV_TYPES.includes(file.type)) {
    return Response.json({ error: 'Tipo de arquivo inválido. Use um arquivo .csv' }, { status: 400 })
  }

  // Load board columns and sprints
  const board = await prisma.board.findFirst({ where: boardId ? { id: boardId } : undefined })
  const columns = await prisma.column.findMany({
    where: { boardId: board?.id },
    select: { id: true, title: true },
    orderBy: { position: 'asc' },
  })
  const sprints = await prisma.sprint.findMany({
    where: { boardId: board?.id },
    select: { id: true, name: true },
  })

  const csvText = await file.text()
  const result = await importCsvRows(csvText, columns, sprints)

  return Response.json(result, { status: 200 })
}
