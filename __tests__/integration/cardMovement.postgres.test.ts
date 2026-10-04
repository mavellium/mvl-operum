// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'
import { prisma as sprintDb } from '../../sprint-service/src/prisma'
import { CardService } from '../../sprint-service/src/card/card.service'
import { SprintService } from '../../sprint-service/src/sprint/sprint.service'

const testUrl = process.env.OPERUM_SPRINT_TEST_DATABASE_URL
const fixtures = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: testUrl ?? 'postgresql://localhost/disabled', max: 5 })) })
const cards = new CardService()
const sprints = new SprintService()
let tenantId: string
let foreignTenantId: string
let projectId: string
let foreignProjectId: string
let userId: string
let foreignUserId: string
let sprintId: string
let sourceId: string
let targetId: string
let thirdId: string
let movedId: string
let remainingId: string
let targetA: string
let targetB: string
async function positions(columnId: string) {
  return fixtures.card.findMany({ where: { sprintColumnId: columnId, deletedAt: null }, orderBy: [{ sprintPosition: 'asc' }, { id: 'asc' }], select: { id: true, sprintPosition: true } })
}
async function snapshot() {
  return fixtures.card.findMany({ where: { sprintId }, orderBy: { id: 'asc' } })
}

describe.skipIf(!testUrl)('movimentação de card — PostgreSQL real', () => {
  beforeAll(() => {
    const url = new URL(testUrl!)
    if (url.pathname !== '/operum_sprint_test' || !['localhost', '127.0.0.1'].includes(url.hostname) || process.env.DATABASE_URL !== testUrl) throw new Error('Use exclusivamente o banco local operum_sprint_test com as duas variáveis iguais')
  })
  beforeEach(async () => {
    const id = randomUUID()
    tenantId = (await fixtures.tenant.create({ data: { name: id, subdomain: `move-${id}` } })).id
    foreignTenantId = (await fixtures.tenant.create({ data: { name: id, subdomain: `move-foreign-${id}` } })).id
    projectId = (await fixtures.project.create({ data: { tenantId, name: id } })).id
    foreignProjectId = (await fixtures.project.create({ data: { tenantId: foreignTenantId, name: id } })).id
    userId = (await fixtures.user.create({ data: { tenantId, name: 'Autor', email: `${id}@move.test`, passwordHash: 'fixture-only' } })).id
    foreignUserId = (await fixtures.user.create({ data: { tenantId: foreignTenantId, name: 'Externo', email: `${id}@foreign-move.test`, passwordHash: 'fixture-only' } })).id
    sprintId = (await sprints.create(tenantId, { name: 'Sprint', projectId })).id
    const columns = await fixtures.sprintColumn.findMany({ where: { sprintId }, orderBy: { position: 'asc' } })
    sourceId = columns[0].id
    targetId = columns[1].id
    thirdId = columns[2].id
    movedId = (await cards.create(tenantId, { title: 'Movido', sprintId, sprintColumnId: sourceId, sprintPosition: 0 })).id
    remainingId = (await cards.create(tenantId, { title: 'Origem restante', sprintId, sprintColumnId: sourceId, sprintPosition: 1 })).id
    targetA = (await cards.create(tenantId, { title: 'Destino A', sprintId, sprintColumnId: targetId, sprintPosition: 0 })).id
    targetB = (await cards.create(tenantId, { title: 'Destino B', sprintId, sprintColumnId: targetId, sprintPosition: 1 })).id
  })
  afterAll(async () => { await Promise.all([fixtures.$disconnect(), sprintDb.$disconnect()]) })

  it('movimenta, renumera origem/destino, registra autoria e devolve posição final', async () => {
    const comment = await fixtures.comment.create({ data: { cardId: movedId, userId, content: 'Preservado' } })
    const time = await fixtures.timeEntry.create({ data: { cardId: movedId, userId, duration: 42 } })
    const result = await cards.update(tenantId, movedId, { sprintColumnId: targetId, sprintPosition: 1, userId, reason: 'Pronto para trabalhar' })
    expect(result).toMatchObject({ projectId, sprintColumnId: targetId, sprintPosition: 1 })
    expect(await positions(sourceId)).toEqual([{ id: remainingId, sprintPosition: 0 }])
    expect(await positions(targetId)).toEqual([{ id: targetA, sprintPosition: 0 }, { id: movedId, sprintPosition: 1 }, { id: targetB, sprintPosition: 2 }])
    expect(await fixtures.cardMovement.findMany({ where: { cardId: movedId } })).toEqual([expect.objectContaining({ userId, fromColumnId: sourceId, toColumnId: targetId, fromColumnTitle: 'A Fazer', toColumnTitle: 'Em andamento', reason: 'Pronto para trabalhar' })])
    const fetched = await cards.findOne(tenantId, movedId)
    expect(fetched.comments).toContainEqual(expect.objectContaining({ id: comment.id }))
    expect(fetched.timeEntries).toContainEqual(expect.objectContaining({ id: time.id, duration: 42 }))
  })

  it.each([[-10, 0], [999, 2]])('posição pedida %i é normalizada para %i no retorno e no banco', async (requested, expected) => {
    const result = await cards.update(tenantId, movedId, { sprintColumnId: targetId, sprintPosition: requested })
    expect(result.sprintPosition).toBe(expected)
    expect((await positions(targetId)).map(card => card.sprintPosition)).toEqual([0, 1, 2])
    expect((await fixtures.card.findUniqueOrThrow({ where: { id: movedId } })).sprintPosition).toBe(expected)
  })

  it('mudar coluna sem posição insere ao final e retry na mesma coluna não duplica histórico', async () => {
    await cards.update(tenantId, movedId, { sprintColumnId: targetId })
    const retry = await cards.update(tenantId, movedId, { sprintColumnId: targetId })
    expect(retry.sprintPosition).toBe(2)
    expect(await fixtures.cardMovement.count({ where: { cardId: movedId } })).toBe(1)
  })

  it('retorno ao backlog limpa coluna/posição de sprint, herda projeto e normaliza backlog', async () => {
    const backlog = await cards.create(tenantId, { title: 'Backlog existente', projectId, position: 7 })
    const result = await cards.update(tenantId, movedId, { sprintId: null })
    expect(result).toMatchObject({ projectId, sprintId: null, sprintColumnId: null, sprintPosition: null, position: 1 })
    expect((await cards.listBacklog(tenantId, projectId)).map(card => [card.id, card.position])).toEqual([[backlog.id, 0], [movedId, 1]])
    expect(await positions(sourceId)).toEqual([{ id: remainingId, sprintPosition: 0 }])
  })

  it('troca de sprint/projeto do mesmo tenant herda o destino e deixa os dois quadros coerentes', async () => {
    const project = await fixtures.project.create({ data: { tenantId, name: 'Novo projeto' } })
    const sprint = await sprints.create(tenantId, { name: 'Nova sprint', projectId: project.id })
    const column = await fixtures.sprintColumn.findFirstOrThrow({ where: { sprintId: sprint.id }, orderBy: { position: 'asc' } })
    const result = await cards.update(tenantId, movedId, { sprintId: sprint.id, sprintColumnId: column.id, sprintPosition: 0, userId })
    expect(result).toMatchObject({ projectId: project.id, sprintId: sprint.id, sprintColumnId: column.id, sprintPosition: 0 })
    expect(await positions(sourceId)).toEqual([{ id: remainingId, sprintPosition: 0 }])
    expect(await positions(column.id)).toEqual([{ id: movedId, sprintPosition: 0 }])
  })

  it.each(['card', 'destino', 'origem', 'histórico'])('falha em %s desfaz card, posições e histórico', async stage => {
    const before = await snapshot()
    const table = stage === 'histórico' ? 'CardMovement' : 'Card'
    const condition = stage === 'card' ? `NEW."title" = 'Movido' AND OLD."sprintColumnId" IS DISTINCT FROM NEW."sprintColumnId"` : stage === 'destino' ? `NEW."title" = 'Destino A' AND NEW."sprintPosition" = 1` : stage === 'origem' ? `NEW."title" = 'Origem restante' AND NEW."sprintPosition" = 0` : 'true'
    await fixtures.$executeRawUnsafe(`CREATE FUNCTION fail_card_movement_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${condition} THEN RAISE EXCEPTION 'injected card movement failure'; END IF; RETURN NEW; END $$`)
    await fixtures.$executeRawUnsafe(`CREATE TRIGGER fail_card_movement_test BEFORE ${stage === 'histórico' ? 'INSERT' : 'UPDATE'} ON "${table}" FOR EACH ROW EXECUTE FUNCTION fail_card_movement_test()`)
    try {
      await expect(cards.update(tenantId, movedId, { sprintColumnId: targetId, sprintPosition: 0, userId })).rejects.toThrow('injected card movement failure')
      expect(await snapshot()).toEqual(before)
      expect(await fixtures.cardMovement.count({ where: { cardId: movedId } })).toBe(0)
    } finally {
      await fixtures.$executeRawUnsafe(`DROP TRIGGER fail_card_movement_test ON "${table}"`)
      await fixtures.$executeRawUnsafe('DROP FUNCTION fail_card_movement_test()')
    }
  })

  it('movimentos concorrentes para a mesma coluna deixam posições únicas e histórico confirmado', async () => {
    await Promise.all([cards.update(tenantId, movedId, { sprintColumnId: targetId, sprintPosition: 0, userId }), cards.update(tenantId, remainingId, { sprintColumnId: targetId, sprintPosition: 0, userId })])
    expect(await positions(sourceId)).toEqual([])
    expect((await positions(targetId)).map(card => card.sprintPosition)).toEqual([0, 1, 2, 3])
    const logs = await fixtures.cardMovement.findMany({ where: { cardId: { in: [movedId, remainingId] } } })
    expect(logs).toHaveLength(2)
    expect(logs.every(log => log.fromColumnId === sourceId && log.toColumnId === targetId)).toBe(true)
  })

  it('duas movimentações do mesmo card reavaliam origem e gravam cadeia coerente', async () => {
    await Promise.all([cards.update(tenantId, movedId, { sprintColumnId: targetId, sprintPosition: 0, userId }), cards.update(tenantId, movedId, { sprintColumnId: thirdId, sprintPosition: 0, userId })])
    const logs = await fixtures.cardMovement.findMany({ where: { cardId: movedId }, orderBy: [{ movedAt: 'asc' }, { id: 'asc' }] })
    const final = await fixtures.card.findUniqueOrThrow({ where: { id: movedId } })
    expect(logs).toHaveLength(2)
    expect(logs[0].fromColumnId).toBe(sourceId)
    expect(logs[1].fromColumnId).toBe(logs[0].toColumnId)
    expect(logs[1].toColumnId).toBe(final.sprintColumnId)
    for (const column of [sourceId, targetId, thirdId]) {
      const entries = await positions(column)
      expect(entries.map(card => card.sprintPosition)).toEqual(entries.map((_, index) => index))
    }
  })

  it('card inconsistente no destino aborta sem reordenar dados de outro projeto', async () => {
    await fixtures.card.update({ where: { id: targetB }, data: { projectId: foreignProjectId } })
    const before = await snapshot()
    await expect(cards.update(tenantId, movedId, { sprintColumnId: targetId, sprintPosition: 0 })).rejects.toThrow('vínculo de projeto inconsistente')
    expect(await snapshot()).toEqual(before)
    expect(await fixtures.cardMovement.count({ where: { cardId: movedId } })).toBe(0)
  })

  it('validação recusa tenant, ator e vínculos incoerentes antes de persistir', async () => {
    const before = await snapshot()
    const foreignSprint = await sprints.create(foreignTenantId, { name: 'Externa', projectId: foreignProjectId })
    await expect(cards.update(foreignTenantId, movedId, { sprintColumnId: targetId })).rejects.toThrow('Card não encontrado')
    await expect(cards.update(tenantId, movedId, { sprintId: foreignSprint.id })).rejects.toThrow('Sprint não encontrada')
    const foreignColumn = await fixtures.sprintColumn.findFirstOrThrow({ where: { sprintId: foreignSprint.id } })
    await expect(cards.update(tenantId, movedId, { sprintColumnId: foreignColumn.id })).rejects.toThrow('Coluna não encontrada')
    await expect(cards.update(tenantId, movedId, { sprintColumnId: targetId, userId: foreignUserId })).rejects.toThrow('Usuário não encontrado')
    const anotherProject = await fixtures.project.create({ data: { tenantId, name: 'Incoerente' } })
    await expect(cards.update(tenantId, movedId, { projectId: anotherProject.id })).rejects.toThrow('mesmo projeto')
    expect(await snapshot()).toEqual(before)
    expect(await fixtures.cardMovement.count({ where: { cardId: movedId } })).toBe(0)
  })
})
