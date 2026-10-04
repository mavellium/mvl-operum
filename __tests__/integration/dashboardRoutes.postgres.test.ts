// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { SignJWT } from 'jose'
import { NestFactory, Reflector } from '../../sprint-service/node_modules/@nestjs/core/index.js'
import type { INestApplication } from '../../sprint-service/node_modules/@nestjs/common/index.js'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { DashboardModule } from '../../sprint-service/src/dashboard/dashboard.module'
import { CardModule } from '../../sprint-service/src/card/card.module'
import { InternalAuthGuard } from '../../sprint-service/src/guards/internal-auth.guard'
import { createGatewayApp } from '../../api-gateway/src/app'
import { POST as authorize } from '@/app/api/internal/authorize/route'
import { prisma as sprintDb } from '../../sprint-service/src/prisma'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn().mockResolvedValue({ userId: 'session', tenantId: 'session', role: 'member' }) }))
vi.mock('../../sprint-service/src/prisma', async () => {
  const { PrismaClient } = await import('../../sprint-service/lib/generated/prisma/index.js')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { Pool } = await import('pg')
  return { prisma: new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })) }) }
})
const testUrl = process.env.OPERUM_DASHBOARD_TEST_DATABASE_URL
let nest: INestApplication, authServer: Server, gateway: Server
let base: string, token: string, tenantId: string, userId: string, projectId: string, sprintId: string, hiddenSprintId: string, foreignSprintId: string, foreignProjectId: string
let actions: typeof import('@/app/actions/dashboard')
const key = 'dashboard-integration-test-key'
const secret = 'dashboard-integration-test-signing-secret'
async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Porta local não encontrada')
  return `http://127.0.0.1:${address.port}`
}
async function sign(user: string, tenant: string) {
  return new SignJWT({ userId: user, tenantId: tenant, role: 'member', tokenVersion: 0 }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret))
}
async function get(path: string, headers: Record<string, string> = {}) {
  return fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}`, ...headers } })
}

describe.skipIf(!testUrl)('BFF → gateway real → controller real → PostgreSQL', () => {
  beforeAll(async () => {
    const url = new URL(testUrl!)
    if (url.pathname !== '/operum_dashboard_test' || !['localhost', '127.0.0.1'].includes(url.hostname) || process.env.DATABASE_URL !== testUrl) throw new Error('Use exclusivamente o banco local operum_dashboard_test com as duas variáveis iguais')
    vi.stubEnv('INTERNAL_API_KEY', key)
    vi.stubEnv('SESSION_SECRET', secret)
    nest = await NestFactory.create({ module: DashboardModule, imports: [CardModule] }, { logger: false })
    nest.useGlobalGuards(new InternalAuthGuard(nest.get(Reflector)))
    await nest.listen(0, '127.0.0.1')
    vi.stubEnv('SPRINT_SERVICE_URL', await nest.getUrl())
    authServer = createServer(async (req, res) => {
      let body = ''
      for await (const chunk of req) body += chunk
      const result = await authorize(new Request('http://internal/api/internal/authorize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-internal-api-key': String(req.headers['x-internal-api-key'] ?? '') }, body }))
      res.writeHead(result.status, { 'Content-Type': 'application/json' })
      res.end(await result.text())
    })
    vi.stubEnv('AUTHORIZATION_SERVICE_URL', await listen(authServer))
    gateway = createServer(createGatewayApp())
    base = await listen(gateway)
    vi.stubEnv('API_GATEWAY_INTERNAL_URL', base)
    actions = await import('@/app/actions/dashboard')
  })
  beforeEach(async () => {
    const id = randomUUID()
    tenantId = (await prisma.tenant.create({ data: { name: id, subdomain: `dashboard-${id}` } })).id
    const foreignTenant = (await prisma.tenant.create({ data: { name: id, subdomain: `dashboard-foreign-${id}` } })).id
    const user = await prisma.user.create({ data: { tenantId, name: 'Alice', email: `${id}@alice.test`, passwordHash: 'test', hourlyRate: 100, cargo: 'Engenheira' } })
    userId = user.id
    const other = await prisma.user.create({ data: { tenantId, name: 'Bruno', email: `${id}@bruno.test`, passwordHash: 'test', hourlyRate: 50 } })
    const foreign = await prisma.user.create({ data: { tenantId: foreignTenant, name: 'Outro tenant', email: `${id}@foreign.test`, passwordHash: 'test', hourlyRate: 1000 } })
    projectId = (await prisma.project.create({ data: { tenantId, name: `Visível ${id}` } })).id
    const hiddenProject = (await prisma.project.create({ data: { tenantId, name: `Privado ${id}` } })).id
    foreignProjectId = (await prisma.project.create({ data: { tenantId: foreignTenant, name: id } })).id
    await prisma.userProject.createMany({ data: [{ projectId, userId }, { projectId, userId: other.id }] })
    sprintId = (await prisma.sprint.create({ data: { projectId, name: 'Sprint autorizada', qualidade: 4, dificuldade: 3 } })).id
    hiddenSprintId = (await prisma.sprint.create({ data: { projectId: hiddenProject, name: 'Sprint privada' } })).id
    foreignSprintId = (await prisma.sprint.create({ data: { projectId: foreignProjectId, name: 'Sprint estrangeira' } })).id
    const done = await prisma.sprintColumn.create({ data: { sprintId, title: 'Concluído', position: 1 } })
    const todo = await prisma.sprintColumn.create({ data: { sprintId, title: 'A Fazer', position: 0 } })
    const past = new Date('2020-01-01')
    const completed = await prisma.card.create({ data: { sprintId, title: 'Concluído atrasado', sprintColumnId: done.id, endDate: past } })
    const overdue = await prisma.card.create({ data: { sprintId, title: 'Atrasado', sprintColumnId: todo.id, endDate: past } })
    const backlog = await prisma.card.create({ data: { projectId, title: 'Backlog', endDate: past } })
    const hidden = await prisma.card.create({ data: { sprintId: hiddenSprintId, title: 'Privado' } })
    const foreignCard = await prisma.card.create({ data: { sprintId: foreignSprintId, title: 'Outro tenant' } })
    const deleted = await prisma.card.create({ data: { sprintId, title: 'Excluído', deletedAt: new Date() } })
    await prisma.card.create({ data: { sprintId, projectId: foreignProjectId, title: 'Vínculo inconsistente' } })
    const foreignColumn = await prisma.sprintColumn.create({ data: { sprintId: foreignSprintId, title: 'Coluna confidencial', position: 0 } })
    await prisma.card.create({ data: { sprintId, sprintColumnId: foreignColumn.id, title: 'Coluna inconsistente' } })
    await prisma.cardResponsible.createMany({ data: [{ cardId: overdue.id, userId }, { cardId: completed.id, userId }, { cardId: overdue.id, userId: foreign.id }] })
    await prisma.timeEntry.createMany({ data: [
      { cardId: completed.id, userId, duration: 3600 }, { cardId: overdue.id, userId: other.id, duration: 1800 }, { cardId: backlog.id, userId, duration: 900 },
      { cardId: hidden.id, userId, duration: 7200 }, { cardId: foreignCard.id, userId: foreign.id, duration: 7200 }, { cardId: deleted.id, userId, duration: 3600 },
      { cardId: overdue.id, userId, duration: 3600, deletedAt: new Date() }, { cardId: overdue.id, userId: foreign.id, duration: 99999 },
    ] })
    await prisma.sprintFeedback.createMany({ data: [{ sprintId, userId, qualidade: 4, dificuldade: 2, tarefasRealizadas: 'Implementação' }, { sprintId, userId: other.id, qualidade: 2, dificuldade: 4 }, { sprintId, userId: foreign.id, qualidade: 99, dificuldade: 99 }] })
    token = await sign(userId, tenantId)
    vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: token }) } as never)
  })
  afterAll(async () => {
    await Promise.all([nest?.close(), ...[gateway, authServer].filter(Boolean).map(server => new Promise<void>(resolve => server.close(() => resolve()))), prisma.$disconnect(), sprintDb.$disconnect()])
    vi.unstubAllEnvs()
  })

  it('página de tarefas passa pelo gateway/controller/banco reais com escopo de projeto e limit', async () => {
    const first = await get(`/cards/page?projectId=${projectId}&limit=2`, { 'x-authorized-projects': foreignProjectId })
    expect(first.status).toBe(200)
    const page = await first.json()
    expect(page.total).toBe(3)
    expect(page.items).toHaveLength(2)
    expect(page.items.every((card: { title: string }) => !/Privado|inconsistente|tenant|Excluído/.test(card.title))).toBe(true)
    const next = await get(`/cards/page?projectId=${projectId}&limit=2&cursor=${encodeURIComponent(page.next_cursor)}`)
    expect(next.status).toBe(200)
    const last = await next.json()
    expect(last.items).toHaveLength(1)
    expect(last.next_cursor).toBeNull()
    expect(new Set([...page.items, ...last.items].map(card => card.id)).size).toBe(3)
    expect((await get(`/cards/page?sprintId=${sprintId}&limit=1`)).status).toBe(200)
    expect((await get(`/cards/page?projectId=${projectId}&limit=201`)).status).toBe(400)
  })

  it('página recusa credencial ausente, sprint/projeto privados, cursor de outros filtros e revogação', async () => {
    expect((await fetch(`${base}/cards/page?projectId=${projectId}`)).status).toBe(401)
    expect((await get(`/cards/page?sprintId=${hiddenSprintId}`)).status).toBe(403)
    expect((await get(`/cards/page?projectId=${foreignProjectId}`)).status).toBe(403)
    expect((await get(`/cards/page?projectId=${projectId}&sprintId=${foreignSprintId}`)).status).toBe(403)
    const first = await (await get(`/cards/page?projectId=${projectId}&limit=1`)).json()
    expect((await get(`/cards/page?projectId=${projectId}&q=diferente&cursor=${encodeURIComponent(first.next_cursor)}`)).status).toBe(400)
    await prisma.userProject.deleteMany({ where: { projectId, userId } })
    expect((await get(`/cards/page?projectId=${projectId}`)).status).toBe(403)
  })

  it('global usa contrato completo e soma só registros autorizados', async () => {
    const result = await actions.getDashboardDataAction()
    if ('error' in result) throw new Error(result.error)
    expect(result.kpis).toEqual({ totalSprints: 1, totalCards: 3, horasTotais: 1.75, custoTotal: 150 })
    expect(result.sprintMetrics[0]).toMatchObject({ id: sprintId, cardsTotal: 2, cardsConcluidos: 1, horasTotais: 1.5, custoTotal: 125 })
    expect(result.overdueCards.map(card => card.title).sort()).toEqual(['Atrasado', 'Backlog'])
    expect(result.userMetrics[0]).toMatchObject({ id: userId, cargo: 'Engenheira', horasTotais: 1.25, custoTotal: 125 })
    expect(result.memberMetrics.find(user => user.id === userId)).toMatchObject({ cardsTotal: 2, cardsConcluidos: 1, cardsAtrasados: 1 })
    expect(result.overdueCards[0].responsibles.every(responsible => responsible.user.name !== 'Outro tenant')).toBe(true)
    expect((await actions.getSprintsWithMetricsAction())).toEqual(result.sprintMetrics)
  })
  it('sprint agrega colunas, horas, feedbacks e médias pelo controller real', async () => {
    const result = await actions.getSprintDashboardAction(sprintId)
    if ('error' in result) throw new Error(result.error)
    expect(result.metrics).toEqual({ horasTotais: 1.5, custoTotal: 125, cardsTotal: 2, cardsConcluidos: 1, cardsAtrasados: 1 })
    expect(result.sprint).toMatchObject({ id: sprintId, projectId, qualidade: 4, dificuldade: 3 })
    expect(result.cardsByColumn).toEqual([{ name: 'A Fazer', count: 1 }, { name: 'Concluído', count: 1 }])
    expect(result.feedbacks).toHaveLength(2)
    expect(result.avgQualidade).toBe(3)
    expect(result.avgDificuldade).toBe(3)
  })
  it('global vazio retorna zeros/listas vazias; sprint vazia retorna médias nulas', async () => {
    const emptyUser = await prisma.user.create({ data: { tenantId, name: 'Vazio', email: `${randomUUID()}@empty.test`, passwordHash: 'test' } })
    token = await sign(emptyUser.id, tenantId)
    const empty = await actions.getDashboardDataAction()
    expect(empty).toEqual({ kpis: { totalSprints: 0, totalCards: 0, horasTotais: 0, custoTotal: 0 }, userMetrics: [], memberMetrics: [], overdueCards: [], sprintMetrics: [] })
    const emptyProject = await prisma.project.create({ data: { tenantId, name: randomUUID() } })
    await prisma.userProject.create({ data: { projectId: emptyProject.id, userId: emptyUser.id } })
    const sprint = await prisma.sprint.create({ data: { projectId: emptyProject.id, name: 'Vazia' } })
    expect(await actions.getSprintDashboardAction(sprint.id)).toMatchObject({ metrics: { horasTotais: 0, custoTotal: 0, cardsTotal: 0, cardsConcluidos: 0, cardsAtrasados: 0 }, cardsByColumn: [], overdueCards: [], userMetrics: [], feedbacks: [], avgQualidade: null, avgDificuldade: null })
  })
  it('retorna status 403 para projeto privado/tenant estrangeiro e 401 sem token', async () => {
    expect((await get(`/sprints/${hiddenSprintId}/dashboard`)).status).toBe(403)
    expect((await get(`/sprints/${foreignSprintId}/dashboard`)).status).toBe(403)
    expect((await fetch(`${base}/dashboard/global`)).status).toBe(401)
    expect((await get(`/sprints/${sprintId}/dashboard`)).status).toBe(200)
  })
  it('header de escopo forjado não altera a lista autorizada', async () => {
    const result = await (await get('/dashboard/global', { 'x-authorized-projects': foreignProjectId, 'x-tenant-id': 'forjado' })).json()
    expect(result.kpis.totalCards).toBe(3)
    expect(result.kpis.custoTotal).toBe(150)
  })
  it('revogação de leitura de custos impede exposição nas duas rotas', async () => {
    const permission = await prisma.permission.upsert({ where: { resource_action: { resource: 'planilha', action: 'ver' } }, create: { name: randomUUID(), resource: 'planilha', action: 'ver' }, update: {} })
    await prisma.userPermission.create({ data: { userId, projectId, permissionId: permission.id, effect: 'DENY' } })
    expect((await get(`/sprints/${sprintId}/dashboard`)).status).toBe(403)
    expect((await actions.getDashboardDataAction())).toMatchObject({ kpis: { totalCards: 0, custoTotal: 0 } })
  })
})
