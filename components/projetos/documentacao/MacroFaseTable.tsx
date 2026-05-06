'use client'

import { Plus, Trash2 } from 'lucide-react'

export interface MacroFase {
  id: string
  fase: string
  dataLimite: string | null
  custo: string | null
}

interface Props {
  fases: MacroFase[]
  onChange: (id: string, field: keyof Omit<MacroFase, 'id'>, value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  disabled?: boolean
}

function parseCusto(value: string | null | undefined): number {
  if (!value) return 0
  const n = parseFloat(value.replace(/[^0-9,.]/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const thClass = 'px-3 py-2 text-xs font-semibold text-slate-600 text-left border-b border-slate-200'
const tdClass = 'px-2 py-1.5'
const inputClass =
  'w-full bg-transparent border border-transparent rounded px-2 py-1 text-sm text-slate-800 ' +
  'hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors'

export default function MacroFaseTable({ fases, onChange, onAdd, onRemove, disabled }: Props) {
  const total = fases.reduce((sum, f) => sum + parseCusto(f.custo), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className={thClass} style={{ width: '40%' }}>Macro Fase</th>
            <th className={thClass} style={{ width: '25%' }}>Data Limite</th>
            <th className={thClass} style={{ width: '25%' }}>Custo (R$)</th>
            <th className={`${thClass} text-center`} style={{ width: '10%' }}></th>
          </tr>
        </thead>
        <tbody>
          {fases.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-sm">
                Nenhuma macro fase cadastrada.
              </td>
            </tr>
          )}
          {fases.map(f => (
            <tr key={f.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
              <td className={tdClass}>
                <input
                  className={inputClass}
                  value={f.fase}
                  onChange={e => onChange(f.id, 'fase', e.target.value)}
                  placeholder="Nome da fase"
                  disabled={disabled}
                />
              </td>
              <td className={tdClass}>
                <input
                  type="date"
                  className={inputClass}
                  value={f.dataLimite ?? ''}
                  onChange={e => onChange(f.id, 'dataLimite', e.target.value)}
                  disabled={disabled}
                />
              </td>
              <td className={tdClass}>
                <input
                  className={inputClass}
                  value={f.custo ?? ''}
                  onChange={e => onChange(f.id, 'custo', e.target.value)}
                  placeholder="0,00"
                  disabled={disabled}
                />
              </td>
              <td className={`${tdClass} text-center`}>
                <button
                  onClick={() => onRemove(f.id)}
                  disabled={disabled}
                  className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30"
                  aria-label="Remover fase"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
            <td className="px-3 py-2 text-sm text-slate-700" colSpan={2}>
              <button
                onClick={onAdd}
                disabled={disabled}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar fase
              </button>
            </td>
            <td className="px-3 py-2 text-sm text-slate-800" colSpan={2}>
              Total:{' '}
              <span className="font-bold">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
