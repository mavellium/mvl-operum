// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'
import { prisma as db } from '../../sprint-service/src/prisma'
import { CardService } from '../../sprint-service/src/card/card.service'
import { SprintService } from '../../sprint-service/src/sprint/sprint.service'

vi.mock('../../sprint-service/src/prisma', async () => {
  const { PrismaClient } = await import('../../sprint-service/lib/generated/prisma/index.js')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { Pool } = await import('pg')
  const client = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })), log: [{ emit: 'event', level: 'query' }] })
  client.$on('query', event => { queryStats.count++; queryStats.queries.push({ sql: event.query, params: event.params }) })
  return { prisma: client }
})
const queryStats = vi.hoisted(() => ({ count: 0, queries: [] as { sql: string; params: string }[] }))
const testUrl = process.env.OPERUM_TASK_PAGE_TEST_DATABASE_URL
const fixtures = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: testUrl ?? 'postgresql://localhost/disabled', max: 5 })) })
const cards = new CardService(), sprints = new SprintService()
let tenantId: string, projectId: string, sprintId: string, columnId: string, userId: string, foreignTenantId: string, foreignProjectId: string
const fixedDate = new Date('2026-01-01T00:00:00Z')
async function page(query: Record<string, unknown> = {}) { return cards.listPage(tenantId, { projectId, limit: 20, ...query }) }

describe.skipIf(!testUrl)('paginação na origem — PostgreSQL real', () => {
  beforeAll(() => {
    const url = new URL(testUrl!)
    if (url.pathname !== '/operum_task_page_test' || !['localhost', '127.0.0.1'].includes(url.hostname) || process.env.DATABASE_URL !== testUrl) throw new Error('Use exclusivamente operum_task_page_test com as duas variáveis iguais')
  })
  beforeEach(async () => {
    const id = randomUUID()
    tenantId = (await fixtures.tenant.create({ data: { name: id, subdomain: `page-${id}` } })).id
    foreignTenantId = (await fixtures.tenant.create({ data: { name: id, subdomain: `page-foreign-${id}` } })).id
    projectId = (await fixtures.project.create({ data: { tenantId, name: id } })).id
    foreignProjectId = (await fixtures.project.create({ data: { tenantId: foreignTenantId, name: id } })).id
    userId = (await fixtures.user.create({ data: { tenantId, name: 'Responsável', email: `${id}@page.test`, passwordHash: 'fixture' } })).id
    sprintId = (await fixtures.sprint.create({ data: { projectId, name: 'Sprint' } })).id
    columnId = (await fixtures.sprintColumn.create({ data: { sprintId, title: 'Fazendo', position: 0 } })).id
  })
  afterAll(async () => { await Promise.all([fixtures.$disconnect(), db.$disconnect()]) })

  it('limite 20 carrega no máximo 21 cards, com consultas/payload menores que a varredura de 80 sprints', async () => {
    const sprintIds = Array.from({ length: 80 }, (_, i) => `${projectId}-s-${i}`)
    await fixtures.sprint.createMany({ data: sprintIds.map(id => ({ id, projectId, name: id })) })
    await fixtures.card.createMany({ data: Array.from({ length: 1600 }, (_, i) => ({ id: `${projectId}-c-${String(i).padStart(4, '0')}`, title: `Card ${i}`, description: 'x'.repeat(1024), sprintId: sprintIds[i % 80], createdAt: fixedDate })) })
    const start = performance.now()
    queryStats.count = 0
    const allSprints = await db.sprint.findMany({ where: { projectId, deletedAt: null } })
    const backlog = await cards.listBacklog(tenantId, projectId)
    const all = [...backlog]
    for (let offset = 0; offset < allSprints.length; offset += 4) {
      const batch = await Promise.all(allSprints.slice(offset, offset + 4).map(sprint => cards.listBySprint(tenantId, sprint.id)))
      all.push(...batch.flat())
    }
    const before = { queries: queryStats.count, bytes: Buffer.byteLength(JSON.stringify([allSprints, all])), ms: Math.round(performance.now() - start) }
    queryStats.count = 0
    queryStats.queries = []
    const now = performance.now()
    const result = await page()
    const after = { queries: queryStats.count, bytes: Buffer.byteLength(JSON.stringify(result)), ms: Math.round(performance.now() - now) }
    expect(result.total).toBe(1600)
    expect(result.items).toHaveLength(20)
    const boundedRead = queryStats.queries.filter(query => query.sql.includes('FROM \"public\".\"Card\"') && query.sql.includes('LIMIT') && JSON.parse(query.params).map(String).includes('21'))
    expect(boundedRead).toHaveLength(1)
    expect(result.items[0]).not.toHaveProperty('description')
    expect(result.items[0]).not.toHaveProperty('timeEntries')
    expect(after.queries).toBeLessThan(before.queries / 5)
    expect(after.bytes).toBeLessThan(before.bytes / 20)
    process.stdout.write('SDD9.6 task pagination benchmark ' + JSON.stringify({ fixture: { sprints: 81, cards: 1600, limit: 20 }, before, after }) + '\n')
  })

  it('percorre todos os IDs empatados na criação sem perder nem duplicar, mesmo com renomeação/movimento/exclusão do marcador e nova tarefa', async () => {
    const ids = Array.from({ length: 65 }, (_, i) => `${projectId}-c-${String(i).padStart(3, '0')}`)
    await fixtures.card.createMany({ data: ids.map((id, i) => ({ id, title: id, createdAt: fixedDate, ...(i % 2 ? { sprintId } : { projectId }) })) })
    const first = await page()
    await fixtures.card.update({ where: { id: first.items[0].id }, data: { title: 'Renomeado', position: 999 } })
    await fixtures.card.update({ where: { id: first.items[19].id }, data: { deletedAt: new Date() } })
    await fixtures.card.create({ data: { projectId, title: 'Nova', createdAt: new Date() } })
    let cursor = first.next_cursor
    const seen = first.items.map(card => card.id)
    while (cursor) {
      const result = await page({ cursor })
      seen.push(...result.items.map(card => card.id))
      cursor = result.next_cursor
    }
    expect(seen).toEqual(ids)
    expect(new Set(seen).size).toBe(65)
  })

  it('filtra no banco por sprint, coluna, responsável, prioridade, prazo e texto; inclui sprint sem projectId direto', async () => {
    const match = await fixtures.card.create({ data: { sprintId, sprintColumnId: columnId, title: 'AÇÃO', description: 'relatório', priority: 'alta', endDate: new Date('2026-03-10'), createdAt: fixedDate } })
    await fixtures.cardResponsible.create({ data: { cardId: match.id, userId } })
    await fixtures.card.createMany({ data: [{ projectId, title: 'Backlog' }, { sprintId, title: 'Outro', priority: 'baixa' }] })
    const result = await page({ sprintId, columnId, responsibleId: userId, priority: 'alta', q: 'RELAT', dueAfter: '2026-03-01T00:00:00.000Z', dueBefore: '2026-03-31T00:00:00.000Z', fields: 'full' })
    expect(result.total).toBe(1)
    expect(result.items.map(card => card.id)).toEqual([match.id])
    expect(result.items[0]).toMatchObject({ description: 'relatório', projectId: null, sprint: { name: 'Sprint' }, sprintColumn: { title: 'Fazendo' } })
    expect((await page({ backlog: 'true' })).items.map(card => card.title)).toEqual(['Backlog'])
  })

  it('exclui tenant/projeto/sprint apagados e vínculos de projeto incoerentes; oculta responsáveis estrangeiros', async () => {
    const foreignSprint = await fixtures.sprint.create({ data: { projectId: foreignProjectId, name: 'Privado' } })
    const deletedSprint = await fixtures.sprint.create({ data: { projectId, name: 'Excluído', deletedAt: new Date() } })
    const deletedProject = await fixtures.project.create({ data: { tenantId, name: randomUUID(), deletedAt: new Date() } })
    const valid = await fixtures.card.create({ data: { sprintId, title: 'Visível' } })
    await fixtures.card.createMany({ data: [{ sprintId: foreignSprint.id, title: 'Privado' }, { projectId, title: 'Excluído', deletedAt: new Date() }, { sprintId: deletedSprint.id, title: 'Sprint excluída' }, { sprintId, projectId: foreignProjectId, title: 'Vínculo incoerente' }] })
    const foreignUser = await fixtures.user.create({ data: { tenantId: foreignTenantId, name: 'Privado', email: `${randomUUID()}@private.test`, passwordHash: 'fixture' } })
    await fixtures.cardResponsible.create({ data: { cardId: valid.id, userId: foreignUser.id } })
    expect((await page()).items).toEqual([expect.objectContaining({ id: valid.id, responsibles: [] })])
    await expect(cards.listPage(tenantId, { projectId: foreignProjectId })).rejects.toThrow('Projeto não encontrado')
    await expect(cards.listPage(tenantId, { projectId: deletedProject.id })).rejects.toThrow('Projeto não encontrado')
    await expect(page({ sprintId: foreignSprint.id })).rejects.toThrow('Sprint não encontrada')
  })

  it('recusa cursor inválido, troca de filtros/tenant e parâmetros incompatíveis; vazio retorna total zero', async () => {
    await fixtures.card.createMany({ data: Array.from({ length: 3 }, (_, i) => ({ projectId, title: `${i}` })) })
    const first = await page({ limit: 1 })
    await expect(page({ cursor: first.next_cursor, q: 'novo filtro' })).rejects.toThrow('Cursor inválido')
    await expect(cards.listPage(foreignTenantId, { projectId, limit: 1, cursor: first.next_cursor })).rejects.toThrow('Cursor inválido')
    for (const query of [{ cursor: 'invalid' }, { limit: 201 }, { limit: 0 }, { sprintId, backlog: 'true' }, { unknown: 'ignored?' }, { dueBefore: 'inválido' }]) await expect(page(query)).rejects.toThrow()
    expect(await page({ q: 'não existe' })).toEqual({ items: [], total: 0, next_cursor: null })
  })

  it('board devolve resumo e timer ativo sem transferir 5000 entradas encerradas; detalhe mantém o histórico', async () => {
    const card = await fixtures.card.create({ data: { sprintId, sprintColumnId: columnId, title: 'Tempos' } })
    await fixtures.timeEntry.createMany({ data: Array.from({ length: 5000 }, () => ({ cardId: card.id, userId, duration: 10 })) })
    const active = await fixtures.timeEntry.create({ data: { cardId: card.id, userId, isRunning: true } })
    queryStats.count = 0
    queryStats.queries = []
    const now = performance.now()
    const old = await sprints.listColumns(tenantId, sprintId)
    const before = { queries: queryStats.count, bytes: Buffer.byteLength(JSON.stringify(old)), ms: Math.round(performance.now() - now) }
    queryStats.count = 0
    const start = performance.now()
    const board = await sprints.listColumns(tenantId, sprintId, 'summary')
    const after = { queries: queryStats.count, bytes: Buffer.byteLength(JSON.stringify(board)), ms: Math.round(performance.now() - start) }
    expect(board[0].cards[0].timeEntries).toEqual([expect.objectContaining({ id: active.id, isRunning: true })])
    expect(board[0].cards[0].totalDurationSeconds).toBe(50000)
    expect(after.bytes).toBeLessThan(before.bytes / 100)
    expect((await cards.findOne(tenantId, card.id)).timeEntries).toHaveLength(5001)
    expect((await sprints.listColumns(tenantId, sprintId))[0].cards[0].timeEntries).toHaveLength(5001)
    process.stdout.write('SDD9.6 board benchmark ' + JSON.stringify({ fixture: { cards: 1, entries: 5001 }, before, after }) + '\n')
  })
})
