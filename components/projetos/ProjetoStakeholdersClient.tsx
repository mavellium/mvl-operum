'use client'

import { useState, useTransition } from 'react'
import {
  Plus,
  Pencil,
  UserMinus,
  UserPlus,
  X,
  Building2,
  Mail,
  Phone,
  BookUser,
} from 'lucide-react'
import AvatarUpload from '@/components/profile/AvatarUpload'
import AddressFields, { type AddressValues, emptyAddress } from '@/components/ui/AddressFields'
import {
  createStakeholderAction,
  updateStakeholderAction,
  bindStakeholderAction,
  unbindStakeholderAction,
} from '@/app/actions/stakeholders'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Stakeholder {
  id: string
  tenantId: string
  name: string
  logoUrl: string | null
  company: string | null
  competence: string | null
  email: string | null
  phone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  notes: string | null
  isActive: boolean
}

type FormState = {
  logoUrl: string
  name: string
  company: string
  competence: string
  email: string
  phone: string
  address: AddressValues
  notes: string
}

interface Props {
  projetoId: string
  stakeholdersProjeto: Stakeholder[]
  stakeholdersDisponiveis: Stakeholder[]
  userRole: 'admin' | 'gerente'
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const emptyForm: FormState = {
  logoUrl: '',
  name: '',
  company: '',
  competence: '',
  email: '',
  phone: '',
  address: emptyAddress,
  notes: '',
}

const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'
const disabledCls =
  'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

const avatarColors = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
]

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

// ─────────────────────────────────────────────
// StakeholderAvatar
// ─────────────────────────────────────────────

function StakeholderAvatar({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string
  logoUrl: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const dims = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs'

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={`${dims} rounded-full object-cover shrink-0 border border-gray-100 shadow-sm`}
        onError={(e) => {
          // on broken URL fall through to initials by hiding the img
          ; (e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }

  return (
    <div
      className={`${dims} ${colorForName(name)} rounded-full shrink-0 flex items-center justify-center font-semibold text-white shadow-sm`}
    >
      {getInitials(name)}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function ProjetoStakeholdersClient({
  projetoId,
  stakeholdersProjeto: initialProjeto,
  stakeholdersDisponiveis: initialDisponiveis,
  userRole,
}: Props) {
  const isAdmin = userRole === 'admin'

  const [projeto, setProjeto] = useState<Stakeholder[]>(initialProjeto)
  const [disponiveis, setDisponiveis] = useState<Stakeholder[]>(initialDisponiveis)

  const [showDirectory, setShowDirectory] = useState(false)
  const [selected, setSelected] = useState<Stakeholder | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [formState, setFormState] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const [searchProjeto, setSearchProjeto] = useState('')
  const [searchDir, setSearchDir] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const [, startTransition] = useTransition()

  // ── Layout ──────────────────────────────────
  const showCol3 = selected !== null || isCreating
  const col2Active = showDirectory && isAdmin
  const col1Width = col2Active || showCol3 ? 'lg:w-1/3' : 'w-full'
  const col3Width = col2Active ? 'lg:w-1/3' : 'lg:flex-1'

  // ── Filtered lists ───────────────────────────
  const filteredProjeto = projeto.filter((s) => {
    const q = searchProjeto.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.company ?? '').toLowerCase().includes(q)
  })

  const filteredDir = disponiveis.filter((s) => {
    const q = searchDir.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.company ?? '').toLowerCase().includes(q)
  })

  // ── Form helpers ────────────────────────────
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState((f) => ({ ...f, [key]: value }))
  }

  function populateForm(s: Stakeholder) {
    setFormState({
      logoUrl: s.logoUrl ?? '',
      name: s.name,
      company: s.company ?? '',
      competence: s.competence ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      address: {
        cep: s.cep ?? '',
        logradouro: s.logradouro ?? '',
        numero: s.numero ?? '',
        complemento: s.complemento ?? '',
        bairro: s.bairro ?? '',
        cidade: s.cidade ?? '',
        estado: s.estado ?? '',
      },
      notes: s.notes ?? '',
    })
  }

  function handleClearSelection() {
    setSelected(null)
    setIsCreating(false)
    setFormError(null)
  }

  function handleOpenEdit(s: Stakeholder) {
    setIsCreating(false)
    setFormError(null)
    populateForm(s)
    setSelected(s)
  }

  function handleOpenCreate() {
    if (!isAdmin) return
    setSelected(null)
    setIsCreating(true)
    setFormError(null)
    setFormState(emptyForm)
  }

  // ── Bind ─────────────────────────────────────
  function handleBind(s: Stakeholder) {
    if (!isAdmin) return

    setDisponiveis((prev) => prev.filter((x) => x.id !== s.id))
    setProjeto((prev) => [...prev, s])
    handleOpenEdit(s)

    startTransition(async () => {
      setLoadingId(s.id)
      const result = await bindStakeholderAction(projetoId, s.id)
      setLoadingId(null)
      if (result.error) {
        // rollback
        setProjeto((prev) => prev.filter((x) => x.id !== s.id))
        setDisponiveis((prev) => [...prev, s])
        handleClearSelection()
      }
    })
  }

  // ── Unbind ───────────────────────────────────
  function handleUnbind(s: Stakeholder) {
    if (!isAdmin) return

    setProjeto((prev) => prev.filter((x) => x.id !== s.id))
    setDisponiveis((prev) => [...prev, s])
    if (selected?.id === s.id) handleClearSelection()

    startTransition(async () => {
      setLoadingId(s.id)
      const result = await unbindStakeholderAction(projetoId, s.id)
      setLoadingId(null)
      if (result.error) {
        // rollback
        setProjeto((prev) => [...prev, s])
        setDisponiveis((prev) => prev.filter((x) => x.id !== s.id))
      }
    })
  }

  // ── Save ─────────────────────────────────────
  async function handleSave() {
    setFormError(null)

    if (!formState.name.trim()) {
      setFormError('O nome é obrigatório.')
      return
    }

    if (isCreating) {
      if (!isAdmin) return

      const formData = {
        name: formState.name.trim(),
        logoUrl: formState.logoUrl || null,
        company: formState.company || null,
        competence: formState.competence || null,
        email: formState.email || null,
        phone: formState.phone || null,
        cep: formState.address.cep || null,
        logradouro: formState.address.logradouro || null,
        numero: formState.address.numero || null,
        complemento: formState.address.complemento || null,
        bairro: formState.address.bairro || null,
        cidade: formState.address.cidade || null,
        estado: formState.address.estado || null,
        notes: formState.notes || null,
      }

      setLoadingId('form')
      // Passa projetoId para que a action já vincule automaticamente ao criar
      const result = await createStakeholderAction(formData, projetoId)
      setLoadingId(null)

      if (result.error) {
        setFormError(result.error)
        return
      }
      if (result.stakeholder) {
        // A action auto-vincula ao projeto, então vai direto para a lista do projeto
        setProjeto((prev) => [...prev, result.stakeholder as unknown as Stakeholder])
      }
      handleClearSelection()
      return
    }

    if (selected) {
      if (!isAdmin) return

      const updated: Stakeholder = {
        ...selected,
        logoUrl: formState.logoUrl || null,
        name: formState.name.trim(),
        company: formState.company || null,
        competence: formState.competence || null,
        email: formState.email || null,
        phone: formState.phone || null,
        cep: formState.address.cep || null,
        logradouro: formState.address.logradouro || null,
        numero: formState.address.numero || null,
        complemento: formState.address.complemento || null,
        bairro: formState.address.bairro || null,
        cidade: formState.address.cidade || null,
        estado: formState.address.estado || null,
        notes: formState.notes || null,
      }

      setLoadingId('form')
      const result = await updateStakeholderAction(selected.id, updated, projetoId)
      setLoadingId(null)

      if (result.error) {
        setFormError(result.error)
        return
      }

      const patch = (list: Stakeholder[]) =>
        list.map((x) => (x.id === updated.id ? updated : x))
      setProjeto(patch)
      setDisponiveis(patch)
      handleClearSelection()
    }
  }

  const col3Title = isCreating ? 'Novo Stakeholder' : 'Editar Stakeholder'

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">

      {/* ── COLUMN 1 — Stakeholders do Projeto ── */}
      <div
        className={`${col1Width} w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Stakeholders do Projeto</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {projeto.length} parte{projeto.length !== 1 ? 's' : ''} interessada{projeto.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowDirectory(true)}
              title="Vincular stakeholder"
              className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="search"
            placeholder="Buscar stakeholder…"
            value={searchProjeto}
            onChange={(e) => setSearchProjeto(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        {filteredProjeto.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookUser className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              {projeto.length === 0
                ? isAdmin
                  ? 'Nenhuma parte interessada. Clique em + para vincular.'
                  : 'Nenhuma parte interessada no projeto.'
                : 'Nenhum resultado para a busca.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2 overflow-y-auto max-h-[600px] px-2 py-2">
            {filteredProjeto.map((s) => (
              <li
                key={s.id}
                className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <StakeholderAvatar name={s.name} logoUrl={s.logoUrl} size="lg" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] font-bold text-slate-800 leading-tight truncate">
                      {s.name}
                    </span>
                    {s.company && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {s.company}
                      </span>
                    )}
                    {s.competence && (
                      <span className="text-[11px] text-indigo-500 font-medium mt-0.5 truncate">
                        {s.competence}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    title="Editar"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleUnbind(s)}
                      disabled={loadingId === s.id}
                      title="Desvincular do projeto"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                    >
                      {loadingId === s.id ? (
                        <Spinner />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── COLUMN 2 — Diretório Global (admin only) ── */}
      {col2Active && (
        <div className="lg:w-1/3 w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-left-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Diretório de Stakeholders</h2>
              <p className="text-xs text-gray-400 mt-0.5">{disponiveis.length} disponíveis</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenCreate}
                title="Novo stakeholder"
                className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowDirectory(false)}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="search"
              placeholder="Buscar no diretório…"
              value={searchDir}
              onChange={(e) => setSearchDir(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* List */}
          {filteredDir.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-400">
                {disponiveis.length === 0
                  ? 'Todos os stakeholders já estão vinculados.'
                  : 'Nenhum resultado.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50/80 p-2 space-y-1">
              {filteredDir.map((s) => (
                <li
                  key={s.id}
                  className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 hover:shadow-sm transition-all"
                >
                  <StakeholderAvatar name={s.name} logoUrl={s.logoUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    {s.company && (
                      <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {s.company}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBind(s)
                      }}
                      disabled={loadingId === s.id}
                      title="Vincular ao projeto"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                    >
                      {loadingId === s.id ? <Spinner /> : <UserPlus className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(s)}
                      title="Editar dados"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── COLUMN 3 — Formulário ── */}
      {showCol3 && (
        <div
          className={`${col3Width} w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-900">{col3Title}</h2>
            <button
              onClick={handleClearSelection}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[720px]">

            {/* Logo — upload via AvatarUpload */}
            <div className="flex justify-center pb-2">
              <AvatarUpload
                name={formState.name || 'S'}
                avatarUrl={formState.logoUrl || null}
                onChange={(url) => setField('logoUrl', url)}
                disabled={!isAdmin}
              />
            </div>

            {/* Nome */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nome <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={!isAdmin}
                placeholder="Nome completo ou razão social"
                className={`${inputCls} ${disabledCls}`}
              />
            </div>

            {/* Empresa + Competência */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Empresa / Instituição</label>
                <input
                  type="text"
                  value={formState.company}
                  onChange={(e) => setField('company', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Ex: Universidade Federal"
                  className={`${inputCls} ${disabledCls}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Competência</label>
                <input
                  type="text"
                  value={formState.competence}
                  onChange={(e) => setField('competence', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Ex: Educação, TI"
                  className={`${inputCls} ${disabledCls}`}
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* E-mail */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mail
              </label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => setField('email', e.target.value)}
                disabled={!isAdmin}
                placeholder="contato@empresa.com.br"
                className={`${inputCls} ${disabledCls}`}
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Telefone / Fax
              </label>
              <input
                type="tel"
                value={formState.phone}
                onChange={(e) => setField('phone', e.target.value)}
                disabled={!isAdmin}
                placeholder="(00) 00000-0000"
                className={`${inputCls} ${disabledCls}`}
              />
            </div>

            {/* Endereço */}
            <AddressFields
              values={formState.address}
              onChange={(field, value) => setFormState(f => ({ ...f, address: { ...f.address, [field]: value } }))}
              disabled={!isAdmin}
            />

            {/* Observações */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <textarea
                value={formState.notes}
                onChange={(e) => setField('notes', e.target.value)}
                disabled={!isAdmin}
                rows={4}
                placeholder="Anotações sobre este stakeholder…"
                className={`${inputCls} ${disabledCls} resize-none`}
              />
            </div>

            {/* Readonly banner for gerente */}
            {!isAdmin && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Você está em modo somente leitura. Apenas administradores podem editar stakeholders.
              </p>
            )}

            {formError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loadingId === 'form'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loadingId === 'form' && <Spinner />}
                  {isCreating ? 'Criar Stakeholder' : 'Salvar Dados'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────
function Spinner() {
  return (
    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
  )
}
