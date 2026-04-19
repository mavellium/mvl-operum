import { verifyRouteSession } from '@/lib/routeAuth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await verifyRouteSession(request)
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
      sprint: { project: { tenantId: session.tenantId as string } },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
        { sprint: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      color: true,
      sprintId: true,
      sprint: { select: { name: true } },
      sprintColumn: { select: { title: true } },
      tags: { select: { tag: { select: { name: true, color: true } } } },
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  })

  const results = cards.map(card => ({
    id: card.id,
    title: card.title,
    description: card.description,
    color: card.color,
    sprintId: card.sprintId,
    sprint: card.sprint?.name ?? null,
    sprintColumn: card.sprintColumn?.title ?? null,
    tags: card.tags.map(t => t.tag),
  }))

  return Response.json({ results })
}
