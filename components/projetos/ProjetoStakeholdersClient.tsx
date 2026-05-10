'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
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
  ChevronDown,
  Users,
  Briefcase,
  DollarSign,
  GripVertical,
} from 'lucide-react'
import AvatarUpload from '@/components/profile/AvatarUpload'
import AddressFields, { type AddressValues, emptyAddress } from '@/components/ui/AddressFields'
import {
  createStakeholderAction,
  updateStakeholderAction,
  bindStakeholderAction,
  unbindStakeholderAction,
  reorderStakeholdersAction,
  reorderMembersAction,
  uploadMemberSignatureAction,
} from '@/app/actions/stakeholders'
import { addMemberAction, removeMemberAction } from '@/app/actions/projects'
import { updateProjetoMemberAction } from '@/app/actions/projetos'
import { adminCreateUserAction } from '@/app/actions/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StakeholderUnificado = {
  id: string
  tipo: 'interno' | 'externo'
  name: string
  email: string | null
  avatarUrl: string | null
  phone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  notes: string | null
  // Interno (UserProject + User)
  userId?: string
  cargos?: string[]
  departamento?: string[]
  isGerente?: boolean
  hourlyRate?: number | null
  remuneracao?: number | null
  horasDiarias?: number | null
  startDate?: string
  userRole?: string
  signatureUrl?: string | null
  // Externo (Stakeholder)
  stakeholderId?: string
  tenantId?: string
  company?: string | null
  competence?: string | null
  isActive?: boolean
}

export type UsuarioDisponivel = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
}

export type StakeholderExterno = {
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

interface Props {
  projetoId: string
  stakeholders: StakeholderUnificado[]
  stakeholdersDisponiveis: StakeholderExterno[]
  usuariosDisponiveis: UsuarioDisponivel[]
  funcoesExistentes?: string[]
  departamentosExistentes?: string[]
  userRole: 'admin' | 'gerente'
}

type FormState = {
  avatarUrl: string
  name: string
  company: string
  competence: string
  email: string
  phone: string
  address: AddressValues
  notes: string
  cargos: string[]
  departamento: string[]
  isGerente: boolean
  remuneracao: string
  horasDiarias: string
  password: string
  forcePasswordChange: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyForm: FormState = {
  avatarUrl: '',
  name: '',
  company: '',
  competence: '',
  email: '',
  phone: '',
  address: emptyAddress,
  notes: '',
  cargos: [],
  departamento: [],
  isGerente: false,
  remuneracao: '',
  horasDiarias: '',
  password: '',
  forcePasswordChange: true,
}

const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'
const disabledCls =
  'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

const avatarColors = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
]

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function parseBRLFloat(value: string): number | null {
  if (!value || value.trim() === '') return null
  const clean = value.replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(clean)
  return isNaN(parsed) ? null : parsed
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, url, size = 'md' }: { name: string; url: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs'
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${dims} rounded-full object-cover shrink-0 border border-gray-100 shadow-sm`}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div className={`${dims} ${colorForName(name)} rounded-full shrink-0 flex items-center justify-center font-semibold text-white shadow-sm`}>
      {getInitials(name)}
    </div>
  )
}

function TipoBadge({ tipo }: { tipo: 'interno' | 'externo' }) {
  return tipo === 'interno'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100">Equipe</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200">Externo</span>
}

function Spinner() {
  return <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
}

// ─── MultiCreatableSelect ─────────────────────────────────────────────────────

function MultiCreatableSelect({
  values = [],
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  values: string[]
  onChange: (v: string[]) => void
  options: string[]
  placeholder: string
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase()) && !values.includes(opt)
  )
  const isExactMatch = options.some(opt => opt.toLowerCase() === search.toLowerCase().trim())
  const showCreateOption = search.trim().length > 0 && !isExactMatch && !values.includes(search.trim())

  function handleSelect(val: string) {
    if (disabled) return
    if (!values.includes(val)) onChange([...values, val])
    setSearch('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function handleRemove(val: string) {
    if (!disabled) onChange(values.filter(v => v !== val))
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className={`min-h-[42px] w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm flex flex-wrap gap-1.5 items-center ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white focus-within:ring-2 focus-within:ring-blue-500 cursor-text'
        }`}
        onClick={() => { if (!disabled) { setIsOpen(true); inputRef.current?.focus() } }}
      >
        {values.map(val => (
          <span key={val} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200">
            {val}
            {!disabled && (
              <button type="button" onClick={e => { e.stopPropagation(); handleRemove(val) }} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          disabled={disabled}
          onChange={e => { setSearch(e.target.value); setIsOpen(true) }}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-gray-400 disabled:cursor-not-allowed"
        />
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
          {filteredOptions.map(opt => (
            <button key={opt} onClick={() => handleSelect(opt)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 transition-colors">
              {opt}
            </button>
          ))}
          {showCreateOption && (
            <button onClick={() => handleSelect(search.trim())} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-700 font-medium bg-blue-50/50 hover:bg-blue-50 transition-colors border-t border-gray-50">
              <Plus className="w-3.5 h-3.5" /> Criar &quot;{search.trim()}&quot;
            </button>
          )}
          {filteredOptions.length === 0 && !showCreateOption && (
            <div className="px-4 py-3 text-sm text-gray-400 italic text-center">Sem opções</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── MemberSignatureUpload ────────────────────────────────────────────────────

function MemberSignatureUpload({
  userId,
  initialUrl,
  onUpdate,
}: {
  userId: string
  initialUrl: string | null
  onUpdate: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg']
    if (!ALLOWED.includes(file.type)) {
      setError('Apenas PNG e JPEG são aceitos')
      e.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Arquivo excede 2 MB')
      e.target.value = ''
      return
    }

    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadMemberSignatureAction(fd, userId)
    if ('signatureUrl' in result && result.signatureUrl) {
      setUrl(result.signatureUrl)
      onUpdate(result.signatureUrl)
    } else if ('error' in result) {
      setError(result.error ?? 'Erro ao enviar')
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <div data-testid="member-signature-upload" className="flex flex-col gap-2">
      <label className="block text-xs font-medium text-gray-600">Assinatura Digital</label>
      <p className="text-[11px] text-gray-400">
        Aparecerá na documentação do projeto. PNG ou JPEG, máx. 2 MB.
      </p>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Assinatura atual"
          className="max-h-12 max-w-[180px] object-contain border border-gray-100 rounded p-1 bg-gray-50"
        />
      )}
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors self-start"
      >
        {uploading ? 'Enviando…' : url ? 'Alterar assinatura' : 'Enviar assinatura'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjetoStakeholdersClient({
  projetoId,
  stakeholders: initialStakeholders,
  stakeholdersDisponiveis: initialDispExterno,
  usuariosDisponiveis: initialDispInterno,
  funcoesExistentes = [],
  departamentosExistentes = [],
  userRole,
}: Props) {
  const isAdmin = userRole === 'admin'

  // Data state
  const [projeto, setProjeto] = useState<StakeholderUnificado[]>(initialStakeholders)
  const [dispExterno, setDispExterno] = useState<StakeholderExterno[]>(initialDispExterno)
  const [dispInterno, setDispInterno] = useState<UsuarioDisponivel[]>(initialDispInterno)

  // UI state
  const [addMode, setAddMode] = useState<null | 'interno' | 'externo'>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [selected, setSelected] = useState<StakeholderUnificado | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [formState, setFormState] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const [searchProjeto, setSearchProjeto] = useState('')
  const [searchDir, setSearchDir] = useState('')

  const [, startTransition] = useTransition()
  const addMenuRef = useRef<HTMLDivElement>(null)

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const [reorderError, setReorderError] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Layout
  const showCol3 = selected !== null || isCreating
  const col2Active = addMode !== null && isAdmin
  const col1Width = col2Active || showCol3 ? 'lg:w-1/3' : 'w-full'
  const col3Width = col2Active ? 'lg:w-1/3' : 'lg:flex-1'

  // ── Filtered lists
  const filteredProjeto = projeto.filter(s => {
    const q = searchProjeto.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.company ?? '').toLowerCase().includes(q)
    )
  })

  const filteredDispExterno = dispExterno.filter(s => {
    const q = searchDir.toLowerCase()
    return s.name.toLowerCase().includes(q) || (s.company ?? '').toLowerCase().includes(q)
  })

  const filteredDispInterno = dispInterno.filter(u => {
    const q = searchDir.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  // ── Form helpers
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormState(f => ({ ...f, [key]: value }))
  }

  function populateFromExterno(s: StakeholderUnificado) {
    setFormState({
      avatarUrl: s.avatarUrl ?? '',
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
      cargos: [],
      departamento: [],
      isGerente: false,
      remuneracao: '',
      horasDiarias: '',
      password: '',
      forcePasswordChange: false,
    })
  }

  function populateFromInterno(s: StakeholderUnificado) {
    setFormState({
      avatarUrl: s.avatarUrl ?? '',
      name: s.name,
      company: '',
      competence: '',
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
      cargos: s.cargos ?? [],
      departamento: s.departamento ?? [],
      isGerente: s.isGerente ?? false,
      remuneracao:
        s.remuneracao != null
          ? s.remuneracao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '',
      horasDiarias: s.horasDiarias != null ? String(s.horasDiarias) : '',
      password: '',
      forcePasswordChange: false,
    })
  }

  function handleClearSelection() {
    setSelected(null)
    setIsCreating(false)
    setFormError(null)
  }

  function handleOpenEdit(s: StakeholderUnificado) {
    setIsCreating(false)
    setFormError(null)
    if (s.tipo === 'interno') populateFromInterno(s)
    else populateFromExterno(s)
    setSelected(s)
  }

  function handleOpenCreateExterno() {
    if (!isAdmin) return
    setSelected(null)
    setIsCreating(true)
    setFormError(null)
    setFormState(emptyForm)
  }

  function handleOpenCreateInterno() {
    if (!isAdmin) return
    setSelected(null)
    setIsCreating(true)
    setFormError(null)
    setFormState({ ...emptyForm, forcePasswordChange: true })
  }

  function handleOpenAddMode(mode: 'interno' | 'externo') {
    if (!isAdmin) return
    setAddMode(mode)
    setShowAddMenu(false)
    setSearchDir('')
  }

  function handleCloseAddMode() {
    setAddMode(null)
    setSearchDir('')
  }

  // ── Bind external stakeholder
  function handleBindExterno(s: StakeholderExterno) {
    if (!isAdmin) return
    const unified: StakeholderUnificado = {
      id: s.id,
      tipo: 'externo',
      stakeholderId: s.id,
      tenantId: s.tenantId,
      name: s.name,
      email: s.email,
      avatarUrl: s.logoUrl,
      phone: s.phone,
      cep: s.cep,
      logradouro: s.logradouro,
      numero: s.numero,
      complemento: s.complemento,
      bairro: s.bairro,
      cidade: s.cidade,
      estado: s.estado,
      notes: s.notes,
      company: s.company,
      competence: s.competence,
      isActive: s.isActive,
    }
    setDispExterno(prev => prev.filter(x => x.id !== s.id))
    setProjeto(prev => [...prev, unified])
    handleOpenEdit(unified)

    startTransition(async () => {
      setLoadingId(s.id)
      const result = await bindStakeholderAction(projetoId, s.id)
      setLoadingId(null)
      if ('error' in result) {
        setProjeto(prev => prev.filter(x => x.id !== s.id))
        setDispExterno(prev => [...prev, s])
        handleClearSelection()
      }
    })
  }

  // ── Unbind external stakeholder
  function handleUnbindExterno(s: StakeholderUnificado) {
    if (!isAdmin || !s.stakeholderId) return
    const externo: StakeholderExterno = {
      id: s.stakeholderId,
      tenantId: s.tenantId!,
      name: s.name,
      logoUrl: s.avatarUrl,
      company: s.company ?? null,
      competence: s.competence ?? null,
      email: s.email,
      phone: s.phone,
      cep: s.cep,
      logradouro: s.logradouro,
      numero: s.numero,
      complemento: s.complemento,
      bairro: s.bairro,
      cidade: s.cidade,
      estado: s.estado,
      notes: s.notes,
      isActive: s.isActive ?? true,
    }
    setProjeto(prev => prev.filter(x => x.id !== s.id))
    setDispExterno(prev => [...prev, externo])
    if (selected?.id === s.id) handleClearSelection()

    startTransition(async () => {
      setLoadingId(s.id)
      const result = await unbindStakeholderAction(projetoId, s.stakeholderId!)
      setLoadingId(null)
      if ('error' in result) {
        setProjeto(prev => [...prev, s])
        setDispExterno(prev => prev.filter(x => x.id !== externo.id))
      }
    })
  }

  // ── Add internal member
  function handleAddInterno(u: UsuarioDisponivel) {
    if (!isAdmin) return
    const unified: StakeholderUnificado = {
      id: u.id,
      tipo: 'interno',
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      phone: null,
      cep: null,
      logradouro: null,
      numero: null,
      complemento: null,
      bairro: null,
      cidade: null,
      estado: null,
      notes: null,
      cargos: [],
      departamento: [],
      isGerente: false,
      hourlyRate: null,
      startDate: new Date().toISOString(),
      userRole: u.role,
    }
    setDispInterno(prev => prev.filter(x => x.id !== u.id))
    setProjeto(prev => [...prev, unified])
    handleOpenEdit(unified)

    startTransition(async () => {
      setLoadingId(u.id)
      const result = await addMemberAction(projetoId, u.id)
      setLoadingId(null)
      if ('error' in result) {
        setProjeto(prev => prev.filter(x => x.id !== u.id))
        setDispInterno(prev => [...prev, u])
        handleClearSelection()
      }
    })
  }

  // ── Remove internal member
  function handleRemoveInterno(s: StakeholderUnificado) {
    if (!isAdmin || !s.userId) return
    const usuario: UsuarioDisponivel = {
      id: s.userId,
      name: s.name,
      email: s.email ?? '',
      avatarUrl: s.avatarUrl,
      role: s.userRole ?? 'member',
    }
    setProjeto(prev => prev.filter(x => x.id !== s.id))
    setDispInterno(prev => [...prev, usuario])
    if (selected?.id === s.id) handleClearSelection()

    startTransition(async () => {
      setLoadingId(s.id)
      const result = await removeMemberAction(projetoId, s.userId!)
      setLoadingId(null)
      if ('error' in result) {
        setProjeto(prev => [...prev, s])
        setDispInterno(prev => prev.filter(x => x.id !== usuario.id))
      }
    })
  }

  function handleUnlink(s: StakeholderUnificado) {
    if (s.tipo === 'interno') handleRemoveInterno(s)
    else handleUnbindExterno(s)
  }

  // ── Drag and Drop
  function handleDragStart(index: number) {
    if (!isAdmin) return
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (!isAdmin || draggedIndex === null || draggedIndex === index) return
    setDragOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    if (!isAdmin || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newOrder = [...projeto]
    const [movedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(dropIndex, 0, movedItem)

    setProjeto(newOrder)
    setDraggedIndex(null)
    setDragOverIndex(null)

    // Salvar nova ordem no backend
    setIsReordering(true)
    startTransition(async () => {
      const internalIds = newOrder
        .filter(s => s.tipo === 'interno')
        .map(s => s.userId!)
        .filter(Boolean)
      const externalIds = newOrder
        .filter(s => s.tipo === 'externo')
        .map(s => s.stakeholderId!)
        .filter(Boolean)

      const results = await Promise.all([
        internalIds.length ? reorderMembersAction(projetoId, internalIds) : Promise.resolve({ success: true }),
        externalIds.length ? reorderStakeholdersAction(projetoId, externalIds) : Promise.resolve({ success: true }),
      ])
      setIsReordering(false)
      const failed = results.find(r => 'error' in r)
      if (failed) {
        setProjeto(initialStakeholders)
        setReorderError('Falha ao salvar a nova ordem. A ordenação foi revertida.')
      } else {
        setReorderError(null)
      }
    })
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // ── Save
  async function handleSave() {
    setFormError(null)

    // Create new internal user (tenant member)
    if (isCreating && !selected && addMode === 'interno') {
      if (!isAdmin) return
      if (!formState.name.trim() || !formState.email.trim() || !formState.password.trim()) {
        setFormError('Nome, e-mail e senha são obrigatórios.')
        return
      }
      setLoadingId('form')
      const result = await adminCreateUserAction({
        name: formState.name.trim(),
        email: formState.email.trim(),
        password: formState.password,
        avatarUrl: formState.avatarUrl || undefined,
        phone: formState.phone || undefined,
        cep: formState.address.cep || undefined,
        logradouro: formState.address.logradouro || undefined,
        numero: formState.address.numero || undefined,
        complemento: formState.address.complemento || undefined,
        bairro: formState.address.bairro || undefined,
        cidade: formState.address.cidade || undefined,
        estado: formState.address.estado || undefined,
        notes: formState.notes || undefined,
        forcePasswordChange: formState.forcePasswordChange,
      })
      setLoadingId(null)
      if ('error' in result) { setFormError(result.error ?? 'Erro ao criar usuário'); return }
      const novoUsuario: UsuarioDisponivel = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        avatarUrl: result.user.avatarUrl ?? null,
        role: result.user.role,
      }
      setDispInterno(prev => [novoUsuario, ...prev])
      handleClearSelection()
      return
    }

    // Create new external stakeholder
    if (isCreating && !selected) {
      if (!isAdmin) return
      if (!formState.name.trim()) { setFormError('O nome é obrigatório.'); return }

      setLoadingId('form')
      // Cria sem projectId: o stakeholder entra no diretório do Tenant,
      // não é auto-vinculado — o usuário vincula manualmente no Nível 2.
      const result = await createStakeholderAction({
        name: formState.name.trim(),
        logoUrl: formState.avatarUrl || undefined,
        company: formState.company || undefined,
        competence: formState.competence || undefined,
        email: formState.email || undefined,
        phone: formState.phone || undefined,
        cep: formState.address.cep || undefined,
        logradouro: formState.address.logradouro || undefined,
        numero: formState.address.numero || undefined,
        complemento: formState.address.complemento || undefined,
        bairro: formState.address.bairro || undefined,
        cidade: formState.address.cidade || undefined,
        estado: formState.address.estado || undefined,
        notes: formState.notes || undefined,
      })
      setLoadingId(null)

      if ('error' in result) { setFormError(result.error ?? 'Erro ao criar stakeholder'); return }
      if (result.stakeholder) {
        const raw = result.stakeholder as { id: string; tenantId: string }
        // Adiciona ao diretório (Col2) para que o usuário possa vincular ao projeto
        const novoExterno: StakeholderExterno = {
          id: raw.id,
          tenantId: raw.tenantId,
          name: formState.name.trim(),
          logoUrl: formState.avatarUrl || null,
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
          isActive: true,
        }
        setDispExterno(prev => [novoExterno, ...prev])
      }
      // Fecha o formulário (Col3) mas mantém o diretório aberto (Col2)
      handleClearSelection()
      return
    }

    if (!selected) return

    // Update external stakeholder
    if (selected.tipo === 'externo') {
      if (!isAdmin) return
      if (!formState.name.trim()) { setFormError('O nome é obrigatório.'); return }

      const updated: StakeholderUnificado = {
        ...selected,
        avatarUrl: formState.avatarUrl || null,
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
      const result = await updateStakeholderAction(selected.stakeholderId!, {
        name: formState.name.trim(),
        logoUrl: formState.avatarUrl || undefined,
        company: formState.company || undefined,
        competence: formState.competence || undefined,
        email: formState.email || undefined,
        phone: formState.phone || undefined,
        cep: formState.address.cep || undefined,
        logradouro: formState.address.logradouro || undefined,
        numero: formState.address.numero || undefined,
        complemento: formState.address.complemento || undefined,
        bairro: formState.address.bairro || undefined,
        cidade: formState.address.cidade || undefined,
        estado: formState.address.estado || undefined,
        notes: formState.notes || undefined,
      }, projetoId)
      setLoadingId(null)

      if ('error' in result) { setFormError(result.error ?? 'Erro ao atualizar stakeholder'); return }
      setProjeto(prev => prev.map(x => x.id === updated.id ? updated : x))
      handleClearSelection()
      return
    }

    // Update internal member
    if (selected.tipo === 'interno' && selected.userId) {
      setLoadingId('form')
      const result = await updateProjetoMemberAction(selected.userId, projetoId, {
        ...(isAdmin && formState.name.trim() && { name: formState.name.trim() }),
        ...(isAdmin && formState.email.trim() && { email: formState.email.trim() }),
        phone: formState.phone || undefined,
        cep: formState.address.cep || undefined,
        logradouro: formState.address.logradouro || undefined,
        numero: formState.address.numero || undefined,
        complemento: formState.address.complemento || undefined,
        bairro: formState.address.bairro || undefined,
        cidade: formState.address.cidade || undefined,
        estado: formState.address.estado || undefined,
        notes: formState.notes || undefined,
        remuneracao: isAdmin ? (parseBRLFloat(formState.remuneracao) ?? undefined) : undefined,
        horasDiarias: isAdmin ? (parseFloat(formState.horasDiarias) || undefined) : undefined,
        cargos: formState.cargos,
        departamento: formState.departamento,
        isGerente: formState.isGerente,
      })
      setLoadingId(null)

      if ('error' in result) { setFormError(result.error ?? 'Erro ao salvar'); return }
      setProjeto(prev =>
        prev.map(x =>
          x.id === selected.id
            ? {
                ...x,
                ...(isAdmin && formState.name.trim() && { name: formState.name.trim() }),
                ...(isAdmin && formState.email.trim() && { email: formState.email.trim() }),
                phone: formState.phone || null,
                cep: formState.address.cep || null,
                logradouro: formState.address.logradouro || null,
                numero: formState.address.numero || null,
                complemento: formState.address.complemento || null,
                bairro: formState.address.bairro || null,
                cidade: formState.address.cidade || null,
                estado: formState.address.estado || null,
                notes: formState.notes || null,
                cargos: formState.cargos,
                departamento: formState.departamento,
                isGerente: formState.isGerente,
                remuneracao: isAdmin ? (parseBRLFloat(formState.remuneracao) ?? x.remuneracao) : x.remuneracao,
                horasDiarias: isAdmin ? (parseFloat(formState.horasDiarias) || x.horasDiarias) : x.horasDiarias,
              }
            : x,
        ),
      )
      handleClearSelection()
    }
  }

  const handleRemuneracaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (!value) { setField('remuneracao', ''); return }
    const numberValue = parseInt(value, 10) / 100
    setField('remuneracao', numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  const col3Title = isCreating && addMode === 'interno'
    ? 'Novo Membro da Equipe'
    : isCreating
    ? 'Novo Stakeholder Externo'
    : selected?.tipo === 'interno'
    ? 'Editar Membro'
    : 'Editar Stakeholder'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">

      {/* ── COLUMN 1 — Lista Unificada ── */}
      <div className={`${col1Width} w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Stakeholders do Projeto</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {projeto.length} pessoa{projeto.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu(v => !v)}
                title="Adicionar"
                className="flex items-center gap-1 p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 w-60 bg-white rounded-xl border border-gray-100 shadow-xl z-50 py-1 animate-in fade-in duration-150">
                  <button
                    onClick={() => handleOpenAddMode('interno')}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Users className="w-4 h-4 text-blue-500" />
                    Vincular Membro da Equipe
                  </button>
                  <button
                    onClick={() => handleOpenAddMode('externo')}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-slate-500" />
                    Stakeholder Externo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <input
            type="search"
            placeholder="Buscar por nome, e-mail ou empresa…"
            value={searchProjeto}
            onChange={e => setSearchProjeto(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Reorder error feedback */}
        {reorderError && (
          <p className="mx-4 mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{reorderError}</p>
        )}

        {/* List */}
        {filteredProjeto.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookUser className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              {projeto.length === 0
                ? isAdmin
                  ? 'Nenhuma pessoa. Clique em + para adicionar.'
                  : 'Nenhum stakeholder no projeto.'
                : 'Nenhum resultado para a busca.'}
            </p>
          </div>
        ) : (
          <ul className={`space-y-2 overflow-y-auto max-h-[600px] px-2 py-2${isReordering ? ' opacity-70' : ''}`}>
            {filteredProjeto.map((s, index) => (
              <li
                key={s.id}
                draggable={isAdmin}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center justify-between gap-3 p-3 rounded-xl bg-white border shadow-sm hover:shadow-md transition-all duration-200${
                  draggedIndex === index ? ' opacity-50 border-dashed border-blue-400' : ''
                }${
                  dragOverIndex === index && draggedIndex !== index ? ' border-blue-400 border-t-4' : ' border-slate-200 hover:border-slate-300'
                }${isAdmin ? ' cursor-move' : ''}`}
              >
                {isAdmin && (
                  <div className="text-slate-300 hover:text-slate-500 transition-colors" title="Arrastar para reordenar">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={s.name} url={s.avatarUrl} size="lg" />
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-800 leading-tight truncate">{s.name}</span>
                      <TipoBadge tipo={s.tipo} />
                    </div>
                    {s.tipo === 'externo' && s.company && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {s.company}
                      </span>
                    )}
                    {s.tipo === 'externo' && s.competence && (
                      <span className="text-[11px] text-indigo-500 font-medium truncate">{s.competence}</span>
                    )}
                    {s.tipo === 'interno' && s.cargos && s.cargos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {s.cargos.map(c => (
                          <span key={c} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Briefcase className="w-2.5 h-2.5 shrink-0" />{c}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.tipo === 'interno' && s.departamento && s.departamento.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium truncate">
                        <Building2 className="w-3 h-3 shrink-0" />{s.departamento.join(', ')}
                      </span>
                    )}
                    {s.tipo === 'interno' && (s.remuneracao ?? s.hourlyRate) != null && (s.remuneracao ?? s.hourlyRate)! > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                        <DollarSign className="w-3 h-3 shrink-0" />
                        {(s.remuneracao ?? s.hourlyRate)!.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{s.remuneracao ? '/mês' : '/h'}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {s.email}
                      </span>
                    )}
                  </div>
                </div>
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
                      onClick={() => handleUnlink(s)}
                      disabled={loadingId === s.id}
                      title="Desvincular do projeto"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                    >
                      {loadingId === s.id ? <Spinner /> : <UserMinus className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── COLUMN 2 — Diretório (addMode) ── */}
      {col2Active && (
        <div className="lg:w-1/3 w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-left-4 duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {addMode === 'interno' ? 'Usuários do Sistema' : 'Diretório de Stakeholders'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {addMode === 'interno' ? `${dispInterno.length} disponíveis` : `${dispExterno.length} disponíveis`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {addMode === 'interno' && (
                <button
                  onClick={handleOpenCreateInterno}
                  title="Novo usuário"
                  className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {addMode === 'externo' && (
                <button
                  onClick={handleOpenCreateExterno}
                  title="Novo stakeholder"
                  className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleCloseAddMode}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="search"
              placeholder={addMode === 'interno' ? 'Buscar usuário…' : 'Buscar no diretório…'}
              value={searchDir}
              onChange={e => setSearchDir(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Externo directory */}
          {addMode === 'externo' && (
            filteredDispExterno.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-400">
                  {dispExterno.length === 0 ? 'Todos os stakeholders já estão vinculados.' : 'Nenhum resultado.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50/80 p-2 space-y-1">
                {filteredDispExterno.map(s => (
                  <li key={s.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 hover:shadow-sm transition-all">
                    <Avatar name={s.name} url={s.logoUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                      {s.company && (
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 shrink-0" />{s.company}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleBindExterno(s)}
                        disabled={loadingId === s.id}
                        title="Vincular ao projeto"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
                      >
                        {loadingId === s.id ? <Spinner /> : <UserPlus className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleOpenEdit({
                          id: s.id, tipo: 'externo', stakeholderId: s.id, tenantId: s.tenantId,
                          name: s.name, email: s.email, avatarUrl: s.logoUrl, phone: s.phone,
                          cep: s.cep, logradouro: s.logradouro, numero: s.numero,
                          complemento: s.complemento, bairro: s.bairro, cidade: s.cidade,
                          estado: s.estado, notes: s.notes, company: s.company,
                          competence: s.competence, isActive: s.isActive,
                        })}
                        title="Editar dados"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* Internal users list */}
          {addMode === 'interno' && (
            filteredDispInterno.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-400">
                  {dispInterno.length === 0 ? 'Todos os usuários já estão no projeto.' : 'Nenhum resultado.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50/80 p-2 space-y-1">
                {filteredDispInterno.map(u => (
                  <li key={u.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 hover:shadow-sm transition-all">
                    <Avatar name={u.name} url={u.avatarUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" />{u.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleAddInterno(u)}
                        disabled={loadingId === u.id}
                        title="Adicionar ao projeto"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
                      >
                        {loadingId === u.id ? <Spinner /> : <UserPlus className="w-4 h-4" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}

      {/* ── COLUMN 3 — Formulário de Edição ── */}
      {showCol3 && (
        <div className={`${col3Width} w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 duration-300`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-900">{col3Title}</h2>
            <button onClick={handleClearSelection} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[720px]">

            {/* Avatar */}
            <div className="flex justify-center pb-2">
              <AvatarUpload
                name={formState.name || 'S'}
                avatarUrl={formState.avatarUrl || null}
                onChange={url => setField('avatarUrl', url)}
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
                onChange={e => setField('name', e.target.value)}
                disabled={!isAdmin}
                placeholder="Nome completo ou razão social"
                className={`${inputCls} ${disabledCls}`}
              />
            </div>

            {/* Campos específicos de criação de usuário interno */}
            {isCreating && addMode === 'interno' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    E-mail <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="usuario@empresa.com.br"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Senha <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formState.password}
                    onChange={e => setField('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={inputCls}
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.forcePasswordChange}
                    onChange={e => setField('forcePasswordChange', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Obrigar atualizar a senha no 1º acesso</span>
                </label>
              </>
            )}

            {/* Campos específicos de Externo */}
            {((isCreating && addMode === 'externo') || selected?.tipo === 'externo') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Empresa / Instituição</label>
                  <input
                    type="text"
                    value={formState.company}
                    onChange={e => setField('company', e.target.value)}
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
                    onChange={e => setField('competence', e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Ex: Educação, TI"
                    className={`${inputCls} ${disabledCls}`}
                  />
                </div>
              </div>
            )}

            {/* Campos específicos de Interno */}
            {selected?.tipo === 'interno' && (
              <>
                {/* Remuneração + Horas por dia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="field-remuneracao" className="block text-xs font-medium text-gray-600 mb-1">Remuneração mensal</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-medium text-gray-500 pointer-events-none">R$</span>
                      <input
                        id="field-remuneracao"
                        type="text"
                        value={formState.remuneracao}
                        onChange={handleRemuneracaoChange}
                        disabled={!isAdmin}
                        placeholder="0,00"
                        className={`${inputCls} pl-10 ${disabledCls}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="field-horas-diarias" className="block text-xs font-medium text-gray-600 mb-1">Horas por dia</label>
                    <input
                      id="field-horas-diarias"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formState.horasDiarias}
                      onChange={e => setField('horasDiarias', e.target.value)}
                      disabled={!isAdmin}
                      placeholder="8"
                      className={`${inputCls} ${disabledCls}`}
                    />
                  </div>
                </div>

                {/* Valores calculados */}
                {(() => {
                  const remNum = parseBRLFloat(formState.remuneracao) ?? 0
                  const horasNum = parseFloat(formState.horasDiarias) || 0
                  const valid = horasNum > 0
                  const fmtBRL = (v: number) =>
                    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  const valorDia = valid ? remNum / 30 : null
                  const valorHora = valid ? (remNum / 30) / horasNum : null
                  const valorMinuto = valid ? (remNum / 30) / horasNum / 60 : null
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Valor/dia</p>
                        <p data-testid="valor-dia" className="text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                          {valorDia !== null ? fmtBRL(valorDia) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Valor/hora</p>
                        <p data-testid="valor-hora" className="text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                          {valorHora !== null ? fmtBRL(valorHora) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Valor/minuto</p>
                        <p data-testid="valor-minuto" className="text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                          {valorMinuto !== null ? fmtBRL(valorMinuto) : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex items-center justify-between py-1">
                    <div>
                      <span className="text-xs font-medium text-gray-600">Gerente do Projeto</span>
                      <p className="text-[10px] text-gray-400">Concede acesso de gerência</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAdmin) return
                        const GERENTE_LABEL = 'Gerente de Projeto'
                        setFormState(f => {
                          const next = !f.isGerente
                          const cargos = next
                            ? f.cargos.includes(GERENTE_LABEL) ? f.cargos : [...f.cargos, GERENTE_LABEL]
                            : f.cargos.filter(c => c !== GERENTE_LABEL)
                          return { ...f, isGerente: next, cargos }
                        })
                      }}
                      disabled={!isAdmin}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shrink-0 ${formState.isGerente ? 'bg-blue-600' : 'bg-gray-200'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formState.isGerente ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cargos / Funções</label>
                  <MultiCreatableSelect
                    values={formState.cargos}
                    onChange={v => setField('cargos', v)}
                    options={funcoesExistentes}
                    placeholder="Adicionar cargo..."
                    disabled={!isAdmin}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Departamentos</label>
                  <MultiCreatableSelect
                    values={formState.departamento}
                    onChange={v => setField('departamento', v)}
                    options={departamentosExistentes}
                    placeholder="Adicionar departamento..."
                    disabled={!isAdmin}
                  />
                </div>

                {selected?.isGerente && selected.userId && (
                  <MemberSignatureUpload
                    userId={selected.userId}
                    initialUrl={selected.signatureUrl ?? null}
                    onUpdate={url => {
                      setSelected(prev => prev ? { ...prev, signatureUrl: url } : prev)
                      setProjeto(prev =>
                        prev.map(x => x.id === selected.id ? { ...x, signatureUrl: url } : x),
                      )
                    }}
                  />
                )}
              </>
            )}

            <hr className="border-gray-100" />

            {/* E-mail — oculto ao criar usuário (já aparece no bloco de criação acima) */}
            {!(isCreating && addMode === 'interno') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-mail
                </label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={e => setField('email', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="contato@empresa.com.br"
                  className={`${inputCls} ${disabledCls}`}
                />
              </div>
            )}

            {/* Telefone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Telefone
              </label>
              <input
                type="tel"
                value={formState.phone}
                onChange={e => setField('phone', e.target.value)}
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
                onChange={e => setField('notes', e.target.value)}
                disabled={!isAdmin}
                rows={3}
                placeholder="Anotações internas…"
                className={`${inputCls} ${disabledCls} resize-none`}
              />
            </div>

            {!isAdmin && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Você está em modo somente leitura. Apenas administradores podem editar.
              </p>
            )}

            {formError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
            )}

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
