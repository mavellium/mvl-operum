// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sprintsApi } from '@/lib/api-client'
import { GlobalDashboardSchema, SprintDashboardSchema } from '@/sprint-service/src/dashboard/dashboard-contract'
const empty = { kpis: { totalSprints: 0, totalCards: 0, horasTotais: 0, custoTotal: 0 }, userMetrics: [], memberMetrics: [], overdueCards: [], sprintMetrics: [] }
beforeEach(() => vi.restoreAllMocks())
describe('contratos do dashboard', () => {
  it('aceita vazio válido sem inventar campos ausentes', () => {
    expect(GlobalDashboardSchema.parse(empty)).toEqual(empty)
    expect(GlobalDashboardSchema.safeParse({ kpis: empty.kpis }).success).toBe(false)
    expect(SprintDashboardSchema.safeParse({ metrics: {} }).success).toBe(false)
  })
  it.each(['global', 'sprint'])('cliente recusa resposta inválida do dashboard %s', async kind => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ resposta: 'incompatível' }))
    await expect(kind === 'global' ? sprintsApi.getGlobalMetrics() : sprintsApi.getSprintDashboard('s1')).rejects.toThrow('Resposta inválida do serviço de dashboard')
  })
  it('cliente preserva recusa HTTP em vez de convertê-la em zeros', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ error: 'Sem permissão' }, { status: 403 }))
    await expect(sprintsApi.getGlobalMetrics()).rejects.toMatchObject({ status: 403, message: 'Sem permissão' })
  })
})
