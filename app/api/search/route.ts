import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionToken = cookieHeader.match(/session=([^;]+)/)?.[1]
  const session = await decrypt(sessionToken)
  if (!session?.userId) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return Response.json({ error: 'Consulta muito curta (mínimo 2 caracteres)' }, { status: 400 })
  }

  const cards = await prisma.card.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { responsible: { contains: q, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
        { sprint: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      responsible: true,
      color: true,
      columnId: true,
      sprintId: true,
      column: { select: { title: true } },
      sprint: { select: { name: true } },
      tags: { select: { tag: { select: { name: true, color: true } } } },
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  })

  const results = cards.slice(0, 20).map(card => ({
    id: card.id,
    title: card.title,
    description: card.description,
    responsible: card.responsible,
    color: card.color,
    column: card.column.title,
    sprint: card.sprint?.name ?? null,
    tags: card.tags.map(t => t.tag),
  }))

  return Response.json({ results })
}
