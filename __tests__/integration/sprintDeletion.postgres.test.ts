// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'
import { prisma as sprintDb } from '../../sprint-service/src/prisma'
import { SprintService } from '../../sprint-service/src/sprint/sprint.service'
import { CardService } from '../../sprint-service/src/card/card.service'

const testUrl = process.env.OPERUM_SPRINT_TEST_DATABASE_URL
const fixtures = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: testUrl ?? 'postgresql://localhost/disabled', max: 5 })) })
const service = new SprintService()
const cards = new CardService()
let tenantId: string
let projectId: string
let otherProjectId: string
let foreignTenantId: string
let foreignProjectId: string
let userId: string
let sprintId: string
let columnId: string

describe.skipIf(!testUrl)('exclusão de sprint — PostgreSQL real', () => {
  beforeAll(() => {
    const url = new URL(testUrl!)
    if (url.pathname !== '/operum_sprint_test' || !['localhost', '127.0.0.1'].includes(url.hostname) || process.env.DATABASE_URL !== testUrl) {
      throw new Error('Use exclusivamente o banco local operum_sprint_test com as duas variáveis iguais')
    }
  })
  beforeEach(async () => {
    const id = randomUUID()
    const tenant = await fixtures.tenant.create({ data: { name: id, subdomain: `sprint-${id}` } })
    const foreign = await fixtures.tenant.create({ data: { name: id, subdomain: `foreign-${id}` } })
    tenantId = tenant.id
    foreignTenantId = foreign.id
    projectId = (await fixtures.project.create({ data: { tenantId, name: id } })).id
    otherProjectId = (await fixtures.project.create({ data: { tenantId, name: `${id} outro` } })).id
    foreignProjectId = (await fixtures.project.create({ data: { tenantId: foreignTenantId, name: id } })).id
    userId = (await fixtures.user.create({ data: { tenantId, name: 'Autor', email: `${id}@sprint.test`, passwordHash: 'fixture-only' } })).id
    const sprint = await service.create(tenantId, { name: 'Sprint', projectId })
    sprintId = sprint.id
    columnId = (await sprintDb.sprintColumn.findFirstOrThrow({ where: { sprintId }, orderBy: { position: 'asc' } })).id
  })
  afterAll(async () => { await Promise.all([fixtures.$disconnect(), sprintDb.$disconnect()]) })

  it('cards criados só com sprint ficam acessíveis no backlog/id, preservando comentários e tempos', async () => {
    const tail = await cards.create(tenantId, { title: 'Backlog existente', projectId, position: 7 })
    const first = await cards.create(tenantId, { title: 'Primeiro', sprintId, sprintColumnId: columnId, sprintPosition: 0 })
    const second = await cards.create(tenantId, { title: 'Segundo', projectId, sprintId, sprintColumnId: columnId, sprintPosition: 1 })
    const deleted = await fixtures.card.create({ data: { title: 'Excluído', sprintId, deletedAt: new Date() } })
    const comment = await fixtures.comment.create({ data: { cardId: first.id, userId, content: 'Comentário preservado' } })
    const time = await fixtures.timeEntry.create({ data: { cardId: first.id, userId, duration: 123, isRunning: true } })
    expect(first.projectId).toBeNull()
    await service.remove(tenantId, sprintId)
    const backlog = await cards.listBacklog(tenantId, projectId)
    expect(backlog.map(card => [card.id, card.position])).toEqual([[tail.id, 7], [first.id, 8], [second.id, 9]])
    const fetched = await cards.findOne(tenantId, first.id)
    expect(fetched).toMatchObject({ projectId, sprintId: null, sprintColumnId: null, sprintPosition: null })
    expect(fetched.comments).toContainEqual(expect.objectContaining({ id: comment.id, content: comment.content }))
    expect(fetched.timeEntries).toContainEqual(expect.objectContaining({ id: time.id, duration: 123, isRunning: true }))
    expect((await fixtures.card.findUniqueOrThrow({ where: { id: deleted.id } })).sprintId).toBe(sprintId)
    expect((await fixtures.sprint.findUniqueOrThrow({ where: { id: sprintId } })).deletedAt).not.toBeNull()
  })

  it('falha depois de transferir os cards desfaz transferência e exclusão', async () => {
    const card = await cards.create(tenantId, { title: 'Preservado', sprintId, sprintColumnId: columnId, sprintPosition: 3, position: 4 })
    const original = await fixtures.card.findUniqueOrThrow({ where: { id: card.id } })
    await fixtures.$executeRawUnsafe(`CREATE FUNCTION fail_sprint_deletion_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."deletedAt" IS NOT NULL AND OLD."deletedAt" IS NULL THEN RAISE EXCEPTION 'injected sprint deletion failure'; END IF; RETURN NEW; END $$`)
    await fixtures.$executeRawUnsafe(`CREATE TRIGGER fail_sprint_deletion_test BEFORE UPDATE ON "Sprint" FOR EACH ROW EXECUTE FUNCTION fail_sprint_deletion_test()`)
    try {
      await expect(service.remove(tenantId, sprintId)).rejects.toThrow('injected sprint deletion failure')
      expect(await fixtures.card.findUniqueOrThrow({ where: { id: card.id } })).toEqual(original)
      expect((await fixtures.sprint.findUniqueOrThrow({ where: { id: sprintId } })).deletedAt).toBeNull()
    } finally {
      await fixtures.$executeRawUnsafe('DROP TRIGGER fail_sprint_deletion_test ON "Sprint"')
      await fixtures.$executeRawUnsafe('DROP FUNCTION fail_sprint_deletion_test()')
    }
  })

  it.each(['mesmo tenant', 'outro tenant'])('recusa vínculo de outro projeto (%s) antes de mutar', async kind => {
    const card = await fixtures.card.create({ data: { title: 'Inconsistente', sprintId, projectId: kind === 'mesmo tenant' ? otherProjectId : foreignProjectId } })
    await expect(service.remove(tenantId, sprintId)).rejects.toThrow(/outro projeto/)
    expect((await fixtures.card.findUniqueOrThrow({ where: { id: card.id } })).sprintId).toBe(sprintId)
    expect((await fixtures.sprint.findUniqueOrThrow({ where: { id: sprintId } })).deletedAt).toBeNull()
  })

  it('outro tenant não exclui sprint nem altera cards', async () => {
    const card = await cards.create(tenantId, { title: 'Protegido', sprintId })
    await expect(service.remove(foreignTenantId, sprintId)).rejects.toThrow('Sprint não encontrada')
    expect((await fixtures.card.findUniqueOrThrow({ where: { id: card.id } })).sprintId).toBe(sprintId)
    expect((await fixtures.sprint.findUniqueOrThrow({ where: { id: sprintId } })).deletedAt).toBeNull()
  })

  it('exclusões concorrentes de sprints do mesmo projeto ocupam posições distintas no backlog', async () => {
    const other = await service.create(tenantId, { name: 'Segunda sprint', projectId })
    const first = await cards.create(tenantId, { title: 'Primeiro', sprintId })
    const second = await cards.create(tenantId, { title: 'Segundo', sprintId: other.id })
    await Promise.all([service.remove(tenantId, sprintId), service.remove(tenantId, other.id)])
    const backlog = await cards.listBacklog(tenantId, projectId)
    expect(backlog.map(card => card.position)).toEqual([0, 1])
    expect(new Set(backlog.map(card => card.id))).toEqual(new Set([first.id, second.id]))
  })

  it('exclusão repetida responde não encontrada sem reordenar novamente o backlog', async () => {
    const card = await cards.create(tenantId, { title: 'Uma vez', sprintId })
    await service.remove(tenantId, sprintId)
    const published = await fixtures.card.findUniqueOrThrow({ where: { id: card.id } })
    await expect(service.remove(tenantId, sprintId)).rejects.toThrow('Sprint não encontrada')
    expect(await fixtures.card.findUniqueOrThrow({ where: { id: card.id } })).toEqual(published)
  })
})
