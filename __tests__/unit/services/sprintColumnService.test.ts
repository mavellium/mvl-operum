// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    sprintColumn: {
      create: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    card: {
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import {
  createSprintColumn,
  getSprintColumns,
  initSprintColumns,
  moveCardInSprint,
} from '@/services/sprintColumnService'

const mockPrisma = prisma as {
  sprintColumn: {
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
  }
  card: { update: ReturnType<typeof vi.fn> }
}

beforeEach(() => vi.clearAllMocks())

describe('createSprintColumn', () => {
  it('creates a column with title and position', async () => {
    mockPrisma.sprintColumn.create.mockResolvedValue({ id: 'sc1', title: 'A Fazer', position: 0 })
    const result = await createSprintColumn('s1', 'A Fazer', 0)
    expect(mockPrisma.sprintColumn.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sprintId: 's1', title: 'A Fazer', position: 0 }) })
    )
    expect(result.title).toBe('A Fazer')
  })
})

describe('getSprintColumns', () => {
  it('returns columns ordered by position', async () => {
    const cols = [
      { id: 'sc1', title: 'A Fazer', position: 0 },
      { id: 'sc2', title: 'Em Andamento', position: 1 },
    ]
    mockPrisma.sprintColumn.findMany.mockResolvedValue(cols)
    const result = await getSprintColumns('s1')
    expect(result).toHaveLength(2)
    expect(mockPrisma.sprintColumn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sprintId: 's1' }, orderBy: { position: 'asc' } })
    )
  })
})

describe('initSprintColumns', () => {
  it('creates 3 default columns', async () => {
    mockPrisma.sprintColumn.createMany.mockResolvedValue({ count: 3 })
    await initSprintColumns('s1')
    expect(mockPrisma.sprintColumn.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ title: 'A Fazer', position: 0 }),
          expect.objectContaining({ title: 'Em Andamento', position: 1 }),
          expect.objectContaining({ title: 'Concluído', position: 2 }),
        ]),
      })
    )
  })
})

describe('moveCardInSprint', () => {
  it('updates card sprintColumnId and sprintPosition', async () => {
    mockPrisma.card.update.mockResolvedValue({ id: 'c1', sprintColumnId: 'sc2', sprintPosition: 3 })
    await moveCardInSprint('c1', 'sc2', 3)
    expect(mockPrisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { sprintColumnId: 'sc2', sprintPosition: 3 },
      })
    )
  })
})
