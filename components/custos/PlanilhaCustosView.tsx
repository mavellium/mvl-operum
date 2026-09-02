'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Download, UserPlus, Undo2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { updateNodePropertiesAction } from '@/app/actions/wbs'
import { addMemberAction } from '@/app/actions/projetos'
import { fmtDataBR, type PlanilhaDeCustos, type SituacaoAtividade, type Elaborador } from '@/lib/planilhaCustos'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

interface Props {
  projetoId: string
  nomeProjeto: string
  inicioProjeto: string
  fimProjeto: string
  canEdit: boolean
  planilha: PlanilhaDeCustos
  elaboradores: Elaborador[]
  usuariosDisponiveis: { id: string; name: string; email: string }[]
  exportUrl: string
}

type CampoLinha = Partial<{
  minOrcado: string
  materiaisOrcado: string
  dataPrevista: string
  minReal: string
  materiaisReal: string
  dataRealizacao: string
  elaboradoPorUserId: string
  elaboradoPor: string
}>

const SITUACAO_CLASS: Record<SituacaoAtividade, string> = {
  Antecipada: 'bg-emerald-100 text-emerald-800',
  'No prazo': 'bg-blue-100 text-blue-800',
  Atrasada: 'bg-red-100 text-red-800',
  Pendente: 'bg-gray-100 text-gray-700',
}

const CORES_PIE = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#dc2626', '#0d9488', '#ca8a04', '#4f46e5']

const num = (v: string | undefined, fallback: number): number => {
  if (v === undefined) return fallback
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const hhmm = (min: number): string => {
  const h = Math.floor(Math.abs(min) / 60)
  const m = String(Math.abs(min) % 60).padStart(2, '0')
  return `${h}:${m}`
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dois = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PlanilhaCustosView({
  projetoId, nomeProjeto, inicioProjeto, fimProjeto, canEdit, planilha, elaboradores, usuariosDisponiveis, exportUrl,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { config } = planilha

  const [rascunho, setRascunho] = useState<Record<string, CampoLinha>>({})
  const [historia, setHistoria] = useState<Record<string, CampoLinha>[]>([])
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState<Record<string, CampoLinha>>({})
  const [mostrarNovoMembro, setMostrarNovoMembro] = useState(false)
  const dirtyCount = Object.keys(rascunho).reduce((acc, nodeId) => {
    const cur = rascunho[nodeId]
    if (!cur || Object.keys(cur).length === 0) return acc
    const s = salvo[nodeId]
    if (!s) return acc + 1
    return JSON.stringify(s) !== JSON.stringify(cur) ? acc + 1 : acc
  }, 0)

  // ── Undo (Ctrl+Z) ────────────────────────────────────────────────────────────
  const setCampo = useCallback((nodeId: string, campo: keyof CampoLinha, valor: string) => {
    setRascunho(prev => {
      setHistoria(h => [...h.slice(-99), prev])
      return { ...prev, [nodeId]: { ...(prev[nodeId] ?? {}), [campo]: valor } }
    })
  }, [])

  const desfazer = useCallback(() => {
    setHistoria(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setRascunho(prev)
      return h.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        desfazer()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [desfazer])

  const valorDe = (nodeId: string, campo: keyof CampoLinha, original: string | number | null | undefined): string => {
    const r = rascunho[nodeId]?.[campo]
    if (r !== undefined) return r
    if (original === null || original === undefined) return ''
    return String(original)
  }

  const esborcoPorCurrent = (nodeId: string, originalUserId: string | null): string => {
    const r = rascunho[nodeId]?.elaboradoPorUserId
    if (r !== undefined) return r
    return originalUserId ?? ''
  }

  // ── Auto-save (debounce) ──────────────────────────────────────────────────────
  const salvarRef = useRef<() => void>(() => {})
  salvarRef.current = useCallback(async () => {
    if (Object.keys(rascunho).length === 0) return
    setSalvando(true)
    const erros: string[] = []
    for (const [nodeId, campos] of Object.entries(rascunho)) {
      const props: Record<string, unknown> = {}
      if (campos.minOrcado !== undefined) props.tempoMinutos = Math.round(num(campos.minOrcado, 0))
      if (campos.materiaisOrcado !== undefined) props.materiais = Math.round(num(campos.materiaisOrcado, 0) * 100) / 100
      if (campos.dataPrevista !== undefined) props.dataPrevista = campos.dataPrevista || null
      if (campos.minReal !== undefined) props.tempoRealMinutos = Math.round(num(campos.minReal, 0))
      if (campos.materiaisReal !== undefined) props.materiaisReal = Math.round(num(campos.materiaisReal, 0) * 100) / 100
      if (campos.dataRealizacao !== undefined) props.dataRealizacao = campos.dataRealizacao || null
      if (campos.elaboradoPorUserId !== undefined) {
        props.elaboradoPorUserId = campos.elaboradoPorUserId || null
        const nome = elaboradores.find(e => e.userId === campos.elaboradoPorUserId)?.name ?? ''
        props.elaboradoPor = nome
      }
      if (campos.elaboradoPor !== undefined) props.elaboradoPor = campos.elaboradoPor.trim()

      const res = await updateNodePropertiesAction(projetoId, nodeId, props)
      if (!res.ok) erros.push(res.error)
    }
      setSalvando(false)
      if (erros.length > 0) {
        toast(erros[0], 'error')
      } else {
        setHistoria([])
        setSalvo(rascunho)
        toast('Alterações salvas automaticamente', 'success')
      }
  }, [rascunho, elaboradores, projetoId, toast])

  useEffect(() => {
    if (Object.keys(rascunho).length === 0) return
    const id = setTimeout(() => { salvarRef.current() }, 1000)
    return () => clearTimeout(id)
  }, [rascunho])

  const input = (nodeId: string, campo: keyof CampoLinha, original: string | number | null | undefined) => (
    <input
      type={campo === 'dataPrevista' || campo === 'dataRealizacao' ? 'date' : 'text'}
      inputMode={campo === 'minOrcado' || campo === 'minReal' ? 'numeric' : undefined}
      value={valorDe(nodeId, campo, original)}
      onChange={e => setCampo(nodeId, campo, e.target.value)}
      onFocus={e => (campo !== 'dataPrevista' && campo !== 'dataRealizacao') && e.target.select()}
      className="w-full min-w-[64px] rounded border border-gray-300 bg-white px-1.5 py-0.5 text-right text-xs focus:border-blue-500 focus:outline-none"
    />
  )
  const texto = (v: string) => <span className="text-xs tabular-nums text-gray-700">{v}</span>

  const semAtividades = planilha.macrofases.length === 0

  async function salvarManual() {
    await salvarRef.current()
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-6">
      {/* ── Cabeçalho (F.1) ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">O</div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Planilha de Custos</h1>
              <p className="text-sm text-gray-500">Projeto: <span className="font-medium text-gray-700">{nomeProjeto}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Horas por dia de trabalho: <strong className="text-gray-900">{config.horasPorDia}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-3">
          <span>Início do Projeto: <strong className="text-gray-900">{inicioProjeto}</strong></span>
          <span>Fim do Projeto: <strong className="text-gray-900">{fimProjeto}</strong></span>
          <span className="text-xs text-gray-500">R$ calculado pelo salário de quem elaborou (ou valor de referência quando sem salário).</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <a
            href={exportUrl}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" /> Exportar .xlsx
          </a>
          <button
            type="button"
            onClick={() => { router.refresh() }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Re-cria a lista de atividades a partir da árvore mais recente da EAP"
          >
            <RefreshCw className="h-4 w-4" /> Recalcular a partir da EAP
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={desfazer}
                disabled={historia.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title="Desfazer última alteração (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" /> Desfazer
              </button>
              <button
                type="button"
                onClick={() => setMostrarNovoMembro(v => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4" /> Adicionar elaborador
              </button>
            </>
          )}
          {canEdit && dirtyCount > 0 && (
            <button
              type="button"
              onClick={salvarManual}
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : `Salvar (${dirtyCount})`}
            </button>
          )}
        </div>

        {canEdit && mostrarNovoMembro && (
          <AdicionarElaborador
            projetoId={projetoId}
            elaboradores={elaboradores}
            usuariosDisponiveis={usuariosDisponiveis}
            onFechar={() => setMostrarNovoMembro(false)}
          />
        )}
      </div>

      {/* ── Tabela (F.2) ────────────────────────────────────────────────── */}
      {semAtividades ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-500">Nenhuma atividade derivável da EAP.</p>
          <p className="mt-1 text-sm text-gray-400">Crie macrofases com atividades folha na EAP para gerar a planilha de custos.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[1150px] border-collapse text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th rowSpan={2} className="border border-blue-800 px-2 py-2 text-left text-xs font-semibold">Macrofases</th>
                <th rowSpan={2} className="border border-blue-800 px-2 py-2 text-left text-xs font-semibold">Atividades</th>
                <th rowSpan={2} className="border border-blue-800 px-2 py-2 text-left text-xs font-semibold">Elaborada por</th>
                <th colSpan={7} className="border border-blue-800 px-2 py-2 text-center text-xs font-bold">VALOR ORÇADO</th>
                <th colSpan={8} className="border border-blue-800 px-2 py-2 text-center text-xs font-bold">VALOR REALIZADO</th>
              </tr>
              <tr className="bg-blue-100 text-blue-900">
                {['Min', 'Horas', 'Dias', 'R$', 'Materiais', 'Total', 'Data Prevista', 'Min', 'Horas', 'Dias', 'R$', 'Materiais', 'Total', 'Data Realização', 'Situação'].map((h, i) => (
                  <th key={i} className="border border-blue-200 px-2 py-1.5 text-center text-[11px] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {planilha.macrofases.map(fase => (
                <FragmentFase key={fase.nodeId} fase={fase} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Quadros-resumo (F.4) ────────────────────────────────────────── */}
      {!semAtividades && (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <QuadroValor planilha={planilha} />
          <QuadroTempo planilha={planilha} />
          <QuadroElaborador planilha={planilha} />
          <GraficoValor planilha={planilha} />
        </div>
      )}
    </div>
  )

  function FragmentFase({ fase }: { fase: PlanilhaDeCustos['macrofases'][number] }) {
    return (
      <>
        <tr className="bg-gray-100 font-semibold text-gray-800">
          <td colSpan={18} className="border border-gray-200 px-3 py-1.5 text-sm">{fase.codigo} {fase.titulo}</td>
        </tr>
        {fase.atividades.map(a => {
          const minO = num(rascunho[a.nodeId]?.minOrcado, a.minOrcado)
          const matO = num(rascunho[a.nodeId]?.materiaisOrcado, a.materiaisOrcado)
          const minR = num(rascunho[a.nodeId]?.minReal, a.minReal)
          const matR = num(rascunho[a.nodeId]?.materiaisReal, a.materiaisReal)
          const vpm = a.vpm
          const brutoO = minO * vpm
          const brutoR = minR * vpm
          const userId = esborcoPorCurrent(a.nodeId, a.elaboradoPorUserId)
          return (
            <tr key={a.nodeId} className="bg-white align-top hover:bg-blue-50/30">
              <td className="border border-gray-100 px-2 py-1"></td>
              <td className="border border-gray-100 px-2 py-1 text-xs whitespace-nowrap font-medium text-gray-800">
                {a.codigo} {a.titulo}
              </td>
              <td className="border border-gray-100 px-1 py-1">
                {canEdit ? (
                  <select
                    value={userId}
                    onChange={e => setCampo(a.nodeId, 'elaboradoPorUserId', e.target.value)}
                    className="w-full min-w-[110px] rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">—</option>
                    {elaboradores.map(e => (
                      <option key={e.userId} value={e.userId}>{e.name}</option>
                    ))}
                  </select>
                ) : texto(a.elaboradoPor)}
              </td>
              <td className="border border-gray-100 px-1 py-1 text-right">
                {canEdit ? input(a.nodeId, 'minOrcado', a.minOrcado) : texto(String(a.minOrcado))}
              </td>
              <td className="border border-gray-100 px-2 py-1 text-right">{texto(hhmm(minO))}</td>
              <td className="border border-gray-100 px-2 py-1 text-right">{texto(dois(minO / 60 / config.horasPorDia))}</td>
              <td className="border border-gray-100 px-2 py-1 text-right">{texto(brl(brutoO))}</td>
              <td className="border border-gray-100 px-1 py-1 text-right">
                {canEdit ? input(a.nodeId, 'materiaisOrcado', a.materiaisOrcado) : texto(dois(matO))}
              </td>
              <td className="border border-gray-100 px-2 py-1 text-right font-semibold text-gray-900">{texto(brl(brutoO + matO))}</td>
              <td className="border border-gray-100 px-1 py-1">
                {canEdit ? input(a.nodeId, 'dataPrevista', a.dataPrevista) : texto(fmtDataBR(a.dataPrevista))}
              </td>
              <td className="border border-gray-100 px-1 py-1 text-right">
                {canEdit ? input(a.nodeId, 'minReal', a.minReal) : texto(String(a.minReal))}
              </td>
              <td className="border border-gray-100 px-2 py-1 text-right">{texto(hhmm(minR))}</td>
              <td className="border border-gray-100 px-2 py-1 text-right">{texto(dois(minR / 60 / config.horasPorDia))}</td>
              <td className="border border-gray-100 px-2 py-1 text-right">{texto(brl(brutoR))}</td>
              <td className="border border-gray-100 px-1 py-1 text-right">
                {canEdit ? input(a.nodeId, 'materiaisReal', a.materiaisReal) : texto(dois(matR))}
              </td>
              <td className="border border-gray-100 px-2 py-1 text-right font-semibold text-gray-900">{texto(brl(brutoR + matR))}</td>
              <td className="border border-gray-100 px-1 py-1">
                {canEdit ? input(a.nodeId, 'dataRealizacao', a.dataRealizacao) : texto(fmtDataBR(a.dataRealizacao))}
              </td>
              <td className="border border-gray-100 px-1 py-1 text-center">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${SITUACAO_CLASS[a.situacao]}`}>
                  {a.situacao}
                </span>
              </td>
            </tr>
          )
        })}
        <tr className="bg-gray-200/70 font-semibold text-gray-700">
          <td colSpan={3} className="border border-gray-200 px-3 py-1 text-xs italic">{fase.codigo} Sub-total {fase.titulo}</td>
          <td className="border border-gray-200 px-2 py-1 text-right">{texto(String(fase.minOrcado))}</td>
          <td className="border border-gray-200 px-2 py-1 text-right">{texto(hhmm(fase.minOrcado))}</td>
          <td className="border border-gray-200 px-2 py-1 text-right">{texto(dois(fase.minOrcado / 60 / config.horasPorDia))}</td>
          <td colSpan={3} className="border border-gray-200 px-2 py-1 text-right">{texto(brl(fase.totalOrcado))}</td>
          <td className="border border-gray-200 px-2 py-1 text-right"></td>
          <td className="border border-gray-200 px-2 py-1 text-right">{texto(String(fase.minReal))}</td>
          <td className="border border-gray-200 px-2 py-1 text-right">{texto(hhmm(fase.minReal))}</td>
          <td className="border border-gray-200 px-2 py-1 text-right">{texto(dois(fase.minReal / 60 / config.horasPorDia))}</td>
          <td colSpan={3} className="border border-gray-200 px-2 py-1 text-right">{texto(brl(fase.totalReal))}</td>
          <td colSpan={2} className="border border-gray-200"></td>
        </tr>
      </>
    )
  }
}

function AdicionarElaborador({
  projetoId, elaboradores, usuariosDisponiveis, onFechar,
}: {
  projetoId: string
  elaboradores: Elaborador[]
  usuariosDisponiveis: { id: string; name: string; email: string }[]
  onFechar: () => void
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [userId, setUserId] = useState('')
  const jaMembros = new Set(elaboradores.map(e => e.userId))
  const disponiveis = usuariosDisponiveis.filter(u => !jaMembros.has(u.id))

  async function adicionar() {
    if (!userId) return
    setBusy(true)
    const res = await addMemberAction(projetoId, userId)
    setBusy(false)
    if ('error' in res && res.error) {
      toast(res.error, 'error')
    } else {
      toast('Elaborador adicionado ao projeto', 'success')
      onFechar()
      window.location.reload()
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 text-xs font-bold text-gray-700 uppercase tracking-widest">Adicionar elaborador (membro do projeto)</div>
      {disponiveis.length === 0 ? (
        <p className="text-xs text-gray-500">Todos os usuários do tenant já são membros deste projeto.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <select
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="min-w-[220px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecionar usuário…</option>
            {disponiveis.map(u => (
              <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={adicionar}
            disabled={busy || !userId}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" /> {busy ? 'Adicionando…' : 'Adicionar'}
          </button>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}

function QuadroValor({ planilha }: { planilha: PlanilhaDeCustos }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-800">Resumo — Valor por Fase do Projeto</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="px-3 py-2 text-left text-xs font-semibold">Fases do Projeto</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Valor Orçado</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Valor Real</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {planilha.quadros.valor.map(v => (
            <tr key={v.fase}>
              <td className="px-3 py-1.5 text-gray-800">{v.fase}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{brl(v.orcado)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{brl(v.realizado)}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right tabular-nums">{brl(planilha.totalOrcado)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{brl(planilha.totalReal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function QuadroTempo({ planilha }: { planilha: PlanilhaDeCustos }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-800">Resumo — Tempo por Fase do Projeto</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="px-3 py-2 text-left text-xs font-semibold">Fases do Projeto</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Tempo Orçado (Min.)</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Tempo Real (Min.)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {planilha.quadros.tempo.map(t => (
            <tr key={t.fase}>
              <td className="px-3 py-1.5 text-gray-800">{t.fase}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{t.minOrcado.toLocaleString('pt-BR')}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{t.minReal.toLocaleString('pt-BR')}</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right tabular-nums">{planilha.tempoOrcadoTotal.toLocaleString('pt-BR')}</td>
            <td className="px-3 py-2 text-right tabular-nums">{planilha.tempoRealTotal.toLocaleString('pt-BR')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function QuadroElaborador({ planilha }: { planilha: PlanilhaDeCustos }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-800">Resumo — Distribuição por Elaborador</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="px-3 py-2 text-left text-xs font-semibold">Elaborador por</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Qtde. Atividades</th>
            <th className="px-3 py-2 text-right text-xs font-semibold">Percentual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {planilha.quadros.elaboradores.map(e => (
            <tr key={e.elaborador}>
              <td className="px-3 py-1.5 text-gray-800">{e.elaborador}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{e.qtdeAtividades}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{e.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</td>
            </tr>
          ))}
          <tr className="bg-gray-100 font-bold">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2 text-right tabular-nums">{planilha.qtdeAtividades}</td>
            <td className="px-3 py-2 text-right tabular-nums">100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function GraficoValor({ planilha }: { planilha: PlanilhaDeCustos }) {
  if (planilha.quadros.valor.length === 0) return null
  const data = planilha.quadros.valor.map(v => ({
    fase: v.fase.split(' ')[0],
    'Valor Orçado': Math.round(v.orcado * 100) / 100,
    'Valor Real': Math.round(v.realizado * 100) / 100,
  }))
  const pieData = planilha.quadros.elaboradores.map(e => ({ name: e.elaborador, value: e.qtdeAtividades }))
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-800">Gráficos (Recharts)</h3>
      <div className="mb-2 text-xs font-semibold text-gray-500">Valor por fase (R$)</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fase" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? brl(v) : String(v))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Valor Orçado" fill="#2563eb" />
          <Bar dataKey="Valor Real" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
      {pieData.length > 0 && (
        <>
          <div className="mt-4 mb-2 text-xs font-semibold text-gray-500">Atividades por elaborador</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((_, i) => <Cell key={i} fill={CORES_PIE[i % CORES_PIE.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
