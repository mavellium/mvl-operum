// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    timeEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

import prisma from '@/lib/prisma'
import { startTimer, pauseTimer, getActiveTimer, getTotalDuration } from '@/services/timeService'

const mockPrisma = prisma as {
  timeEntry: {
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
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
