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
import { createSprint, updateSprint, completeSprint, deleteSprint, getAllSprints, findAllByProjeto } from '@/services/sprintService'

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
    await expect(createSprint({ name: '' })).rejects.toThrow()
  })

  it('creates sprint record and returns it', async () => {
    mockPrisma.sprint.create.mockResolvedValue({
      id: 's1',
      name: 'Sprint 1',
      status: 'PLANNED',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const sprint = await createSprint({ name: 'Sprint 1' })
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

describe('sprintService (with projeto)', () => {
  it('should create sprint with projectId', async () => {
    mockPrisma.sprint.create.mockResolvedValue({
      id: 's2',
      name: 'Sprint in Project',
      projectId: 'p1',
      status: 'PLANNED',
    })
    const sprint = await createSprint({ name: 'Sprint in Project', projectId: 'p1' })
    expect(sprint.projectId).toBe('p1')
    expect(mockPrisma.sprint.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ projectId: 'p1' }),
    })
  })

  it('should return only sprints from given projeto in findAllByProjeto', async () => {
    mockPrisma.sprint.findMany.mockResolvedValue([
      { id: 's1', name: 'Sprint 1', projectId: 'p1' },
    ])

    const sprints = await findAllByProjeto('p1')
    expect(sprints).toHaveLength(1)
    expect(mockPrisma.sprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: 'p1', deletedAt: null }),
      }),
    )
  })
})

describe('sprintService (soft delete)', () => {
  it('should not return sprints with deletedAt set in getAllSprints', async () => {
    mockPrisma.sprint.findMany.mockResolvedValue([])
    await getAllSprints()
    expect(mockPrisma.sprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    )
  })

  it('should not return sprint with deletedAt set in findUnique (updateSprint)', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(null) // simulates deletedAt filter
    await expect(updateSprint('s-deleted', { name: 'test' })).rejects.toThrow(/não encontrado/i)
    expect(mockPrisma.sprint.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 's-deleted', deletedAt: null }),
      }),
    )
  })

  it('should set deletedAt instead of hard delete', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue({ id: 's1', deletedAt: null })
    mockPrisma.sprint.update.mockResolvedValue({ id: 's1', deletedAt: expect.any(Date) })
    await deleteSprint('s1')
    expect(mockPrisma.sprint.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
  })
})
