// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import prisma from '@/lib/prisma'
import { reconcileMacroFases } from '@/services/macroFaseSyncService'
import { ProjectService } from '../../project-service/src/project/project.service'
import { prisma as projectDb } from '../../project-service/src/prisma'

// Independent service client, as in deployed processes (no shared global client).
vi.mock('../../project-service/src/prisma', async () => {
  const { PrismaClient } = await import('../../project-service/lib/generated/prisma/index.js')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { Pool } = await import('pg')
  return { prisma: new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })) }) }
})
const testUrl = process.env.OPERUM_MACRO_TEST_DATABASE_URL
const service = new ProjectService()
let tenantId: string, foreignTenantId: string, projectId: string, userId: string
const batch = [{ fase: 'Planejamento', dataLimite: '2026-10-31', custo: '1.500,50' }, { fase: 'Execução', custo: '200' }]
const state = () => prisma.project.findUniqueOrThrow({ where: { id: projectId } })
const phases = () => prisma.projectMacroFase.findMany({ where: { projectId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] })
const tree = () => prisma.wbsNode.findMany({ where: { projectId }, orderBy: { id: 'asc' } })
async function inject(table: string, event: string, condition: string) {
  await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_macro_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${condition} THEN RAISE EXCEPTION 'injected macro failure'; END IF; RETURN NEW; END $$`)
  await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_macro_test BEFORE ${event} ON "${table}" FOR EACH ROW EXECUTE FUNCTION fail_macro_test()`)
  return async () => { await prisma.$executeRawUnsafe(`DROP TRIGGER fail_macro_test ON "${table}"`); await prisma.$executeRawUnsafe('DROP FUNCTION fail_macro_test()') }
}
describe.skipIf(!testUrl)('macrofases e reconciliação EAP — PostgreSQL real', () => {
  beforeAll(() => {
    const url = new URL(testUrl!)
    if (url.pathname !== '/operum_macro_test' || !['localhost', '127.0.0.1'].includes(url.hostname) || process.env.DATABASE_URL !== testUrl) throw new Error('Use exclusivamente o banco local operum_macro_test com as duas variáveis iguais')
  })
  beforeEach(async () => {
    const key = randomUUID()
    tenantId = (await prisma.tenant.create({ data: { name: key, subdomain: `macro-${key}` } })).id
    foreignTenantId = (await prisma.tenant.create({ data: { name: key, subdomain: `macro-foreign-${key}` } })).id
    projectId = (await prisma.project.create({ data: { tenantId, name: key, departamentos: [] } })).id
    userId = (await prisma.user.create({ data: { tenantId, name: key, email: `${key}@macro.test`, passwordHash: 'test-only' } })).id
    await prisma.projectMacroFase.create({ data: { projectId, fase: 'Anterior', custo: '50' } })
  })
  afterAll(async () => { await Promise.all([prisma.$disconnect(), projectDb.$disconnect()]) })

  it('falha na inserção reverte exclusão, dados do projeto e revisão', async () => {
    const previous = { project: await state(), phases: await phases() }
    const clear = await inject('ProjectMacroFase', 'INSERT', `NEW."fase" = 'Falha'`)
    try {
      await expect(service.update(projectId, tenantId, { name: 'Não salvar', macroFases: [{ fase: 'Falha' }] })).rejects.toThrow('injected macro failure')
      expect({ project: await state(), phases: await phases() }).toEqual(previous)
    } finally { await clear() }
  })

  it.each([undefined, null, [{ fase: 'A' }, { fase: ' a ' }], [{ fase: '', custo: '100' }], [{ fase: 'A', dataLimite: '2026-02-30' }], [{ fase: 'A', custo: '-1' }]].map(input => [input]))('lote inválido %j não muta dados', async input => {
    const before = await phases()
    await expect(service.upsertMacroFase(projectId, tenantId, input)).rejects.toMatchObject({ status: 400 })
    expect(await phases()).toEqual(before)
    expect((await state()).macroFasesRevision).toBe(0)
  })

  it('lote válido substitui em ordem e replay preserva IDs e revisão', async () => {
    expect(await service.upsertMacroFase(projectId, tenantId, batch)).toEqual({ count: 2 })
    const previous = await phases()
    expect(previous.map(f => f.fase)).toEqual(['Planejamento', 'Execução'])
    expect(await state()).toMatchObject({ macroFasesRevision: 1, macroFasesSyncedRevision: 0, macroFasesSyncError: null })
    await service.upsertMacroFase(projectId, tenantId, batch)
    expect(await phases()).toEqual(previous)
    expect((await state()).macroFasesRevision).toBe(1)
  })

  it('substituições concorrentes preservam um lote inteiro e sua revisão', async () => {
    const a = [{ fase: 'A1' }, { fase: 'A2' }]
    const b = [{ fase: 'B1' }, { fase: 'B2' }]
    await Promise.all([service.upsertMacroFase(projectId, tenantId, a), service.upsertMacroFase(projectId, tenantId, b)])
    const names = (await phases()).map(f => f.fase)
    expect([['A1', 'A2'], ['B1', 'B2']]).toContainEqual(names)
    expect((await state()).macroFasesRevision).toBe(2)
    await reconcileMacroFases(projectId, tenantId, userId)
    expect((await tree()).filter(n => n.parentId).map(n => n.title).sort()).toEqual([...names].sort())
  })

  it('não permite substituição ou reconciliação por outro tenant', async () => {
    await expect(service.upsertMacroFase(projectId, foreignTenantId, batch)).rejects.toMatchObject({ status: 404 })
    await expect(reconcileMacroFases(projectId, foreignTenantId, userId)).rejects.toThrow('Projeto não encontrado')
    expect((await phases()).map(f => f.fase)).toEqual(['Anterior'])
  })

  it('criação grava projeto, macrofases e pendência no mesmo commit', async () => {
    const created = await service.create({ tenantId, name: randomUUID(), macroFases: batch })
    expect(created.macroFasesRevision).toBe(1)
    expect(await prisma.projectMacroFase.count({ where: { projectId: created.id } })).toBe(2)
  })

  it.each(['WbsNode', 'Project', 'AuditLog'])('falha em %s mantém pendência, desfaz EAP e retry converge', async table => {
    await service.upsertMacroFase(projectId, tenantId, batch)
    const condition = table === 'WbsNode' ? `NEW."title" = 'Execução'` : table === 'Project' ? 'NEW."macroFasesSyncedRevision" > OLD."macroFasesSyncedRevision"' : 'true'
    const clear = await inject(table, table === 'Project' ? 'UPDATE' : 'INSERT', condition)
    try {
      expect(await reconcileMacroFases(projectId, tenantId, userId)).toMatchObject({ pending: true })
      expect(await tree()).toEqual([])
      expect(await state()).toMatchObject({ macroFasesRevision: 1, macroFasesSyncedRevision: 0 })
      expect((await state()).macroFasesSyncError).toMatch(/pendente/)
    } finally { await clear() }
    expect(await reconcileMacroFases(projectId, tenantId, userId)).toEqual({ pending: false })
    const before = await tree()
    expect(before).toHaveLength(3)
    expect(before.find(n => n.title === 'Planejamento')?.properties).toMatchObject({ custo: 1500.5 })
    await reconcileMacroFases(projectId, tenantId, userId)
    expect(await tree()).toEqual(before)
    expect(await state()).toMatchObject({ macroFasesRevision: 1, macroFasesSyncedRevision: 1, macroFasesSyncError: null })
    expect(await prisma.auditLog.count({ where: { tenantId, entity: 'WbsNode' } })).toBe(2)
  })

  it('interrupção após HTTP deixa revisão rastreável; retry aplica o último lote', async () => {
    await service.upsertMacroFase(projectId, tenantId, batch)
    await service.upsertMacroFase(projectId, tenantId, [{ fase: 'Última' }])
    expect(await state()).toMatchObject({ macroFasesRevision: 2, macroFasesSyncedRevision: 0 })
    await reconcileMacroFases(projectId, tenantId, userId)
    expect((await tree()).filter(n => n.parentId).map(n => n.title)).toEqual(['Última'])
    expect((await state()).macroFasesSyncedRevision).toBe(2)
  })

  it('retries concorrentes não duplicam raiz, fases ou auditoria', async () => {
    await service.upsertMacroFase(projectId, tenantId, batch)
    const results = await Promise.all([reconcileMacroFases(projectId, tenantId, userId), reconcileMacroFases(projectId, tenantId, userId)])
    expect(results).toEqual([{ pending: false }, { pending: false }])
    expect(await tree()).toHaveLength(3)
    expect(await prisma.auditLog.count({ where: { tenantId, entity: 'WbsNode' } })).toBe(2)
  })

  it('preserva EAP existente, propriedades, atividades e fases ausentes do lote', async () => {
    const root = await prisma.wbsNode.create({ data: { projectId, tenantId, order: 0, code: '1', title: 'Raiz', style: {}, properties: {} } })
    const existing = await prisma.wbsNode.create({ data: { projectId, tenantId, parentId: root.id, order: 0, code: '1.1', title: 'Planejamento', style: {}, properties: { elaboradoPor: 'Maria', materiais: 80 } } })
    const activity = await prisma.wbsNode.create({ data: { projectId, tenantId, parentId: existing.id, order: 0, code: '1.1.1', title: 'Atividade', style: {}, properties: { tempoRealMinutos: 120 } } })
    await service.upsertMacroFase(projectId, tenantId, batch)
    await reconcileMacroFases(projectId, tenantId, userId)
    expect(await prisma.wbsNode.findUniqueOrThrow({ where: { id: activity.id } })).toEqual(activity)
    expect((await prisma.wbsNode.findUniqueOrThrow({ where: { id: existing.id } })).properties).toMatchObject({ elaboradoPor: 'Maria', materiais: 80, custo: 1500.5 })
    await service.upsertMacroFase(projectId, tenantId, [])
    await reconcileMacroFases(projectId, tenantId, userId)
    expect(await phases()).toEqual([])
    expect(await tree()).toHaveLength(4)
  })
})
