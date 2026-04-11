'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { addMemberAction, removeMemberAction, updateUsuarioProjetoAction } from '@/app/actions/projetos'
import UserAvatar from '@/components/user/UserAvatar'

interface Usuario {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
}

interface Membro extends Usuario {
  userId: string
  cargos: string[] 
  departamentos: string[] 
  valorHora: number | null
  dataEntrada: string
}

interface Props {
  projetoId: string
  membros: Membro[]
  disponiveis: Usuario[]
  departamentosExistentes?: string[]
  funcoesExistentes?: string[]
  canManage: boolean
}

const ROLE_LABELS: Record<string, string> = {
  gerente: 'Gerente de Projetos',
  member: 'Membro',
}

const ROLE_COLORS: Record<string, string> = {
  gerente: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-gray-50 text-gray-600 border-gray-200',
}

function MultiCreatableSelect({ 
  values = [], 
  onChange, 
  options, 
  placeholder 
}: { 
  values: string[]; 
  onChange: (v: string[]) => void; 
  options: string[]; 
  placeholder: string;
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

  const handleSelect = (val: string) => {
    if (!values.includes(val)) {
      onChange([...values, val])
    }
    setSearch('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleRemove = (val: string) => {
    onChange(values.filter(v => v !== val))
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className="min-h-[42px] w-full px-2 py-1.5 border border-gray-200 rounded-xl text-sm bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-shadow cursor-text flex flex-wrap gap-1.5 items-center"
        onClick={() => {
          setIsOpen(true)
          inputRef.current?.focus()
        }}
      >
        {values.map(val => (
          <span key={val} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium border border-blue-100">
            {val}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemove(val); }}
              className="hover:text-blue-900 focus:outline-none"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm placeholder:text-gray-400"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
          {filteredOptions.length > 0 && filteredOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
            >
              {opt}
            </button>
          ))}
          
          {showCreateOption && (
            <button
              onClick={() => handleSelect(search.trim())}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 font-medium bg-blue-50/50 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-t border-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Criar "{search.trim()}"
            </button>
          )}

          {filteredOptions.length === 0 && !showCreateOption && (
            <div className="px-3 py-2 text-sm text-gray-400 italic text-center">
              {values.length > 0 ? "Nenhuma outra opção encontrada" : "Nenhuma opção encontrada"}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProjetoMembrosClient({
  projetoId,
  membros: initial,
  disponiveis: initialDisp,
  departamentosExistentes = [],
  funcoesExistentes = [],
  canManage,
}: Props) {
  const [membros, setMembros] = useState(initial)
  const [disponiveis, setDisponiveis] = useState(initialDisp)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [editForm, setEditForm] = useState<{ role: string; cargos: string[]; departamentos: string[]; valorHora: string }>({ 
    role: '', 
    cargos: [], 
    departamentos: [], 
    valorHora: '' 
  })

  const filteredDisp = disponiveis.filter(u => {
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  useEffect(() => {
    if (showAdd) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [showAdd])

  function handleStartEdit(m: Membro) {
    setEditingId(m.userId)
    setEditForm({
      role: m.role ?? 'member',
      cargos: m.cargos ?? [],
      departamentos: m.departamentos ?? [],
      valorHora: m.valorHora?.toString() ?? '',
    })
  }

  function handleCancelEdit() {
    setEditingId(null)
  }

  function handleSaveEdit(m: Membro) {
    setLoadingId(m.userId)
    startTransition(async () => {
      const result = await updateUsuarioProjetoAction(m.userId, projetoId, {
        projectRole: editForm.role,
        cargos: editForm.cargos,
        departamentos: editForm.departamentos,
        valorHora: editForm.valorHora ? parseFloat(editForm.valorHora) : null,
      })
      setLoadingId(null)
      
      if (!('error' in result)) {
        setMembros(prev => prev.map(existing =>
          existing.userId === m.userId
            ? {
                ...existing,
                role: editForm.role || existing.role,
                cargos: editForm.cargos,
                departamentos: editForm.departamentos,
                valorHora: editForm.valorHora ? parseFloat(editForm.valorHora) : null,
              }
            : existing,
        ))
        setEditingId(null)
      }
    })
  }

  function handleAdd(user: Usuario) {
    setLoadingId(user.id)
    startTransition(async () => {
      const result = await addMemberAction(projetoId, user.id)
      setLoadingId(null)
      if ('error' in result) return
      const novoMembro: Membro = {
        ...user,
        userId: user.id,
        cargos: [],
        departamentos: [],
        valorHora: null,
        dataEntrada: new Date().toISOString(),
      }
      setMembros(prev => [...prev, novoMembro])
      setDisponiveis(prev => prev.filter(u => u.id !== user.id))
      setSearch('')
      if (disponiveis.length === 1) setShowAdd(false) 
    })
  }

  function handleRemove(membro: Membro) {
    setLoadingId(membro.userId)
    startTransition(async () => {
      const result = await removeMemberAction(projetoId, membro.userId)
      setLoadingId(null)
      if ('error' in result) return
      setMembros(prev => prev.filter(m => m.userId !== membro.userId))
      setDisponiveis(prev => [...prev, { id: membro.userId, name: membro.name, email: membro.email, avatarUrl: membro.avatarUrl, role: membro.role }])
    })
  }

  const isAdmin = canManage

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Equipe do Projeto</h2>
            <p className="text-xs text-gray-500 mt-0.5">{membros.length} membro{membros.length !== 1 ? 's' : ''} associado{membros.length !== 1 ? 's' : ''}</p>
          </div>
          
          {/* SÓ MOSTRA O BOTÃO SE FOR ADMIN */}
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Membro
            </button>
          )}
        </div>

        {membros.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Nenhum membro encontrado</p>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin ? 'Adicione pessoas para começarem a colaborar.' : 'Fale com um administrador para adicionar novos membros ao projeto.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {membros.map(m => (
              <div key={m.userId} className="group transition-colors hover:bg-gray-50/50">
                
                <div className="px-6 py-4 flex items-start sm:items-center gap-4">
                  <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="md" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 mb-0.5">{m.name}</p>
                    <p className="text-xs text-gray-500 mb-1.5">{m.email}</p>
                    
                    {editingId !== m.userId && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase tracking-wider ${ROLE_COLORS[m.role] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {ROLE_LABELS[m.role] ?? m.role}
                        </span>

                        {m.cargos?.map(cargo => (
                          <span key={cargo} className="flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {cargo}
                          </span>
                        ))}
                        
                        {m.departamentos?.map(depto => (
                          <span key={depto} className="flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            {depto}
                          </span>
                        ))}
                        
                        {m.valorHora != null && (
                          <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            R$ {m.valorHora.toFixed(2)}/h
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                    {editingId !== m.userId && (
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar detalhes"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                    
                    {/* SÓ MOSTRA O BOTÃO DE REMOVER SE FOR ADMIN */}
                    {isAdmin && (
                      <button
                        onClick={() => handleRemove(m)}
                        disabled={loadingId === m.userId || isPending}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Remover membro"
                      >
                        {loadingId === m.userId ? (
                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Formulário de Edição Inline */}
                {editingId === m.userId && (
                  <div className="px-6 py-5 bg-blue-50/40 border-t border-blue-100/50 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-4">Editar Permissões e Detalhes</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                      {/* Select Nativo para Nível de Acesso (Role) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Nível de Acesso</label>
                        <div className="relative">
                          <select
                            value={editForm.role}
                            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                            disabled={!isAdmin} // Impede gerentes de alterarem o Nível de Acesso
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow appearance-none disabled:bg-gray-50 disabled:text-gray-500"
                          >
                            <option value="member">Membro</option>
                            <option value="gerente">Gerente de Projetos</option>
                          </select>
                          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>

                      {/* Select Multi-Customizado para Função */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Funções / Papéis</label>
                        <MultiCreatableSelect 
                          values={editForm.cargos}
                          onChange={(v) => setEditForm(f => ({ ...f, cargos: v }))}
                          options={funcoesExistentes}
                          placeholder="Adicionar..."
                        />
                      </div>

                      {/* Select Multi-Customizado para Departamento */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Departamentos</label>
                        <MultiCreatableSelect 
                          values={editForm.departamentos}
                          onChange={(v) => setEditForm(f => ({ ...f, departamentos: v }))}
                          options={departamentosExistentes}
                          placeholder="Adicionar..."
                        />
                      </div>

                      {/* Input Numérico para Valor */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Valor/hora (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.valorHora}
                          onChange={e => setEditForm(f => ({ ...f, valorHora: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(m)}
                        disabled={loadingId === m.userId || isPending}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {loadingId === m.userId && (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Adicionar Membro */}
      {showAdd && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 sm:px-0">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Adicionar ao projeto</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="search"
                  placeholder="Buscar por nome ou e-mail..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              {filteredDisp.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">
                    {disponiveis.length === 0 ? 'Todos os usuários disponíveis já estão neste projeto.' : `Nenhum usuário encontrado para "${search}"`}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {filteredDisp.map(u => (
                    <li key={u.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="md" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAdd(u)}
                        disabled={loadingId === u.id || isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                      >
                        {loadingId === u.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Adicionar
                          </>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
              {filteredDisp.length} usuário{filteredDisp.length !== 1 ? 's' : ''} disponível{filteredDisp.length !== 1 ? 'is' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}