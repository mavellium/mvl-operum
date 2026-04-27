'use client'

import { useRef, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import { Download } from 'lucide-react'
import StakeholderDocument, {
  type ProjetoHeader,
  type Stakeholder,
} from './StakeholderDocument'

type DocumentData = { header: ProjetoHeader; stakeholders: Stakeholder[] }

interface EditableFields {
  elaboradoPor: string
  aprovadoPor: string
  versao: string
  dataAprovacaoRaw: string  // yyyy-mm-dd para o input type="date"
}

const DEFAULTS: EditableFields = {
  elaboradoPor: '',
  aprovadoPor: '',
  versao: '1.0',
  dataAprovacaoRaw: '',
}

function storageKey(projetoId: string) {
  return `doc-fields-${projetoId}`
}

function toDisplayDate(raw: string): string {
  if (!raw) return ''
  return new Date(raw + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const labelClass = 'block text-sm font-semibold text-slate-700 mb-1'
const inputClass =
  'w-full border-2 border-slate-400 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

export default function DocumentoStakeholders() {
  const { projetoId } = useParams<{ projetoId: string }>()
  const documentRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editable, setEditable] = useState<EditableFields>(() => {
    if (!projetoId || typeof window === 'undefined') return DEFAULTS
    try {
      const saved = localStorage.getItem(storageKey(projetoId))
      return saved ? (JSON.parse(saved) as EditableFields) : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  // Persist to localStorage on every change
  useEffect(() => {
    if (!projetoId) return
    try {
      localStorage.setItem(storageKey(projetoId), JSON.stringify(editable))
    } catch {
      // ignore
    }
  }, [projetoId, editable])

  useEffect(() => {
    if (!projetoId) return
    fetch(`/api/projects/${projetoId}/documento`)
      .then(r =>
        r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error)),
      )
      .then((d: DocumentData) => setData(d))
      .catch(e => setError(typeof e === 'string' ? e : 'Erro ao carregar documento'))
      .finally(() => setLoading(false))
  }, [projetoId])

  const handlePrint = useReactToPrint({
    contentRef: documentRef,
    documentTitle: 'Formulário de parte interessada',
    onBeforePrint: async () => {
      document.title = 'Formulário de parte interessada'
    },
    onAfterPrint: () => {
      document.title = 'Documentação | Mavellium'
    },
    pageStyle: `
      @page { size: A4; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  })

  const mergedHeader: ProjetoHeader | null = data
    ? {
        ...data.header,
        elaboradoPor: editable.elaboradoPor,
        aprovadoPor: editable.aprovadoPor,
        versao: editable.versao,
        dataAprovacao: toDisplayDate(editable.dataAprovacaoRaw),
      }
    : null

  function update(field: keyof EditableFields, value: string) {
    setEditable(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-300 flex flex-col items-center py-8 gap-6">
      <div className="w-[210mm] flex flex-col gap-3">
        {/* Campos editáveis */}
        {!loading && !error && data && (
          <div className="bg-white rounded-xl shadow-md p-5 grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Elaborado por</label>
              <input
                className={inputClass}
                value={editable.elaboradoPor}
                onChange={e => update('elaboradoPor', e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
            <div>
              <label className={labelClass}>Aprovado por</label>
              <input
                className={inputClass}
                value={editable.aprovadoPor}
                onChange={e => update('aprovadoPor', e.target.value)}
                placeholder="Nome do aprovador"
              />
            </div>
            <div>
              <label className={labelClass}>Versão</label>
              <input
                className={inputClass}
                value={editable.versao}
                onChange={e => update('versao', e.target.value)}
                placeholder="1.0"
              />
            </div>
            <div>
              <label className={labelClass}>Data de aprovação</label>
              <input
                type="date"
                className={inputClass}
                value={editable.dataAprovacaoRaw}
                onChange={e => update('dataAprovacaoRaw', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Botão PDF */}
        <div className="flex justify-end">
          <button
            onClick={() => handlePrint()}
            disabled={loading || !!error || !data}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Baixar PDF
          </button>
        </div>
      </div>

      {loading && (
        <div
          className="bg-white animate-pulse rounded shadow-2xl"
          style={{ width: '210mm', minHeight: '297mm' }}
        />
      )}

      {error && (
        <div className="w-[210mm] rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {mergedHeader && !loading && (
        <div className="shadow-2xl">
          <StakeholderDocument
            ref={documentRef}
            header={mergedHeader}
            stakeholders={data!.stakeholders}
          />
        </div>
      )}
    </div>
  )
}
