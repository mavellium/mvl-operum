'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
import { Save, History, Download } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Drawer from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import MacroFaseTable, { type MacroFase } from './MacroFaseTable'
import ProjectCharterDocument from './ProjectCharterDocument'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CharterProject {
  id: string
  name: string
  logoUrl: string | null
  startDate: string | null
  justificativa: string | null
  objetivos: string | null
  metodologia: string | null
  descricaoProduto: string | null
  premissas: string | null
  restricoes: string | null
  limitesAutoridade: string | null
}

interface Gerente {
  name: string
  signatureUrl: string | null
}

interface CharterData {
  project: CharterProject
  macroFases: MacroFase[]
  gerente: Gerente | null
  gerenteProjeto: string
  membros: { name: string }[]
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

interface VersionMeta {
  elaboradoPor: string
  aprovadoPor: string
  versao: string
  dataAprovacaoRaw: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

function toDisplayDate(raw: string): string {
  if (!raw) return ''
  return new Date(raw + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Shared style constants ─────────────────────────────────────────────────────

const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1'
const inputClass =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
const textareaClass = inputClass + ' resize-none leading-relaxed'
const sectionTitle = 'text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 pb-1 border-b border-slate-200'

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectCharter() {
  const { projetoId } = useParams<{ projetoId: string }>()
  const printRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Charter data
  const [data, setData] = useState<CharterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editable text fields (mirrors DB, auto-saved)
  const [fields, setFields] = useState({
    justificativa: '',
    objetivos: '',
    metodologia: '',
    descricaoProduto: '',
    premissas: '',
    restricoes: '',
    limitesAutoridade: '',
    principaisEnvolvidos: '',
  })
  const debouncedFields = useDebounce(fields, 1200)
  const savedFields = useRef(fields)
  const firstLoad = useRef(true)

  // MacroFases (local state, synced with server)
  const [fases, setFases] = useState<MacroFase[]>([])
  const [faseSaving, setFaseSaving] = useState<Record<string, boolean>>({})
  const [newestFaseId, setNewestFaseId] = useState<string | undefined>(undefined)

  // Versioning
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [isManager, setIsManager] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const debouncedSearch = useDebounce(historySearch, 300)
  const [commitModalOpen, setCommitModalOpen] = useState(false)
  const [commitTitle, setCommitTitle] = useState('')
  const [savingVersion, setSavingVersion] = useState(false)
  const [actingVersionId, setActingVersionId] = useState<string | null>(null)
  const [versionMeta, setVersionMeta] = useState<VersionMeta>({
    elaboradoPor: '', aprovadoPor: '', versao: '1.0', dataAprovacaoRaw: '',
  })
  const initializedMeta = useRef(false)

  // ── Load charter data ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!projetoId) return
    fetch(`/api/projects/${projetoId}/charter`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error)))
      .then((d: CharterData) => {
        setData(d)
        setFases(d.macroFases)
        const p = d.project
        const init = {
          justificativa: p.justificativa ?? '',
          objetivos: p.objetivos ?? '',
          metodologia: p.metodologia ?? '',
          descricaoProduto: p.descricaoProduto ?? '',
          premissas: p.premissas ?? '',
          restricoes: p.restricoes ?? '',
          limitesAutoridade: p.limitesAutoridade ?? '',
          principaisEnvolvidos: '',
        }
        setFields(init)
        savedFields.current = init
        firstLoad.current = false
      })
      .catch(e => setError(typeof e === 'string' ? e : 'Erro ao carregar Termo de Abertura'))
      .finally(() => setLoading(false))
  }, [projetoId])

  // ── Auto-save text fields ──────────────────────────────────────────────────

  useEffect(() => {
    if (firstLoad.current) return
    const { principaisEnvolvidos: _, ...serverFields } = debouncedFields
    const { principaisEnvolvidos: __, ...savedServer } = savedFields.current
    if (JSON.stringify(serverFields) === JSON.stringify(savedServer)) return

    fetch(`/api/projects/${projetoId}/charter`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serverFields),
    })
      .then(r => { if (r.ok) { savedFields.current = debouncedFields } })
      .catch(() => {/* silent — user can retry via save version */})
  }, [debouncedFields, projetoId])

  // ── Load versions ──────────────────────────────────────────────────────────

  const loadVersions = useCallback(async (search = '') => {
    if (!projetoId) return
    try {
      const url = search
        ? `/api/projects/${projetoId}/charter/versions?search=${encodeURIComponent(search)}`
        : `/api/projects/${projetoId}/charter/versions`
      const r = await fetch(url)
      if (!r.ok) return
      const list: DocumentVersion[] = await r.json()
      setVersions(list)
      setIsManager(r.headers.get('x-is-manager') === 'true')
      if (!initializedMeta.current && search === '') {
        const approved = list.find(v => v.status === 'APPROVED')
        if (approved) {
          initializedMeta.current = true
          setVersionMeta({
            elaboradoPor: approved.elaboradoPor,
            aprovadoPor: approved.aprovadoPor,
            versao: approved.versao,
            dataAprovacaoRaw: approved.dataAprovacao,
          })
        }
      }
    } catch {/* non-critical */}
  }, [projetoId])

  useEffect(() => { loadVersions() }, [loadVersions])
  useEffect(() => {
    if (historyOpen) loadVersions(debouncedSearch)
  }, [debouncedSearch, historyOpen, loadVersions])

  // ── Macro fases ────────────────────────────────────────────────────────────

  async function handleAddFase() {
    if (!projetoId) return
    const r = await fetch(`/api/projects/${projetoId}/macro-fases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fase: '', dataLimite: null, custo: null }),
    })
    if (r.ok) {
      const created: MacroFase = await r.json()
      setFases(prev => [...prev, created])
      setNewestFaseId(created.id)
    }
  }

  function handleFaseChange(id: string, field: keyof Omit<MacroFase, 'id'>, value: string) {
    setFases(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))
    clearTimeout((handleFaseChange as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleFaseChange as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(async () => {
      setFaseSaving(s => ({ ...s, [id]: true }))
      await fetch(`/api/projects/${projetoId}/macro-fases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      }).catch(() => {})
      setFaseSaving(s => ({ ...s, [id]: false }))
    }, 800)
  }

  async function handleRemoveFase(id: string) {
    if (!projetoId) return
    setFases(prev => prev.filter(f => f.id !== id))
    await fetch(`/api/projects/${projetoId}/macro-fases/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Termo de Abertura de Projeto',
    pageStyle: `
      @page { size: A4; margin: 15mm 20mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  })

  // ── Commit (save version) ──────────────────────────────────────────────────

  async function handleConfirmCommit() {
    if (!projetoId || !commitTitle.trim()) return
    setSavingVersion(true)
    try {
      const r = await fetch(`/api/projects/${projetoId}/charter/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitTitle: commitTitle.trim(),
          versao: versionMeta.versao,
          elaboradoPor: versionMeta.elaboradoPor,
          aprovadoPor: versionMeta.aprovadoPor,
          dataAprovacao: toDisplayDate(versionMeta.dataAprovacaoRaw) || versionMeta.dataAprovacaoRaw,
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

  // ── Version approve/reject ─────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center">
        <div className="bg-white animate-pulse rounded shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-300 flex items-center justify-center p-8">
        <div className="w-[210mm] rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 text-sm">{error}</div>
      </div>
    )
  }

  const autoSaving = Object.values(faseSaving).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-300 flex flex-col items-center py-8 gap-6">
      {/* ── Version meta ──────────────────────────────────────────────────── */}
      <div className="w-[210mm] bg-white rounded-xl shadow-md p-5 grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Elaborado por</label>
          <input className={inputClass} value={versionMeta.elaboradoPor}
            onChange={e => setVersionMeta(m => ({ ...m, elaboradoPor: e.target.value }))}
            placeholder="Nome do responsável" />
        </div>
        <div>
          <label className={labelClass}>Aprovado por</label>
          <input className={inputClass} value={versionMeta.aprovadoPor}
            onChange={e => setVersionMeta(m => ({ ...m, aprovadoPor: e.target.value }))}
            placeholder="Nome do aprovador" />
        </div>
        <div>
          <label className={labelClass}>Versão</label>
          <input className={inputClass} value={versionMeta.versao}
            onChange={e => setVersionMeta(m => ({ ...m, versao: e.target.value }))}
            placeholder="1.0" />
        </div>
        <div>
          <label className={labelClass}>Data de aprovação</label>
          <input type="date" className={inputClass} value={versionMeta.dataAprovacaoRaw}
            onChange={e => setVersionMeta(m => ({ ...m, dataAprovacaoRaw: e.target.value }))} />
        </div>
      </div>

      {/* ── Action bar ────────────────────────────────────────────────────── */}
      <div className="w-[210mm] flex justify-end gap-2">
        {autoSaving && <span className="self-center text-xs text-slate-400 mr-2">Salvando…</span>}
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
          onClick={() => { setCommitTitle(''); setCommitModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          Salvar Versão
        </button>
        <button
          onClick={() => handlePrint()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Baixar PDF
        </button>
      </div>

      {/* ── A4 Document ───────────────────────────────────────────────────── */}
      <div className="shadow-2xl">
        <ProjectCharterDocument
          ref={printRef}
          nomeProjeto={data?.project.name ?? ''}
          logoUrl={data?.project.logoUrl}
          gerenteProjeto={data?.gerenteProjeto ?? ''}
          gerenteSignatureUrl={data?.gerente?.signatureUrl}
          startDate={data?.project.startDate ?? null}
          elaboradoPor={versionMeta.elaboradoPor}
          aprovadoPor={versionMeta.aprovadoPor}
          versao={versionMeta.versao}
          dataAprovacao={toDisplayDate(versionMeta.dataAprovacaoRaw) || versionMeta.dataAprovacaoRaw}
          justificativa={fields.justificativa}
          objetivos={fields.objetivos}
          metodologia={fields.metodologia}
          descricaoProduto={fields.descricaoProduto}
          premissas={fields.premissas}
          restricoes={fields.restricoes}
          limitesAutoridade={fields.limitesAutoridade}
          principaisEnvolvidos={fields.principaisEnvolvidos}
          membros={data?.membros ?? []}
          fases={fases}
        />
      </div>

      {/* ── Editable form (screen only) ───────────────────────────────────── */}
      <div className="w-[210mm] flex flex-col gap-4 print:hidden">

        <FormSection title="1. Justificativa do Projeto">
          <textarea rows={5} className={textareaClass} value={fields.justificativa}
            onChange={e => setFields(f => ({ ...f, justificativa: e.target.value }))}
            placeholder="Descreva a justificativa do projeto…" />
        </FormSection>

        <FormSection title="2. Objetivo(s) do Projeto">
          <textarea rows={5} className={textareaClass} value={fields.objetivos}
            onChange={e => setFields(f => ({ ...f, objetivos: e.target.value }))}
            placeholder="Liste os objetivos do projeto…" />
        </FormSection>

        <FormSection title="3. Metodologia do Projeto">
          <textarea rows={4} className={textareaClass} value={fields.metodologia}
            onChange={e => setFields(f => ({ ...f, metodologia: e.target.value }))}
            placeholder="Descreva a metodologia utilizada…" />
        </FormSection>

        <FormSection title="4. Descrição do Produto do Projeto">
          <textarea rows={4} className={textareaClass} value={fields.descricaoProduto}
            onChange={e => setFields(f => ({ ...f, descricaoProduto: e.target.value }))}
            placeholder="Descreva o produto que será entregue…" />
        </FormSection>

        <FormSection title="5. Premissas e Restrições">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Premissas (Hipóteses)</label>
              <textarea rows={4} className={textareaClass} value={fields.premissas}
                onChange={e => setFields(f => ({ ...f, premissas: e.target.value }))}
                placeholder="Liste as premissas assumidas…" />
            </div>
            <div>
              <label className={labelClass}>Restrições (Imposições)</label>
              <textarea rows={4} className={textareaClass} value={fields.restricoes}
                onChange={e => setFields(f => ({ ...f, restricoes: e.target.value }))}
                placeholder="Liste as restrições do projeto…" />
            </div>
          </div>
        </FormSection>

        <FormSection title="6. Macro Fases, Prazos e Custos">
          <MacroFaseTable
            fases={fases}
            onChange={handleFaseChange}
            onAdd={handleAddFase}
            onRemove={handleRemoveFase}
            autoFocusId={newestFaseId}
          />
        </FormSection>

        <FormSection title="7. Principais Envolvidos">
          <label className={labelClass}>Instituição / Professores / Outros (manual, uma linha por pessoa)</label>
          <textarea rows={3} className={textareaClass} value={fields.principaisEnvolvidos}
            onChange={e => setFields(f => ({ ...f, principaisEnvolvidos: e.target.value }))}
            placeholder="Ex: Prof. João Silva – Orientador&#10;FATEC São Paulo" />
        </FormSection>

        <FormSection title="8. Limites de Autoridade do Gerente">
          <textarea rows={4} className={textareaClass} value={fields.limitesAutoridade}
            onChange={e => setFields(f => ({ ...f, limitesAutoridade: e.target.value }))}
            placeholder="Descreva os limites de autoridade do gerente…" />
        </FormSection>
      </div>

      {/* ── Commit modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={commitModalOpen} onClose={() => setCommitModalOpen(false)} title="Salvar alteração" maxWidth="max-w-sm">
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className={labelClass}>Título da alteração <span className="text-red-500">*</span></label>
            <input
              className={inputClass}
              value={commitTitle}
              onChange={e => setCommitTitle(e.target.value)}
              placeholder="Ex: Inclusão da metodologia ágil"
              onKeyDown={e => { if (e.key === 'Enter' && commitTitle.trim()) handleConfirmCommit() }}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">Descreva brevemente o que foi alterado.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCommitModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
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

      {/* ── History drawer ────────────────────────────────────────────────── */}
      <Drawer
        isOpen={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistorySearch('') }}
        title="Histórico de versões – Termo de Abertura"
        width="w-[420px]"
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-slate-100">
            <input
              className={inputClass}
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Buscar por título ou autor…"
            />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {versions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">Nenhuma versão encontrada.</p>
            ) : (
              versions.map(v => (
                <div key={v.id} className="px-4 py-3 flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{v.commitTitle}</span>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[v.status]}`}>
                      {STATUS_LABEL[v.status]}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    v{v.versao} · {v.author?.name ?? 'Desconhecido'} · {new Date(v.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {isManager && v.status === 'PENDING' && (
                    <div className="flex gap-2 mt-1">
                      <button
                        disabled={actingVersionId === v.id}
                        onClick={() => handleVersionAction(v.id, 'approve')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        Aprovar
                      </button>
                      <button
                        disabled={actingVersionId === v.id}
                        onClick={() => handleVersionAction(v.id, 'reject')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        Rejeitar
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5">
      <p className={`${sectionTitle}`}>{title}</p>
      {children}
    </div>
  )
}
