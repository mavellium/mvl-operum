vi.mock('@/services/authz', () => ({ projetosAutorizados: vi.fn().mockResolvedValue(['p1']), can: vi.fn().mockResolvedValue(true) }))
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/routeAuth', () => ({ verifyRouteSession: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ cardsApi: { search: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findMany: vi.fn() },
    userProject: { findMany: vi.fn() },
  },
}))

import { verifyRouteSession } from '@/lib/routeAuth'
import { cardsApi } from '@/lib/api-client'
import prisma from '@/lib/prisma'
import { GET } from '@/app/api/search/route'

const db = prisma as unknown as {
  project: { findMany: ReturnType<typeof vi.fn> }
  userProject: { findMany: ReturnType<typeof vi.fn> }
}

function req(q: string) {
  return new Request(`http://localhost/api/search?q=${q}&context=project_items&contextId=p1&sprintId=s-atual`)
}

function card(id: string, sprint: { id: string; name: string; status?: string } | null, extra = {}) {
  return { id, title: `Card ${id}`, sprint, sprintColumn: { id: 'c', title: 'A Fazer' }, tags: [], ...extra }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyRouteSession).mockResolvedValue({ userId: 'u1', tenantId: 't1' } as never)
  db.project.findMany.mockResolvedValue([])
  db.userProject.findMany.mockResolvedValue([])
})

describe('GET /api/search — busca unificada do projeto', () => {
  it('busca em todo o projeto e põe a sprint atual primeiro, depois outras sprints e backlog', async () => {
    vi.mocked(cardsApi.search).mockResolvedValue([
      card('backlog', null),
      card('outra', { id: 's-velha', name: 'Sprint 0', status: 'COMPLETED' }),
      card('atual', { id: 's-atual', name: 'Sprint 1', status: 'ACTIVE' }),
    ] as never)

    const { results } = await (await GET(req('bug'))).json()

    expect(vi.mocked(cardsApi.search).mock.calls[0]).toEqual(['bug', { inProjectId: 'p1' }])
    expect(results.map((r: { id: string; group: string }) => [r.id, r.group])).toEqual([
      ['atual', 'sprint_atual'],
      ['outra', 'outras_sprints'],
      ['backlog', 'backlog'],
    ])
    expect(results[1]).toMatchObject({ sprint: 'Sprint 0', sprintStatus: 'COMPLETED', sprintColumn: 'A Fazer' })
  })

  it('traz responsáveis, prioridade e tempo registrado do card', async () => {
    vi.mocked(cardsApi.search).mockResolvedValue([
      card('c1', { id: 's-atual', name: 'Sprint 1' }, {
        priority: 'alta',
        responsibles: [{ user: { id: 'u2', name: 'Ana' } }],
        timeEntries: [{ duration: 3600 }, { duration: 600 }],
      }),
    ] as never)

    const { results } = await (await GET(req('c1'))).json()
    expect(results[0]).toMatchObject({ priority: 'alta', responsibles: ['Ana'], tempoSegundos: 4200 })
  })

  it('pessoa encontrada traz também os cards em que ela é responsável, sem repetir', async () => {
    db.userProject.findMany.mockResolvedValue([
      { user: { id: 'u9', name: 'Márcio', email: 'm@x', cargo: null, avatarUrl: null } },
    ])
    vi.mocked(cardsApi.search).mockImplementation((async (q: string) =>
      q === ''
        ? [card('do-marcio', { id: 's-velha', name: 'Sprint 0' }), card('ja-listado', null)]
        : [card('ja-listado', null)]) as never)

    const { results } = await (await GET(req('marcio'))).json()

    expect(vi.mocked(cardsApi.search)).toHaveBeenCalledWith('', { inProjectId: 'p1', responsibleUserId: 'u9' })
    expect(results.map((r: { id: string; group: string }) => [r.id, r.group])).toEqual([
      ['ja-listado', 'backlog'],
      ['do-marcio', 'cards_pessoa'],
      ['u9', 'pessoa'],
    ])
    expect(results[1].personName).toBe('Márcio')
  })

  it('falha do sprint-service não derruba projetos e pessoas', async () => {
    vi.mocked(cardsApi.search).mockRejectedValue(new Error('500'))
    db.project.findMany.mockResolvedValue([{ id: 'p2', name: 'Fechai', description: null }])
    const { results } = await (await GET(req('fe'))).json()
    expect(results).toEqual([expect.objectContaining({ id: 'p2', type: 'project' })])
  })
})
