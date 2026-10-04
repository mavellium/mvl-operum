import { verifyRouteSession } from '@/lib/routeAuth'
import { cardsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'
import { projetosAutorizados, can } from '@/services/authz'
import { grupoDoCard, ordenarPorGrupo, tempoTotal, type SearchGroup } from '@/lib/searchGroups'

interface CardSearchHit {
  id: string
  title: string
  description?: string | null
  color?: string | null
  priority?: string | null
  sprint?: { id: string; name: string; status?: string | null } | null
  sprintColumn?: { id: string; title: string } | null
  tags?: { tag: { id: string; name: string; color: string } }[]
  responsibles?: { user?: { id: string; name: string } | null }[]
  timeEntries?: { duration?: number | null }[]
}

/** Quantas pessoas encontradas também têm os seus cards listados ("cards de <pessoa>"). */
const MAX_PESSOAS_COM_CARDS = 3

function toCardResult(c: CardSearchHit, group: SearchGroup, projectId?: string) {
  return {
    id: c.id,
    title: c.title,
    type: 'card' as const,
    group,
    description: c.description ?? '',
    color: c.color ?? '#3b82f6',
    sprintId: c.sprint?.id,
    sprint: c.sprint?.name ?? null,
    sprintStatus: c.sprint?.status ?? null,
    sprintColumn: c.sprintColumn?.title ?? null,
    priority: c.priority ?? null,
    responsibles: (c.responsibles ?? []).flatMap(r => (r.user ? [r.user.name] : [])),
    tempoSegundos: tempoTotal(c.timeEntries),
    tags: c.tags?.map(t => t.tag) ?? [],
    ...(projectId ? { projectId } : {}),
  }
}

function searchProjects(tenantId: string, q: string, take: number, projectIds: string[]) {
  return prisma.project.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: 'ACTIVE',
      id: { in: projectIds },
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, description: true },
    take,
    orderBy: { updatedAt: 'desc' },
  })
}

function searchMembers(tenantId: string, projectId: string, q: string, take: number) {
  return prisma.userProject.findMany({
    where: {
      projectId,
      active: true,
      user: {
        tenantId,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
    },
    select: { user: { select: { id: true, name: true, email: true, cargo: true, avatarUrl: true } } },
    take,
  })
}

/**
 * Busca unificada dentro de um projeto: cards da sprint atual → outras sprints →
 * backlog → cards das pessoas encontradas → projetos → pessoas.
 */
async function unifiedProjectSearch(tenantId: string, projectId: string, q: string, currentSprintId: string | null, projectIds: string[]) {
  const [cards, projects, members] = await Promise.all([
    (cardsApi.search(q, { inProjectId: projectId }) as unknown as Promise<CardSearchHit[]>).catch(() => []),
    searchProjects(tenantId, q, 5, projectIds).catch(() => []),
    searchMembers(tenantId, projectId, q, 5).catch(() => []),
  ])

  const cardResults = cards.map(c => toCardResult(c, grupoDoCard(c, currentSprintId), projectId))
  const jaListados = new Set(cardResults.map(c => c.id))

  const cardsDasPessoas = (
    await Promise.all(
      members.slice(0, MAX_PESSOAS_COM_CARDS).map(async m => {
        const hits = await (cardsApi.search('', { inProjectId: projectId, responsibleUserId: m.user.id }) as unknown as Promise<CardSearchHit[]>)
          .catch(() => [])
        return hits.map(c => ({ ...toCardResult(c, 'cards_pessoa', projectId), personName: m.user.name }))
      }),
    )
  )
    .flat()
    .filter(c => {
      // Card que já apareceu pelo texto não se repete no grupo da pessoa.
      if (jaListados.has(c.id)) return false
      jaListados.add(c.id)
      return true
    })

  return ordenarPorGrupo([
    ...cardResults,
    ...cardsDasPessoas,
    ...projects.map(p => ({ id: p.id, title: p.name, description: p.description, type: 'project' as const, group: 'projeto' as const })),
    ...members.map(m => ({
      id: m.user.id,
      title: m.user.name,
      description: m.user.cargo ?? m.user.email,
      type: 'member' as const,
      group: 'pessoa' as const,
      avatarUrl: m.user.avatarUrl,
      projectId,
    })),
  ])
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
  const currentSprintId = url.searchParams.get('sprintId')
  if (q.length < 2) {
    return Response.json({ error: 'Consulta muito curta (mínimo 2 caracteres)' }, { status: 400 })
  }
  const tenantId = session.tenantId as string

  try {
    const authz = { userId: session.userId as string, tenantId, role: session.role as string }
    const projectIds = await projetosAutorizados(authz)
    if ((context === 'project_items' || context === 'project_members') && contextId && !(await can(authz, contextId, 'projeto:ver'))) return Response.json({ error: 'Sem permissão' }, { status: 403 })
    if (context === 'project_items' && contextId) {
      return Response.json({ results: await unifiedProjectSearch(tenantId, contextId, q, currentSprintId, projectIds) })
    }

    if (context === 'global_projects') {
      const projects = await searchProjects(tenantId, q, 20, projectIds)
      return Response.json({
        results: projects.map(p => ({ id: p.id, title: p.name, description: p.description, type: 'project' })),
      })
    }

    if (context === 'project_members' && contextId) {
      const members = await searchMembers(tenantId, contextId, q, 20)
      return Response.json({
        results: members.map(m => ({
          id: m.user.id,
          title: m.user.name,
          description: m.user.cargo ?? m.user.email,
          type: 'member',
          avatarUrl: m.user.avatarUrl,
          projectId: contextId,
        })),
      })
    }

    const opts: { sprintId?: string } = {}
    if (context === 'sprint_items' && contextId) opts.sprintId = contextId

    const hits = await cardsApi.search(q, opts) as unknown as CardSearchHit[]
    return Response.json({ results: hits.map(c => toCardResult(c, grupoDoCard(c, opts.sprintId))) })
  } catch {
    return Response.json({ results: [] })
  }
}
