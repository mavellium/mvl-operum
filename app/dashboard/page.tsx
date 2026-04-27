import { getDashboardDataAction } from '@/app/actions/dashboard'
import KPICard from '@/components/dashboard/KPICard'
import SprintCostChart from '@/components/dashboard/SprintCostChart'
import UserHoursChart from '@/components/dashboard/UserHoursChart'
import UserRankingTable from '@/components/dashboard/UserRankingTable'
import MemberMetricsTable from '@/components/dashboard/MemberMetricsTable'
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

export default async function DashboardPage() {
  const result = await getDashboardDataAction()

  if ('error' in result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{result.error}</p>
        <Link href="/projetos" className="text-blue-600 hover:underline text-sm">Voltar às sprints</Link>
      </div>
    )
  }

  const { kpis, userMetrics, memberMetrics, overdueCards, sprintMetrics } = result

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/projetos" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Sprints" value={kpis.totalSprints} color="blue" />
          <KPICard label="Cards" value={kpis.totalCards} color="purple" />
          <KPICard label="Horas totais" value={formatHours(kpis.horasTotais)} color="amber" />
          <KPICard label="Custo total" value={formatCurrency(kpis.custoTotal)} color="green" sub="baseado em valor/hora" />
        </div>

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

        {sprintMetrics.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Resumo por Sprint</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-500 pb-2">Sprint</th>
                  <th className="text-right font-medium text-gray-500 pb-2">Cards</th>
                  <th className="text-right font-medium text-gray-500 pb-2">Concluídos</th>
                  <th className="text-right font-medium text-gray-500 pb-2">Horas</th>
                  <th className="text-right font-medium text-gray-500 pb-2">Custo</th>
                </tr>
              </thead>
              <tbody>
                {sprintMetrics.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{s.cardsTotal}</td>
                    <td className="py-2.5 text-right text-green-600">{s.cardsConcluidos}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatHours(s.horasTotais)}</td>
                    <td className="py-2.5 text-right font-medium text-green-700">{formatCurrency(s.custoTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Ranking de Usuários</h2>
          <UserRankingTable users={userMetrics} />
        </div>

        {memberMetrics.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Métricas por Membro</h2>
            <MemberMetricsTable members={memberMetrics} />
          </div>
        )}

        {overdueCards.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Tarefas Pendentes / Atrasadas</h2>
            <p className="text-sm text-gray-400 mb-4">{overdueCards.length} card{overdueCards.length !== 1 ? 's' : ''} com prazo vencido</p>
            <OverdueCardsList cards={overdueCards} />
          </div>
        )}
      </main>
    </div>
  )
}
