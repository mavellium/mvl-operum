'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { removerAtaAction } from '@/app/actions/atas'

export interface AtaListItem {
  id: string
  numero: number
  data: string
  elaboradoPor: string
  local: string | null
}

interface Props {
  projetoId: string
  atas: AtaListItem[]
  gerente: boolean
}

function RemoverAtaButton({ ataId, projetoId, numero }: { ataId: string; projetoId: string; numero: number }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!confirm(`Remover a ata ${String(numero).padStart(2, '0')}?`)) return
    setSaving(true)
    const result = await removerAtaAction(ataId, projetoId)
    if (!('error' in result)) {
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={saving}
      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
    >
      Remover
    </button>
  )
}

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '—'
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR')
}

export default function DocumentoAtas({ projetoId, atas, gerente }: Props) {
  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Atas de Reunião</h2>
          <p className="text-sm text-gray-500 mt-0.5">Registro e exportação das atas do projeto.</p>
        </div>
        <Link
          href={`/projetos/${projetoId}/atas/nova`}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          + Nova Ata
        </Link>
      </div>

      {atas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500">Nenhuma ata registrada ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em “+ Nova Ata” para criar a primeira.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {atas.map(ata => (
            <div
              key={ata.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold">
                  {String(ata.numero).padStart(2, '0')}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{fmtDate(ata.data)}</p>
                  <p className="text-sm text-gray-500">
                    Elaborado por {ata.elaboradoPor || '—'}
                    {ata.local ? ` · ${ata.local}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/projetos/${projetoId}/atas/${ata.id}`}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                >
                  Ver / Editar
                </Link>
                <a
                  href={`/api/atas/${ata.id}/export`}
                  className="px-3 py-1.5 text-sm text-white bg-gray-800 hover:bg-gray-900 rounded-lg font-medium"
                  download
                >
                  Exportar .docx
                </a>
                {gerente && <RemoverAtaButton ataId={ata.id} projetoId={projetoId} numero={ata.numero} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
