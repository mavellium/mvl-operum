// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'
import { prisma as sprintDb } from '../../sprint-service/src/prisma'
import { TimeEntryService } from '../../sprint-service/src/time-entry/time-entry.service'

const testUrl = process.env.OPERUM_SPRINT_TEST_DATABASE_URL
const pool = new Pool({ connectionString: testUrl ?? 'postgresql://localhost/disabled', max: 5 })
const fixtures = new PrismaClient({ adapter: new PrismaPg(pool) })
const service = new TimeEntryService()
let tenantId: string
let userId: string
let otherUserId: string
let foreignTenantId: string
let foreignUserId: string
let cardId: string
let otherCardId: string
let foreignCardId: string

describe.skipIf(!testUrl)('integridade do timer — PostgreSQL real', () => {
  beforeAll(() => {
    const url = new URL(testUrl!)
    if (url.pathname !== '/operum_sprint_test' || !['localhost', '127.0.0.1'].includes(url.hostname) || process.env.DATABASE_URL !== testUrl) {
      throw new Error('Use exclusivamente o banco local operum_sprint_test com as duas variáveis iguais')
    }
  })
  beforeEach(async () => {
    const id = randomUUID()
    tenantId = (await fixtures.tenant.create({ data: { name: id, subdomain: `timer-${id}` } })).id
    foreignTenantId = (await fixtures.tenant.create({ data: { name: id, subdomain: `timer-foreign-${id}` } })).id
    const projectId = (await fixtures.project.create({ data: { tenantId, name: id } })).id
    const foreignProjectId = (await fixtures.project.create({ data: { tenantId: foreignTenantId, name: id } })).id
    userId = (await fixtures.user.create({ data: { tenantId, name: 'Autor', email: `${id}@timer.test`, passwordHash: 'fixture-only' } })).id
    otherUserId = (await fixtures.user.create({ data: { tenantId, name: 'Outro', email: `${id}@other-timer.test`, passwordHash: 'fixture-only' } })).id
    foreignUserId = (await fixtures.user.create({ data: { tenantId: foreignTenantId, name: 'Externo', email: `${id}@foreign-timer.test`, passwordHash: 'fixture-only' } })).id
    cardId = (await fixtures.card.create({ data: { title: 'Primeira tarefa', projectId } })).id
    otherCardId = (await fixtures.card.create({ data: { title: 'Segunda tarefa', projectId } })).id
    foreignCardId = (await fixtures.card.create({ data: { title: 'Tarefa externa', projectId: foreignProjectId } })).id
  })
  afterAll(async () => { await Promise.all([fixtures.$disconnect(), sprintDb.$disconnect()]) })

  it.each(['mesma tarefa', 'outra tarefa'])('inícios simultâneos (%s) criam um único timer e conflito previsível', async kind => {
    const results = await Promise.allSettled([
      service.start(tenantId, cardId, userId),
      service.start(tenantId, kind === 'mesma tarefa' ? cardId : otherCardId, userId),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find(result => result.status === 'rejected')
    if (rejected?.status !== 'rejected') throw new Error('Expected timer conflict')
    expect(rejected.reason.getStatus()).toBe(409)
    expect(rejected.reason.message).toBe('Já existe um timer em andamento')
    expect(await fixtures.timeEntry.count({ where: { userId, isRunning: true, deletedAt: null } })).toBe(1)
  })

  it('índice impede uma segunda criação mesmo fora do serviço; usuários diferentes podem iniciar', async () => {
    await service.start(tenantId, cardId, userId)
    await expect(fixtures.timeEntry.create({ data: { userId, cardId: otherCardId, isRunning: true } })).rejects.toMatchObject({ code: 'P2002' })
    const other = await service.start(tenantId, cardId, otherUserId)
    expect(other.isRunning).toBe(true)
    expect(await fixtures.timeEntry.count({ where: { userId: { in: [userId, otherUserId] }, isRunning: true, deletedAt: null } })).toBe(2)
  })

  it('parada repetida mantém endedAt, duration e updatedAt exatamente; total não duplica', async () => {
    const entry = await fixtures.timeEntry.create({ data: { userId, cardId, isRunning: true, startedAt: new Date(Date.now() - 120000) } })
    const first = await service.stop(tenantId, entry.id, userId)
    await new Promise(resolve => setTimeout(resolve, 30))
    const retry = await service.stop(tenantId, entry.id, userId)
    expect(retry).toEqual(first)
    expect(first.isRunning).toBe(false)
    expect(first.duration).toBeGreaterThanOrEqual(120)
    expect(await service.getTotal(tenantId, cardId)).toEqual({ seconds: first.duration })
    expect(await fixtures.timeEntry.count({ where: { userId, cardId } })).toBe(1)
  })

  it('paradas concorrentes retornam o mesmo intervalo mesmo quando a primeira escrita demora', async () => {
    const entry = await fixtures.timeEntry.create({ data: { userId, cardId, isRunning: true, startedAt: new Date(Date.now() - 10000) } })
    await fixtures.$executeRawUnsafe(`CREATE FUNCTION delay_timer_stop_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.15); RETURN NEW; END $$`)
    await fixtures.$executeRawUnsafe(`CREATE TRIGGER delay_timer_stop_test BEFORE UPDATE ON "TimeEntry" FOR EACH ROW EXECUTE FUNCTION delay_timer_stop_test()`)
    try {
      const first = service.stop(tenantId, entry.id, userId)
      await new Promise(resolve => setTimeout(resolve, 30))
      const results = await Promise.all([first, service.stop(tenantId, entry.id, userId)])
      expect(results[1]).toEqual(results[0])
      expect(await fixtures.timeEntry.findUniqueOrThrow({ where: { id: entry.id } })).toMatchObject({
        endedAt: results[0].endedAt, duration: results[0].duration, updatedAt: results[0].updatedAt, isRunning: false,
      })
    } finally {
      await fixtures.$executeRawUnsafe('DROP TRIGGER delay_timer_stop_test ON "TimeEntry"')
      await fixtures.$executeRawUnsafe('DROP FUNCTION delay_timer_stop_test()')
    }
  })

  it('falha de escrita não encerra o timer; retry grava uma única parada', async () => {
    const entry = await fixtures.timeEntry.create({ data: { userId, cardId, isRunning: true, startedAt: new Date(Date.now() - 5000) } })
    await fixtures.$executeRawUnsafe(`CREATE FUNCTION fail_timer_stop_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."isRunning" AND NOT NEW."isRunning" THEN RAISE EXCEPTION 'injected timer stop failure'; END IF; RETURN NEW; END $$`)
    await fixtures.$executeRawUnsafe(`CREATE TRIGGER fail_timer_stop_test BEFORE UPDATE ON "TimeEntry" FOR EACH ROW EXECUTE FUNCTION fail_timer_stop_test()`)
    try {
      await expect(service.stop(tenantId, entry.id, userId)).rejects.toThrow('injected timer stop failure')
      expect(await fixtures.timeEntry.findUniqueOrThrow({ where: { id: entry.id } })).toEqual(entry)
    } finally {
      await fixtures.$executeRawUnsafe('DROP TRIGGER fail_timer_stop_test ON "TimeEntry"')
      await fixtures.$executeRawUnsafe('DROP FUNCTION fail_timer_stop_test()')
    }
    const stopped = await service.stop(tenantId, entry.id, userId)
    expect(await service.stop(tenantId, entry.id, userId)).toEqual(stopped)
    expect(await service.getTotal(tenantId, cardId)).toEqual({ seconds: stopped.duration })
  })

  it('não permite iniciar com usuário/card de outro tenant nem parar registro de outro usuário', async () => {
    await expect(service.start(tenantId, cardId, foreignUserId)).rejects.toThrow('Usuário não encontrado')
    await expect(service.start(tenantId, foreignCardId, userId)).rejects.toThrow('Card não encontrado')
    const entry = await service.start(tenantId, cardId, userId)
    await expect(service.stop(tenantId, entry.id, otherUserId)).rejects.toThrow('Time entry não encontrada')
    await expect(service.stop(foreignTenantId, entry.id, userId)).rejects.toThrow('Time entry não encontrada')
    expect((await fixtures.timeEntry.findUniqueOrThrow({ where: { id: entry.id } })).isRunning).toBe(true)
  })

  it('registros manuais/parados/excluídos não bloqueiam novos timers; parar manual preserva seus valores', async () => {
    const manual = await service.createManual(tenantId, cardId, userId, { startedAt: '2026-10-03T10:00:00Z', endedAt: '2026-10-03T10:05:00Z' })
    expect(await service.stop(tenantId, manual.id, userId)).toEqual(manual)
    const deleted = await fixtures.timeEntry.create({ data: { userId, cardId, isRunning: true, deletedAt: new Date() } })
    await expect(service.stop(tenantId, deleted.id, userId)).rejects.toThrow('Time entry não encontrada')
    const first = await service.start(tenantId, cardId, userId)
    await service.stop(tenantId, first.id, userId)
    const next = await service.start(tenantId, otherCardId, userId)
    expect(next.id).not.toBe(first.id)
    expect(next.isRunning).toBe(true)
  })

  it('migration recusa duplicados históricos e rollback preserva índice e registros', async () => {
    // Temporary changes are confined to this connection/transaction and rolled back.
    const client = await pool.connect()
    const id1 = randomUUID()
    const id2 = randomUUID()
    try {
      await client.query('BEGIN')
      await client.query('DROP INDEX "TimeEntry_one_running_per_user"')
      await client.query('INSERT INTO "TimeEntry" ("id", "userId", "cardId", "isRunning", "updatedAt") VALUES ($1, $2, $3, true, now()), ($4, $2, $3, true, now())', [id1, userId, cardId, id2])
      const sql = readFileSync('prisma/migrations/20261004010000_unique_running_timer/migration.sql', 'utf8').replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, '')
      await expect(client.query(sql)).rejects.toMatchObject({ code: '23505', message: expect.stringContaining('Timers ativos duplicados') })
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
    expect(await fixtures.timeEntry.count({ where: { userId } })).toBe(0)
    const indexes = await fixtures.$queryRaw<{ indexdef: string }[]>`SELECT indexdef FROM pg_indexes WHERE indexname = 'TimeEntry_one_running_per_user'`
    expect(indexes).toHaveLength(1)
    expect(indexes[0].indexdef).toContain('UNIQUE INDEX')
  })
})
