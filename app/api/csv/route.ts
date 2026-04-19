import { verifyRouteSession } from '@/lib/routeAuth'
import { importCsvRows } from '@/services/csvImportService'
import prisma from '@/lib/prisma'

const ALLOWED_CSV_TYPES = ['text/csv', 'text/plain']

export async function POST(request: Request) {
  const session = await verifyRouteSession(request)
  if (!session?.userId) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const sprintId = formData.get('sprintId') as string | null
  const file = formData.get('file') as File | null

  if (!file) {
    return Response.json({ error: 'Arquivo CSV é obrigatório' }, { status: 400 })
  }

  if (!ALLOWED_CSV_TYPES.includes(file.type)) {
    return Response.json({ error: 'Tipo de arquivo inválido. Use um arquivo .csv' }, { status: 400 })
  }

  if (!sprintId) {
    return Response.json({ error: 'sprintId é obrigatório' }, { status: 400 })
  }

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
  if (!sprint) {
    return Response.json({ error: 'Sprint não encontrado' }, { status: 404 })
  }

  const sprintColumns = await prisma.sprintColumn.findMany({
    where: { sprintId },
    select: { id: true, title: true },
    orderBy: { position: 'asc' },
  })

  if (sprintColumns.length === 0) {
    return Response.json({ error: 'Sprint não tem colunas. Abra a sprint antes de importar.' }, { status: 400 })
  }

  const csvText = await file.text()
  const result = await importCsvRows(csvText, sprintId, sprintColumns)

  return Response.json(result, { status: 200 })
}
