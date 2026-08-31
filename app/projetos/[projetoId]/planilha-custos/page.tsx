import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { getTree } from '@/services/wbsService'
import { computePlanilha } from '@/lib/custosCalc'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Planilha de Custos' }

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default async function PlanilhaCustosPage({
  params,
}: {
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  const { tenantId } = await verifySession()

  const project = await findById(projetoId)
  if (!project) notFound()

  const valorReferencia = project.valorReferencia ?? 4000
  const horasPorDia = project.horasPorDia ?? 8
  const valorPorMinuto = Math.round(valorReferencia / (horasPorDia * 22 * 60) * 10000) / 10000

  const tree = await getTree(projetoId, tenantId)
  const planilha = computePlanilha(tree.nodes, tree.rootId, { valorPorMinuto, horasPorDia })

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Planilha de Custos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Derivada da EAP · {project.name} · {brl(valorPorMinuto * 60)}/h
            </p>
          </div>
          {planilha.rows.length > 0 && (
            <a
              href={`/api/projetos/${projetoId}/planilha-custos/export`}
              download
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Exportar .xlsx
            </a>
          )}
        </div>

        {planilha.rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500">Nenhuma tarefa derivável da EAP.</p>
            <p className="text-sm text-gray-400 mt-1">Crie itens na EAP para gerar a planilha de custos.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Código', 'Título da Edl', 'Unid.', 'Qtd.', 'Situação', 'Data Início', 'Data Fim', 'Custo Previsto', 'Custo Real'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {planilha.rows.map(r => (
                    <tr key={r.id} className={r.éFolha ? 'bg-white' : 'bg-blue-50/40'}>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{r.codigo}</td>
                      <td className={`px-4 py-2 ${r.éFolha ? 'text-gray-800' : 'font-semibold text-gray-900'}`}>
                        {r.éFolha ? r.titulo : `» ${r.titulo}`}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{r.unidade}</td>
                      <td className="px-4 py-2 text-gray-600">{r.quantidade}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                          {r.situacao}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.dataInicio ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{r.dataFim ?? '—'}</td>
                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{brl(r.custoPrevisto)}</td>
                      <td className="px-4 py-2 text-gray-900 whitespace-nowrap">{brl(r.custoReal)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-100/50 font-bold">
                    <td className="px-4 py-3" colSpan={7}>TOTAL</td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{brl(planilha.totalPrevisto)}</td>
                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{brl(planilha.totalReal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
