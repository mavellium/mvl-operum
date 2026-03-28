// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    sprint: { findMany: vi.fn(), findUnique: vi.fn() },
    timeEntry: { findMany: vi.fn() },
    card: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}))

import prisma from '@/lib/prisma'
import { getSprintMetrics, getUserMetrics, getGlobalKPIs, getSprintDashboard } from '@/services/dashboardService'

const mockPrisma = prisma as {
  sprint: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> }
  timeEntry: { findMany: ReturnType<typeof vi.fn> }
  card: { findMany: ReturnType<typeof vi.fn> }
  user: { findMany: ReturnType<typeof vi.fn> }
}

beforeEach(() => vi.clearAllMocks())

describe('getSprintMetrics', () => {
  it('calculates cost and hours for a sprint', async () => {
    mockPrisma.timeEntry.findMany.mockResolvedValue([
      { duration: 7200, user: { valorHora: 50 } }, // 2h × 50 = R$100
      { duration: 3600, user: { valorHora: 80 } }, // 1h × 80 = R$80
    ])
    mockPrisma.card.findMany.mockResolvedValue([
      { id: 'c1', endDate: new Date('2024-01-01'), column: { title: 'Concluído' } },
      { id: 'c2', endDate: new Date('2025-01-01'), column: { title: 'A Fazer' } },
    ])
    const metrics = await getSprintMetrics('s1')
    expect(metrics.horasTotais).toBeCloseTo(3)
    expect(metrics.custoTotal).toBeCloseTo(180)
    expect(metrics.cardsTotal).toBe(2)
  })
})

describe('getUserMetrics', () => {
  it('returns metrics per user', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Ana', valorHora: 50, timeEntries: [{ duration: 3600 }, { duration: 1800 }] },
    ])
    const metrics = await getUserMetrics('b1')
    expect(metrics).toHaveLength(1)
    expect(metrics[0].horasTotais).toBeCloseTo(1.5)
    expect(metrics[0].custoTotal).toBeCloseTo(75)
  })
})

describe('getGlobalKPIs', () => {
  it('returns consolidated KPIs', async () => {
    mockPrisma.sprint.findMany.mockResolvedValue([{ id: 's1', name: 'Sprint 1' }])
    mockPrisma.card.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
    mockPrisma.timeEntry.findMany.mockResolvedValue([])
    mockPrisma.user.findMany.mockResolvedValue([])
    const kpis = await getGlobalKPIs('b1')
    expect(kpis).toHaveProperty('totalSprints')
    expect(kpis).toHaveProperty('totalCards')
    expect(kpis).toHaveProperty('custoTotal')
  })
})

describe('getSprintDashboard', () => {
  it('returns sprint data with metrics', async () => {
    const now = new Date()
    mockPrisma.sprint.findUnique.mockResolvedValue({
      id: 's1',
      name: 'Sprint 1',
      status: 'ACTIVE',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-03-15'),
      qualidade: 8,
      dificuldade: 6,
    })
    mockPrisma.timeEntry.findMany.mockResolvedValue([
      { duration: 7200, user: { valorHora: 50 } },
    ])
    mockPrisma.card.findMany.mockResolvedValue([
      { id: 'c1', endDate: null, column: { title: 'Concluído' } },
      { id: 'c2', endDate: new Date(now.getTime() - 86400000), column: { title: 'A Fazer' } },
    ])
    const result = await getSprintDashboard('s1')
    expect(result.sprint.name).toBe('Sprint 1')
    expect(result.sprint.qualidade).toBe(8)
    expect(result.metrics.horasTotais).toBeCloseTo(2)
    expect(result.metrics.custoTotal).toBeCloseTo(100)
    expect(result.metrics.cardsTotal).toBe(2)
  })

  it('throws NotFoundError when sprint does not exist', async () => {
    mockPrisma.sprint.findUnique.mockResolvedValue(null)
    await expect(getSprintDashboard('nonexistent')).rejects.toThrow(/não encontrado/i)
  })
})
