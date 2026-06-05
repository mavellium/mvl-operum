'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import { Download, Save, History, Check, X } from 'lucide-react'
import StakeholderDocument, {
  type ProjetoHeader,
  type Stakeholder,
} from './StakeholderDocument'
import Modal from '@/components/ui/Modal'
import Drawer from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'

type DocumentData = { header: ProjetoHeader; stakeholders: Stakeholder[] }

interface EditableFields {
  elaboradoPor: string
  aprovadoPor: string
  versao: string
  dataAprovacaoRaw: string
}

interface DocumentVersion {
  id: string
  commitTitle: string
  versao: string
  elaboradoPor: string
  aprovadoPor: string
  dataAprovacao: string
  authorId: string | null
  author: { name: string } | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt: string | null
  approvedById: string | null
  createdAt: string
}

const DEFAULTS: EditableFields = {
  elaboradoPor: '',
  aprovadoPor: '',
  versao: '1.0',
  dataAprovacaoRaw: '',
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

const STATUS_BADGE: Record<DocumentVersion['status'], string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<DocumentVersion['status'], string> = {
  PENDING:  'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function DocumentoStakeholders() {
  const { projetoId } = useParams<{ projetoId: string }>()
  const documentRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const [data, setData] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isManager, setIsManager] = useState(false)

  // Campos editáveis — inicializados a partir da versão APPROVED mais recente (carregada no useEffect)
  const [editable, setEditable] = useState<EditableFields>(DEFAULTS)

  // Histórico
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const debouncedSearch = useDebounce(historySearch, 300)

  // Modal de commit
  const [commitModalOpen, setCommitModalOpen] = useState(false)
  const [commitTitle, setCommitTitle] = useState('')
  const [savingVersion, setSavingVersion] = useState(false)

  // Aprovação em andamento
  const [actingVersionId, setActingVersionId] = useState<string | null>(null)
  const initializedFromDB = useRef(false)

  // ── Carregamento inicial ────────────────────────────────────────────────────

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

  const loadVersions = useCallback(
    async (search = '') => {
      if (!projetoId) return
      try {
        const url = search
          ? `/api/projects/${projetoId}/documento/versions?search=${encodeURIComponent(search)}`
          : `/api/projects/${projetoId}/documento/versions`
        const r = await fetch(url)
        if (!r.ok) return
        const list: DocumentVersion[] = await r.json()
        setVersions(list)

        // Extrai isManager do header para controlar visibilidade dos botões de aprovação
        setIsManager(r.headers.get('x-is-manager') === 'true')

        // Inicializa campos com o payload da versão APPROVED mais recente (somente uma vez)
        if (!initializedFromDB.current && search === '') {
          const approved = list.find(v => v.status === 'APPROVED')
          if (approved) {
            initializedFromDB.current = true
            setEditable({
              elaboradoPor: approved.elaboradoPor,
              aprovadoPor:  approved.aprovadoPor,
              versao:       approved.versao,
              dataAprovacaoRaw: approved.dataAprovacao,
            })
          }
        }
      } catch {
        // não crítico
      }
    },
    [projetoId],
  )

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadVersions() }, [loadVersions])

  // ── Busca com debounce no drawer ────────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (historyOpen) loadVersions(debouncedSearch)
  }, [debouncedSearch, historyOpen, loadVersions])

  // ── Impressão ───────────────────────────────────────────────────────────────

  const handlePrint = useReactToPrint({
    contentRef: documentRef,
    documentTitle: 'Formulário de parte interessada',
    onBeforePrint: async () => { document.title = 'Formulário de parte interessada' },
    onAfterPrint: () => { document.title = 'Documentação | Mavellium' },
    pageStyle: `
      @page { size: A4; margin: 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  })

  // ── Commit (salvar versão) ──────────────────────────────────────────────────

  function openCommitModal() {
    setCommitTitle('')
    setCommitModalOpen(true)
  }

  async function handleConfirmCommit() {
    if (!projetoId || !commitTitle.trim()) return
    setSavingVersion(true)
    try {
      const r = await fetch(`/api/projects/${projetoId}/documento/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitTitle: commitTitle.trim(),
          versao: editable.versao,
          elaboradoPor: editable.elaboradoPor,
          aprovadoPor: editable.aprovadoPor,
          dataAprovacao: toDisplayDate(editable.dataAprovacaoRaw) || editable.dataAprovacaoRaw,
        }),
      })
      if (r.ok) {
        setCommitModalOpen(false)
        await loadVersions()
        toast('Versão salva com sucesso!')
      } else {
        const e = await r.json()
        toast(e.error ?? 'Erro ao salvar versão', 'error')
      }
    } catch {
      toast('Erro de rede ao salvar versão', 'error')
    } finally {
      setSavingVersion(false)
    }
  }

  // ── Aprovação / Rejeição ────────────────────────────────────────────────────

  async function handleVersionAction(versionId: string, action: 'approve' | 'reject') {
    if (!projetoId) return
    setActingVersionId(versionId)
    try {
      const r = await fetch(
        `/api/projects/${projetoId}/documento/versions/${versionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      )
      if (r.ok) {
        await loadVersions(debouncedSearch)
        toast(action === 'approve' ? 'Versão aprovada!' : 'Versão rejeitada.', action === 'approve' ? 'success' : 'warning')
      } else {
        const e = await r.json()
        toast(e.error ?? 'Erro ao processar ação', 'error')
      }
    } catch {
      toast('Erro de rede', 'error')
    } finally {
      setActingVersionId(null)
    }
  }

  // ── Helpers de renderização ─────────────────────────────────────────────────

  function update(field: keyof EditableFields, value: string) {
    setEditable(prev => ({ ...prev, [field]: value }))
  }

  const mergedHeader: ProjetoHeader | null = data
    ? {
        ...data.header,
        elaboradoPor: editable.elaboradoPor,
        aprovadoPor: editable.aprovadoPor,
        versao: editable.versao,
        dataAprovacao: toDisplayDate(editable.dataAprovacaoRaw),
      }
    : null

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

        {/* Barra de ações */}
        <div className="flex justify-end gap-2">
          {/* Botão de histórico — ícone discreto */}
          <button
            aria-label="Histórico de versões"
            onClick={() => setHistoryOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-2 text-slate-600 text-sm rounded-xl hover:bg-white hover:shadow transition-all"
          >
            <History className="w-4 h-4" />
            {versions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {versions.length > 99 ? '99+' : versions.length}
              </span>
            )}
          </button>

          <button
            onClick={openCommitModal}
            disabled={loading || !!error || !data || savingVersion}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Salvar Versão
          </button>

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

      {/* States */}
      {loading && (
        <div className="bg-white animate-pulse rounded shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }} />
      )}
      {error && (
        <div className="w-[210mm] rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 text-sm">
          {error}
        </div>
      )}
      {mergedHeader && !loading && (
        <div className="shadow-2xl">
          <StakeholderDocument ref={documentRef} header={mergedHeader} stakeholders={data!.stakeholders} />
        </div>
      )}

      {/* ── Modal de commit ───────────────────────────────────────────────── */}
      <Modal
        isOpen={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        title="Salvar alteração"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className={labelClass}>Título da alteração <span className="text-red-500">*</span></label>
            <input
              className={inputClass}
              value={commitTitle}
              onChange={e => setCommitTitle(e.target.value)}
              placeholder="Ex: Atualização dos aprovadores"
              onKeyDown={e => { if (e.key === 'Enter' && commitTitle.trim()) handleConfirmCommit() }}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">Descreva brevemente o que foi alterado.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setCommitModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmCommit}
              disabled={!commitTitle.trim() || savingVersion}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              {savingVersion ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Drawer de histórico ───────────────────────────────────────────── */}
      <Drawer
        isOpen={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistorySearch('') }}
        title="Histórico de versões"
        width="w-[420px]"
      >
        <div className="flex flex-col h-full">
          {/* Busca */}
          <div className="px-4 py-3 border-b border-slate-100">
            <input
              className={inputClass}
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Buscar por título ou autor…"
              aria-label="Buscar no histórico"
            />
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {versions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">Nenhuma versão encontrada.</p>
            ) : (
              versions.map(v => (
                <div key={v.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{v.commitTitle || '(sem título)'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {v.author?.name ?? 'Usuário desconhecido'} ·{' '}
                        {new Date(v.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">v{v.versao}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[v.status]}`}>
                      {STATUS_LABEL[v.status]}
                    </span>
                  </div>

                  {/* Botões de aprovação — somente para gerentes e versões pendentes */}
                  {isManager && v.status === 'PENDING' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleVersionAction(v.id, 'approve')}
                        disabled={actingVersionId === v.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" /> Aprovar
                      </button>
                      <button
                        onClick={() => handleVersionAction(v.id, 'reject')}
                        disabled={actingVersionId === v.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3 h-3" /> Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Drawer>
    </div>
  )
}
