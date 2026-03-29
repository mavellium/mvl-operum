// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    timeEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import {
  startTimer, pauseTimer, getActiveTimer, getTotalDuration, addManualTimeEntry,
  getTimeEntries, updateTimeEntry, deleteTimeEntry,
} from '@/services/timeService'

const mockPrisma = prisma as {
  timeEntry: {
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => vi.clearAllMocks())

describe('startTimer', () => {
  it('stops any running timer and creates new one', async () => {
    mockPrisma.timeEntry.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.timeEntry.create.mockResolvedValue({ id: 't1', userId: 'u1', cardId: 'c1', isRunning: true, duration: 0 })

    const result = await startTimer('u1', 'c1')
    expect(mockPrisma.timeEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1', isRunning: true }) })
    )
    expect(mockPrisma.timeEntry.create).toHaveBeenCalled()
    expect(result.isRunning).toBe(true)
  })
})

describe('pauseTimer', () => {
  it('updates running entry with endedAt and accumulated duration', async () => {
    const startedAt = new Date(Date.now() - 60000) // 60s ago
    mockPrisma.timeEntry.findFirst.mockResolvedValue({
      id: 't1', userId: 'u1', cardId: 'c1', isRunning: true, startedAt, duration: 30,
    })
    mockPrisma.timeEntry.update.mockResolvedValue({ id: 't1', isRunning: false, duration: 90 })

    const result = await pauseTimer('u1', 'c1')
    expect(mockPrisma.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isRunning: false }),
      })
    )
    expect(result).toBeDefined()
  })

  it('returns null if no running timer', async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue(null)
    const result = await pauseTimer('u1', 'c1')
    expect(result).toBeNull()
  })
})

describe('getActiveTimer', () => {
  it('returns running timer if exists', async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue({ id: 't1', isRunning: true })
    const result = await getActiveTimer('u1', 'c1')
    expect(result?.isRunning).toBe(true)
  })

  it('returns null if no active timer', async () => {
    mockPrisma.timeEntry.findFirst.mockResolvedValue(null)
    const result = await getActiveTimer('u1', 'c1')
    expect(result).toBeNull()
  })
})

describe('getTotalDuration', () => {
  it('returns sum of all durations for user+card', async () => {
    mockPrisma.timeEntry.aggregate.mockResolvedValue({ _sum: { duration: 360 } })
    const total = await getTotalDuration('u1', 'c1')
    expect(total).toBe(360)
  })

  it('returns 0 if no entries', async () => {
    mockPrisma.timeEntry.aggregate.mockResolvedValue({ _sum: { duration: null } })
    const total = await getTotalDuration('u1', 'c1')
    expect(total).toBe(0)
  })
})

describe('addManualTimeEntry', () => {
  it('creates TimeEntry with isManual true and isRunning false', async () => {
    mockPrisma.timeEntry.create.mockResolvedValue({
      id: 't1', userId: 'u1', cardId: 'c1', isManual: true, isRunning: false, duration: 5400,
    })
    const result = await addManualTimeEntry('u1', 'c1', 5400)
    expect(mockPrisma.timeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isManual: true, isRunning: false, duration: 5400 }),
      }),
    )
    expect(result.isManual).toBe(true)
    expect(result.isRunning).toBe(false)
  })

  it('sets duration correctly from seconds param', async () => {
    mockPrisma.timeEntry.create.mockResolvedValue({
      id: 't2', userId: 'u1', cardId: 'c1', isManual: true, isRunning: false, duration: 3600,
    })
    await addManualTimeEntry('u1', 'c1', 3600)
    const callData = mockPrisma.timeEntry.create.mock.calls[0][0].data
    expect(callData.duration).toBe(3600)
  })

  it('stores description when provided', async () => {
    mockPrisma.timeEntry.create.mockResolvedValue({
      id: 't3', userId: 'u1', cardId: 'c1', isManual: true, isRunning: false, duration: 1800, description: 'Reunião',
    })
    await addManualTimeEntry('u1', 'c1', 1800, 'Reunião')
    const callData = mockPrisma.timeEntry.create.mock.calls[0][0].data
    expect(callData.description).toBe('Reunião')
  })
})

describe('getTimeEntries', () => {
  it('returns completed entries for user+card ordered by createdAt desc', async () => {
    const entries = [
      { id: 't2', duration: 3600, description: null, createdAt: new Date('2024-01-02') },
      { id: 't1', duration: 1800, description: 'Revisão', createdAt: new Date('2024-01-01') },
    ]
    mockPrisma.timeEntry.findMany.mockResolvedValue(entries)
    const result = await getTimeEntries('u1', 'c1')
    expect(mockPrisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u1', cardId: 'c1', isRunning: false }),
        orderBy: { createdAt: 'desc' },
      })
    )
    expect(result).toHaveLength(2)
  })

  it('returns empty array if no entries', async () => {
    mockPrisma.timeEntry.findMany.mockResolvedValue([])
    const result = await getTimeEntries('u1', 'c1')
    expect(result).toEqual([])
  })
})

describe('updateTimeEntry', () => {
  it('updates duration and description when user is owner', async () => {
    mockPrisma.timeEntry.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' })
    mockPrisma.timeEntry.update.mockResolvedValue({ id: 't1', duration: 7200, description: 'Atualizado' })
    const result = await updateTimeEntry('t1', 'u1', { duration: 7200, description: 'Atualizado' })
    expect(mockPrisma.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({ duration: 7200, description: 'Atualizado' }),
      })
    )
    expect(result.duration).toBe(7200)
  })

  it('throws if entry not found', async () => {
    mockPrisma.timeEntry.findUnique.mockResolvedValue(null)
    await expect(updateTimeEntry('t99', 'u1', { duration: 3600 })).rejects.toThrow('não encontrado')
  })

  it('throws if user is not owner', async () => {
    mockPrisma.timeEntry.findUnique.mockResolvedValue({ id: 't1', userId: 'u2' })
    await expect(updateTimeEntry('t1', 'u1', { duration: 3600 })).rejects.toThrow('permissão')
  })
})

describe('deleteTimeEntry', () => {
  it('deletes entry when user is owner', async () => {
    mockPrisma.timeEntry.findUnique.mockResolvedValue({ id: 't1', userId: 'u1' })
    mockPrisma.timeEntry.delete.mockResolvedValue({ id: 't1' })
    await deleteTimeEntry('t1', 'u1')
    expect(mockPrisma.timeEntry.delete).toHaveBeenCalledWith({ where: { id: 't1' } })
  })

  it('throws if entry not found', async () => {
    mockPrisma.timeEntry.findUnique.mockResolvedValue(null)
    await expect(deleteTimeEntry('t99', 'u1')).rejects.toThrow('não encontrado')
  })

  it('throws if user is not owner', async () => {
    mockPrisma.timeEntry.findUnique.mockResolvedValue({ id: 't1', userId: 'u2' })
    await expect(deleteTimeEntry('t1', 'u1')).rejects.toThrow('permissão')
  })
})
