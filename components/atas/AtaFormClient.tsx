'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarAtaAction, atualizarAtaAction } from '@/app/actions/atas'
import MemberSelect, { type MemberOption } from '@/components/atas/MemberSelect'

interface Presente { nome: string; setorEmpresa: string; userId: string }
interface Acao { acao: string; prazo: string; responsavel: string; responsavelUserId: string }
interface Anexo { nome: string; url: string }

interface Props {
  projetoId: string
  ataId?: string
  mode: 'create' | 'edit'
  members: MemberOption[]
  initial?: {
    local?: string | null
    data?: string
    elaboradoPor: string
    elaboradoPorUserId?: string | null
    aprovadoPor?: string | null
    aprovadoPorUserId?: string | null
    assuntosTratados?: string | null
    decisoesTomadas?: string | null
    observacoes?: string | null
    copiasPara: string[]
    presentes: Presente[]
    acoes: Acao[]
    anexos: Anexo[]
  }
}

function toDateOnly(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function AtaFormClient({ projetoId, ataId, mode, members, initial }: Props) {
  const router = useRouter()

  const [local, setLocal] = useState(initial?.local ?? '')
  const [data, setData] = useState(initial?.data ? toDateOnly(initial.data) : '')
  const [elaboradoPor, setElaboradoPor] = useState(initial?.elaboradoPor ?? '')
  const [elaboradoPorUserId, setElaboradoPorUserId] = useState(initial?.elaboradoPorUserId ?? null)
  const [aprovadoPor, setAprovadoPor] = useState(initial?.aprovadoPor ?? '')
  const [aprovadoPorUserId, setAprovadoPorUserId] = useState(initial?.aprovadoPorUserId ?? null)
  const [assuntos, setAssuntos] = useState(initial?.assuntosTratados ?? '')
  const [decisoes, setDecisoes] = useState(initial?.decisoesTomadas ?? '')
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? '')
  const [copias, setCopias] = useState(initial?.copiasPara.join(', ') ?? '')
  const [presentes, setPresentes] = useState<Presente[]>(
    initial?.presentes ?? [{ nome: '', setorEmpresa: '', userId: '' }],
  )
  const [acoes, setAcoes] = useState<Acao[]>(
    initial?.acoes ?? [{ acao: '', prazo: '', responsavel: '', responsavelUserId: '' }],
  )
  const [anexos, setAnexos] = useState<Anexo[]>(initial?.anexos ?? [])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function pickElaborador(member: MemberOption | null) {
    setElaboradoPor(member?.name ?? '')
    setElaboradoPorUserId(member?.id ?? null)
  }

  function pickAprovador(member: MemberOption | null) {
    setAprovadoPor(member?.name ?? '')
    setAprovadoPorUserId(member?.id ?? null)
  }

  function pickPresente(i: number, member: MemberOption | null) {
    const next = [...presentes]
    next[i].nome = member?.name ?? ''
    // Setor auto-preenchido pela função do membro
    next[i].setorEmpresa = member?.setor ?? ''
    next[i].userId = member?.id ?? ''
    setPresentes(next)
  }

  function pickResponsavel(i: number, member: MemberOption | null) {
    const next = [...acoes]
    next[i].responsavel = member?.name ?? ''
    next[i].responsavelUserId = member?.id ?? ''
    setAcoes(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      local: local || null,
      data: new Date(`${data}T00:00:00`).toISOString(),
      elaboradoPor,
      elaboradoPorUserId: elaboradoPorUserId || null,
      aprovadoPor: aprovadoPor || null,
      aprovadoPorUserId: aprovadoPorUserId || null,
      assuntosTratados: assuntos || null,
      decisoesTomadas: decisoes || null,
      observacoes: observacoes || null,
      copiasPara: copias.split(',').map(s => s.trim()).filter(Boolean),
      presentes: presentes
        .map(p => ({
          nome: p.nome.trim(),
          setorEmpresa: p.setorEmpresa.trim() || null,
          userId: p.userId || null,
        }))
        .filter(p => p.nome),
      acoes: acoes
        .map(a => ({
          acao: a.acao.trim(),
          prazo: a.prazo ? new Date(`${a.prazo}T00:00:00`).toISOString() : null,
          responsavel: a.responsavel.trim() || null,
          responsavelUserId: a.responsavelUserId || null,
        }))
        .filter(a => a.acao),
      anexos: anexos
        .map(a => ({ nome: a.nome.trim(), url: a.url.trim() || null }))
        .filter(a => a.nome),
    }

    const result =
      mode === 'create'
        ? await criarAtaAction({ ...payload, projetoId })
        : await atualizarAtaAction(ataId!, projetoId, payload)

    if ('error' in result && result.error) {
      setError(result.error)
      setSaving(false)
      return
    }
    router.push(`/projetos/${projetoId}/atas`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data da reunião *</label>
          <input type="date" required value={data} onChange={e => setData(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
          <input type="text" value={local} onChange={e => setLocal(e.target.value)} className={inputCls} placeholder="Sala / online" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Elaborado por *</label>
          <MemberSelect members={members} value={elaboradoPorUserId ?? undefined} onChange={pickElaborador} placeholder="Selecionar membro" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aprovado por</label>
          <MemberSelect members={members} value={aprovadoPorUserId ?? undefined} onChange={pickAprovador} placeholder="Selecionar membro" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">I. Relação dos presentes</label>
        {presentes.map((p, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2">
            <div className="flex-1">
              <MemberSelect
                members={members}
                value={p.userId}
                onChange={m => pickPresente(i, m)}
                placeholder="Selecionar presente"
              />
            </div>
            <input
              type="text"
              value={p.setorEmpresa}
              onChange={e => {
                const next = [...presentes]; next[i].setorEmpresa = e.target.value; setPresentes(next)
              }}
              placeholder="Setor (auto pela função)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setPresentes(presentes.filter((_, j) => j !== i))}
              className="px-3 text-red-500 hover:bg-red-50 rounded-lg"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPresentes([...presentes, { nome: '', setorEmpresa: '', userId: '' }])}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Adicionar presente
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">II. Assuntos tratados</label>
        <textarea rows={3} value={assuntos} onChange={e => setAssuntos(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">III. Decisões tomadas</label>
        <textarea rows={3} value={decisoes} onChange={e => setDecisoes(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">IV. Ações a serem empreendidas</label>
        {acoes.map((a, i) => (
          <div key={i} className="flex flex-col gap-2 mb-3 p-3 rounded-lg border border-gray-200">
            <textarea
              rows={2}
              value={a.acao}
              onChange={e => {
                const next = [...acoes]; next[i].acao = e.target.value; setAcoes(next)
              }}
              placeholder="Ação"
              className={inputCls}
            />
            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
              <div className="sm:w-44">
                <input
                  type="date"
                  value={a.prazo}
                  onChange={e => {
                    const next = [...acoes]; next[i].prazo = e.target.value; setAcoes(next)
                  }}
                  className={inputCls}
                />
              </div>
              <div className="flex-1">
                <MemberSelect
                  members={members}
                  value={a.responsavelUserId}
                  onChange={m => pickResponsavel(i, m)}
                  placeholder="Responsável (membro)"
                />
              </div>
              <button
                type="button"
                onClick={() => setAcoes(acoes.filter((_, j) => j !== i))}
                className="px-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAcoes([...acoes, { acao: '', prazo: '', responsavel: '', responsavelUserId: '' }])}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Adicionar ação
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Documentos anexos (nome, URL)</label>
        {anexos.map((a, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={a.nome}
              onChange={e => {
                const next = [...anexos]; next[i].nome = e.target.value; setAnexos(next)
              }}
              placeholder="Nome do documento"
              className={inputCls}
            />
            <input
              type="text"
              value={a.url}
              onChange={e => {
                const next = [...anexos]; next[i].url = e.target.value; setAnexos(next)
              }}
              placeholder="URL (opcional)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setAnexos(anexos.filter((_, j) => j !== i))}
              className="px-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAnexos([...anexos, { nome: '', url: '' }])}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Adicionar anexo
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Enviar cópias para (e-mails separados por vírgula)
        </label>
        <input type="text" value={copias} onChange={e => setCopias(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} className={inputCls} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
        >
          {saving ? 'Salvando...' : mode === 'create' ? 'Criar Ata' : 'Salvar alterações'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/projetos/${projetoId}/atas`)}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
