// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundException, UnauthorizedException } from '@nestjs/common'

vi.mock('../prisma', () => ({
  prisma: {
    project: { findFirst: vi.fn() },
    sprint: { findFirst: vi.fn() },
    sprintColumn: { findFirst: vi.fn() },
    card: { findFirst: vi.fn() },
    tag: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    timeEntry: { findFirst: vi.fn() },
  },
}))

import { prisma } from '../prisma'
import {
  tenantIdFromHeaders,
  assertProject,
  assertSprint,
  assertColumn,
  assertCard,
  assertTag,
  assertUserInTenant,
  assertTimeEntry,
} from './tenant-scope'

const db = prisma as unknown as Record<string, { findFirst: ReturnType<typeof vi.fn> }>

beforeEach(() => vi.clearAllMocks())

describe('tenantIdFromHeaders', () => {
  it('devolve o x-tenant-id injetado pelo gateway', () => {
    expect(tenantIdFromHeaders({ 'x-tenant-id': 'tenant-a' })).toBe('tenant-a')
  })

  it('rejeita (401) quando o header está ausente, vazio ou duplicado', () => {
    expect(() => tenantIdFromHeaders({})).toThrow(UnauthorizedException)
    expect(() => tenantIdFromHeaders({ 'x-tenant-id': '' })).toThrow(UnauthorizedException)
    expect(() => tenantIdFromHeaders({ 'x-tenant-id': ['a', 'b'] })).toThrow(UnauthorizedException)
  })
})

describe('asserts de tenant', () => {
  const cases: [string, keyof typeof db, () => Promise<void>, Record<string, unknown>][] = [
    ['assertProject', 'project', () => assertProject('t1', 'p1'), { id: 'p1', tenantId: 't1' }],
    ['assertSprint', 'sprint', () => assertSprint('t1', 's1'), { id: 's1', deletedAt: null, project: { tenantId: 't1' } }],
    [
      'assertColumn',
      'sprintColumn',
      () => assertColumn('t1', 's1', 'c1'),
      { id: 'c1', sprintId: 's1', deletedAt: null, sprint: { project: { tenantId: 't1' } } },
    ],
    [
      'assertCard',
      'card',
      () => assertCard('t1', 'k1'),
      { id: 'k1', deletedAt: null, OR: [{ project: { tenantId: 't1' } }, { sprint: { project: { tenantId: 't1' } } }] },
    ],
    ['assertTag', 'tag', () => assertTag('t1', 'g1'), { id: 'g1', tenantId: 't1' }],
    ['assertUserInTenant', 'user', () => assertUserInTenant('t1', 'u1'), { id: 'u1', tenantId: 't1' }],
    [
      'assertTimeEntry',
      'timeEntry',
      () => assertTimeEntry('t1', 'e1'),
      { id: 'e1', deletedAt: null, card: { OR: [{ project: { tenantId: 't1' } }, { sprint: { project: { tenantId: 't1' } } }] } },
    ],
  ]

  for (const [name, model, call, expectedWhere] of cases) {
    it(`${name} consulta escopada pelo tenant e passa quando encontra`, async () => {
      db[model].findFirst.mockResolvedValue({ id: 'x' })
      await expect(call()).resolves.toBeUndefined()
      expect(db[model].findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }))
    })

    it(`${name} responde 404 quando o recurso é de outro tenant (ou não existe)`, async () => {
      db[model].findFirst.mockResolvedValue(null)
      await expect(call()).rejects.toThrow(NotFoundException)
    })
  }
})
