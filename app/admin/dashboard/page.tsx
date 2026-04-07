import prisma from '@/lib/prisma'
import { getGlobalKPIs, getSprintsWithMetrics, getOverdueCards, getUserMetrics, getSprintMetrics } from '@/services/dashboardService'
import KPICard from '@/components/dashboard/KPICard'
import SprintCostChart from '@/components/dashboard/SprintCostChart'
import UserHoursChart from '@/components/dashboard/UserHoursChart'
import UserRankingTable from '@/components/dashboard/UserRankingTable'
import OverdueCardsList from '@/components/dashboard/OverdueCardsList'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)}min`
  return `${h.toFixed(1)}h`
}

function formatCurrency(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function getAdminDashboardData() {
  const [kpis, sprintMetricsRaw, overdueCards, userMetrics, projetos] = await Promise.all([
    getGlobalKPIs(),
    getSprintsWithMetrics(),
    getOverdueCards(),
    getUserMetrics(),
    prisma.projeto.findMany({
      where: { deletedAt: null },
      include: {
        sprints: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
        _count: { select: { sprints: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const sprintMetrics = sprintMetricsRaw.map(({ sprint, metrics }) => ({
    id: sprint.id,
    name: sprint.name,
    ...metrics,
  }))

  // Calculate per-project metrics
  const projetoMetrics = await Promise.all(
    projetos.map(async p => {
      const sprintIds = p.sprints.map(s => s.id)
      let totalCards = 0
      let totalConcluidos = 0
      let totalHoras = 0
      let totalCusto = 0

      if (sprintIds.length > 0) {
        const metricsArr = await Promise.all(sprintIds.map(id => getSprintMetrics(id)))
        for (const m of metricsArr) {
          totalCards += m.cardsTotal
          totalConcluidos += m.cardsConcluidos
          totalHoras += m.horasTotais
          totalCusto += m.custoTotal
        }
      }

      const pctConcluido = totalCards > 0 ? Math.round((totalConcluidos / totalCards) * 100) : 0
      const sprintsAtivas = p.sprints.filter(s => s.status === 'ACTIVE').length

      return {
        id: p.id,
        nome: p.nome,
        descricao: p.descricao,
        status: p.status,
        createdAt: p.createdAt,
        totalSprints: p._count.sprints,
        sprintsAtivas,
        totalCards,
        totalConcluidos,
        pctConcluido,
        totalHoras,
        totalCusto,
      }
    }),
  )

  const activeProjetos = projetoMetrics.filter(p => p.status === 'ATIVO')
  const concludedProjetos = projetoMetrics.filter(p => p.status === 'CONCLUIDO')

  return { kpis, sprintMetrics, overdueCards, userMetrics, activeProjetos, concludedProjetos }
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ATIVO:     { label: 'Ativo',     cls: 'bg-green-100 text-green-700' },
  INATIVO:   { label: 'Inativo',   cls: 'bg-gray-100 text-gray-500' },
  CONCLUIDO: { label: 'Concluído', cls: 'bg-blue-100 text-blue-700' },
  ARQUIVADO: { label: 'Arquivado', cls: 'bg-amber-100 text-amber-700' },
}

export default async function AdminDashboardPage() {
  const { kpis, sprintMetrics, overdueCards, userMetrics, activeProjetos, concludedProjetos } = await getAdminDashboardData()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Dashboard Global</h1>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Projetos ativos" value={activeProjetos.length} color="blue" />
          <KPICard label="Sprints" value={kpis.totalSprints} color="purple" />
          <KPICard label="Horas totais" value={formatHours(kpis.horasTotais)} color="amber" />
          <KPICard label="Custo total" value={formatCurrency(kpis.custoTotal)} color="green" sub="baseado em valor/hora" />
        </div>

        {/* Alerts */}
        {overdueCards.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium text-amber-800">{overdueCards.length} card{overdueCards.length !== 1 ? 's' : ''} atrasados</span>
            </div>
            <OverdueCardsList cards={overdueCards.slice(0, 5)} />
            {overdueCards.length > 5 && (
              <p className="text-xs text-amber-600 mt-2">{overdueCards.length - 5} cards adicionais não exibidos</p>
            )}
          </div>
        )}

        {/* Active projects with rich metrics */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Projetos Ativos</h2>
            <Link href="/projetos" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
          </div>
          {activeProjetos.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum projeto ativo</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left font-medium text-gray-500 pb-2">Projeto</th>
                    <th className="text-center font-medium text-gray-500 pb-2">Conclusão</th>
                    <th className="text-center font-medium text-gray-500 pb-2">Sprints</th>
                    <th className="text-right font-medium text-gray-500 pb-2">Horas</th>
                    <th className="text-right font-medium text-gray-500 pb-2">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjetos.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3">
                        <Link href={`/projetos/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {p.nome}
                        </Link>
                        {p.descricao && <p className="text-xs text-gray-400 truncate max-w-xs">{p.descricao}</p>}
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.pctConcluido}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{p.pctConcluido}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-center text-gray-600">
                        {p.sprintsAtivas > 0 && <span className="text-green-600 font-medium">{p.sprintsAtivas} ativa{p.sprintsAtivas !== 1 ? 's' : ''}</span>}
                        {p.sprintsAtivas > 0 && p.totalSprints > p.sprintsAtivas && ' / '}
                        {p.totalSprints > p.sprintsAtivas && <span className="text-gray-400">{p.totalSprints} total</span>}
                        {p.totalSprints === 0 && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 text-right text-gray-600 tabular-nums">{formatHours(p.totalHoras)}</td>
                      <td className="py-3 text-right font-medium text-green-700 tabular-nums">{formatCurrency(p.totalCusto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Custo por Sprint</h2>
            <SprintCostChart data={sprintMetrics} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Horas por Usuário</h2>
            <UserHoursChart data={userMetrics} />
          </div>
        </div>

        {/* User ranking */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Ranking de Usuários</h2>
          <UserRankingTable users={userMetrics} />
        </div>

        {/* Concluded projects */}
        {concludedProjetos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Projetos Concluídos</h2>
            <div className="space-y-2">
              {concludedProjetos.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <Link href={`/projetos/${p.id}`} className="text-sm text-gray-700 hover:text-blue-600">
                    {p.nome}
                  </Link>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{p.totalSprints} sprints</span>
                    <span>{formatHours(p.totalHoras)}</span>
                    <span className="text-green-600 font-medium">{formatCurrency(p.totalCusto)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
