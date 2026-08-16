import { verifyRouteSession } from '@/lib/routeAuth'
import { cardsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'

interface CardSearchHit {
  id: string
  title: string
  description?: string | null
  color?: string | null
  priority?: string | null
  sprint?: { id: string; name: string } | null
  sprintColumn?: { id: string; title: string } | null
  tags?: { tag: { id: string; name: string; color: string } }[]
}

export async function GET(request: Request) {
  const session = await verifyRouteSession(request)
  if (!session?.userId) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const context = url.searchParams.get('context')
  const contextId = url.searchParams.get('contextId')
  if (q.length < 2) {
    return Response.json({ error: 'Consulta muito curta (mínimo 2 caracteres)' }, { status: 400 })
  }

  try {
    // Prioridade do spec: tarefas da sprint atual → outras sprints/projetos → projetos → pessoas.
    if (context === 'global_projects') {
      const projects = await prisma.project.findMany({
        where: {
          tenantId: session.tenantId as string,
          deletedAt: null,
          status: 'ACTIVE',
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, description: true },
        take: 20,
        orderBy: { updatedAt: 'desc' },
      })
      const results = projects.map(p => ({
        id: p.id,
        title: p.name,
        description: p.description,
        type: 'project',
      }))
      return Response.json({ results })
    }

    if (context === 'project_members' && contextId) {
      const members = await prisma.userProject.findMany({
        where: {
          projectId: contextId,
          active: true,
          user: {
            tenantId: session.tenantId as string,
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        select: { user: { select: { id: true, name: true, email: true, cargo: true, avatarUrl: true } } },
        take: 20,
      })
      const results = members.map(m => ({
        id: m.user.id,
        title: m.user.name,
        description: m.user.cargo ?? m.user.email,
        type: 'member',
        avatarUrl: m.user.avatarUrl,
        projectId: contextId,
      }))
      return Response.json({ results })
    }

    const opts: { sprintId?: string; projectId?: string } = {}
    if (context === 'sprint_items' && contextId) opts.sprintId = contextId
    else if (context === 'project_items' && contextId) opts.projectId = contextId

    const hits = await cardsApi.search(q, opts) as unknown as CardSearchHit[]
    const results = hits.map(c => ({
      id: c.id,
      title: c.title,
      type: 'card',
      description: c.description ?? '',
      color: c.color ?? '#3b82f6',
      sprintId: c.sprint?.id,
      sprint: c.sprint?.name ?? null,
      sprintColumn: c.sprintColumn?.title ?? null,
      tags: c.tags?.map(t => t.tag) ?? [],
    }))
    return Response.json({ results })
  } catch {
    return Response.json({ results: [] })
  }
}