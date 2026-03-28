// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    sprint: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    card: {
      update: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { createSprint, updateSprint, assignCardToSprint, completeSprint } from '@/services/sprintService'

const mockPrisma = prisma as {
  sprint: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  card: {
    update: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSprint', () => {
  it('throws ValidationError on invalid schema (empty name)', async () => {
    await expect(createSprint({ name: '', boardId: 'b1' })).rejects.toThrow()
  })

  it('creates sprint record and returns it', async () => {
    mockPrisma.sprint.create.mockResolvedValue({
      id: 's1',
      name: 'Sprint 1',
      boardId: 'b1',
      status: 'PLANNED',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const sprint = await createSprint({ name: 'Sprint 1', boardId: 'b1' })
    expect(mockPrisma.sprint.create).toHaveBeenCalledOnce()
    expect(sprint.name).toBe('Sprint 1')
  })
})

describe('updateSprint', () => {
  it('throws NotFoundError when sprint does not exist', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(null)
    await expect(updateSprint('nonexistent', { name: 'New name' })).rejects.toThrow(/não encontrado/i)
  })

  it('updates and returns the sprint', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue({ id: 's1', name: 'Sprint 1', status: 'PLANNED' })
    mockPrisma.sprint.update.mockResolvedValue({ id: 's1', name: 'Sprint Updated', status: 'ACTIVE' })
    const result = await updateSprint('s1', { name: 'Sprint Updated', status: 'ACTIVE' })
    expect(result.name).toBe('Sprint Updated')
  })
})

describe('assignCardToSprint', () => {
  it('updates card sprintId', async () => {
    mockPrisma.card.update.mockResolvedValue({ id: 'c1', sprintId: 's1' })
    await assignCardToSprint('c1', 's1')
    expect(mockPrisma.card.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { sprintId: 's1' },
    })
  })

  it('sets sprintId to null to remove from sprint', async () => {
    mockPrisma.card.update.mockResolvedValue({ id: 'c1', sprintId: null })
    await assignCardToSprint('c1', null)
    expect(mockPrisma.card.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { sprintId: null },
    })
  })
})

describe('completeSprint', () => {
  it('sets sprint status to COMPLETED', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue({ id: 's1', status: 'ACTIVE' })
    mockPrisma.sprint.update.mockResolvedValue({ id: 's1', status: 'COMPLETED' })
    const result = await completeSprint('s1')
    expect(mockPrisma.sprint.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { status: 'COMPLETED' },
    })
    expect(result.status).toBe('COMPLETED')
  })
})
