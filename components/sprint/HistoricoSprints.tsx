import type { EventoHistoricoSprint } from '@/services/sprintHistoricoService'

const ACAO: Record<string, { label: string; cls: string }> = {
  CREATE: { label: 'Criada', cls: 'bg-green-50 text-green-700 border-green-200' },
  UPDATE: { label: 'Alterada', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  DELETE: { label: 'Excluída', cls: 'bg-red-50 text-red-700 border-red-200' },
}
const CAMPO: Record<string, string> = {
  name: 'Nome', status: 'Status', startDate: 'Início', endDate: 'Fim', description: 'Descrição', qualidade: 'Qualidade', dificuldade: 'Dificuldade',
}
const STATUS: Record<string, string> = { PLANNED: 'Planejada', ACTIVE: 'Ativa', COMPLETED: 'Concluída' }

function valor(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (campo === 'status' && typeof v === 'string') return STATUS[v] ?? v
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [a, m, d] = v.split('-'); return `${d}/${m}/${a}` }
  return String(v)
}
const horas = (s: number) => `${Math.floor(s / 3600)}h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')}m`

/** Histórico de alterações das sprints do projeto (criação, alteração e exclusão, com motivo). */
export default function HistoricoSprints({ eventos }: { eventos: EventoHistoricoSprint[] }) {
  return (
    <details className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100">
      <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-gray-800">
        Histórico de alterações das sprints ({eventos.length})
      </summary>
      {eventos.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-gray-500">Nenhuma alteração registrada ainda.</p>
      ) : (
        <ol className="px-5 pb-5 flex flex-col gap-3">
          {eventos.map(e => {
            const acao = ACAO[e.acao] ?? { label: e.acao, cls: 'bg-gray-50 text-gray-700 border-gray-200' }
            const alteracoes = Object.entries(e.alteracoes)
            return (
              <li key={e.id} className="border-l-2 border-gray-200 pl-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${acao.cls}`}>{acao.label}</span>
                  <span className="font-medium text-gray-900">{e.nome || 'Sprint'}</span>
                  <span className="text-gray-500">
                    {new Date(e.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {e.usuario ? ` · ${e.usuario}` : ' · sistema'}
                    {e.origem === 'eap' ? ' · pela EAP' : ''}
                  </span>
                </div>
                {alteracoes.length > 0 && e.acao === 'UPDATE' && (
                  <ul className="mt-1 text-xs text-gray-600">
                    {alteracoes.map(([campo, { de, para }]) => (
                      <li key={campo}>{CAMPO[campo] ?? campo}: {valor(campo, de)} → {valor(campo, para)}</li>
                    ))}
                  </ul>
                )}
                {e.acao === 'DELETE' && (
                  <div className="mt-1 text-xs text-gray-600">
                    {e.resumo && <p>Tinha {e.resumo.cards ?? 0} card{e.resumo.cards === 1 ? '' : 's'}{e.resumo.segundosRegistrados ? ` e ${horas(e.resumo.segundosRegistrados)} registradas` : ''}.</p>}
                    {e.motivo && <p><span className="font-semibold">Motivo:</span> {e.motivo}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </details>
  )
}
