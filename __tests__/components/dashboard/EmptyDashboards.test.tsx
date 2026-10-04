import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '@/app/dashboard/page'
import SprintDashboardContent from '@/components/dashboard/SprintDashboardContent'
import { getDashboardDataAction, getSprintDashboardAction } from '@/app/actions/dashboard'
vi.mock('@/lib/dal', () => ({ verifySession: vi.fn().mockResolvedValue({ role: 'member' }) }))
vi.mock('@/app/actions/dashboard', () => ({ getDashboardDataAction: vi.fn(), getSprintDashboardAction: vi.fn() }))
vi.mock('@/app/actions/sprintBoard', () => ({ updateSprintMetaAction: vi.fn() }))
afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())
describe('dashboards vazios', () => {
  it('global renderiza KPIs zero sem erro de contrato', async () => {
    vi.mocked(getDashboardDataAction).mockResolvedValue({ kpis: { totalSprints: 0, totalCards: 0, horasTotais: 0, custoTotal: 0 }, userMetrics: [], memberMetrics: [], overdueCards: [], sprintMetrics: [] })
    render(await DashboardPage())
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('0min')).toBeInTheDocument()
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument()
  })
  it('sprint renderiza métricas zero e feedbacks vazios', async () => {
    vi.mocked(getSprintDashboardAction).mockResolvedValue({ sprint: { id: 's1', projectId: 'p1', name: 'Sprint vazia', status: 'PLANNED', startDate: null, endDate: null, qualidade: null, dificuldade: null }, metrics: { horasTotais: 0, custoTotal: 0, cardsTotal: 0, cardsConcluidos: 0, cardsAtrasados: 0 }, userMetrics: [], cardsByColumn: [], overdueCards: [], feedbacks: [], avgQualidade: null, avgDificuldade: null })
    render(await SprintDashboardContent({ sprintId: 's1' }))
    expect(screen.getByRole('heading', { name: 'Sprint vazia' })).toBeInTheDocument()
    expect(screen.getByText('0min')).toBeInTheDocument()
  })
})
