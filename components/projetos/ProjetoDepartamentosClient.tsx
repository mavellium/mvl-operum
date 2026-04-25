'use client'

import { useState, useTransition } from 'react'
import { getOrCreateDepartmentAction, updateDepartmentNameAction, deleteDepartmentAction } from '@/app/actions/departments'

export interface Departamento {
  id: string
  name: string
  deletedAt?: Date | string | null
}

interface Props {
  projetoId: string
  departamentosIniciais: Departamento[]
}

export default function ProjetoDepartamentosClient({ departamentosIniciais }: Props) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>(departamentosIniciais)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [novoDepartamentoNome, setNovoDepartamentoNome] = useState('')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

const filteredDepartamentos = departamentos
  .filter(d => !d.deletedAt)
  .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

  function handleStartEdit(d: Departamento) {
    setEditingId(d.id)
    setEditNome(d.name)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditNome('')
  }

  function handleSaveEdit(id: string) {
    if (!editNome.trim()) return
    setLoadingId(id)
    startTransition(async () => {
      const result = await updateDepartmentNameAction(id, editNome)
      if ('error' in result) { setLoadingId(null); return }
      setDepartamentos(prev => prev.map(d => d.id === id ? { ...d, name: result.department!.name } : d))
      setLoadingId(null)
      setEditingId(null)
    })
  }

  function handleAdd() {
    if (!novoDepartamentoNome.trim()) return
    setLoadingId('new')
    startTransition(async () => {
      const result = await getOrCreateDepartmentAction(novoDepartamentoNome)
      if ('error' in result) { setLoadingId(null); return }
      setDepartamentos(prev => prev.some(d => d.id === result.department!.id) ? prev : [...prev, { id: result.department!.id, name: result.department!.name }])
      setNovoDepartamentoNome('')
      setShowAdd(false)
      setLoadingId(null)
    })
  }

  function handleRemove(id: string) {
    setLoadingId(id)
    startTransition(async () => {
      const result = await deleteDepartmentAction(id)
      if ('error' in result) { setLoadingId(null); return }
      setDepartamentos(prev => prev.filter(d => d.id !== id))
      setLoadingId(null)
    })
  }

  return (
    <div className="space-y-6">
      
      {/* Header e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="search"
            placeholder="Buscar departamentos cadastrados..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Departamento
        </button>
      </div>

      {/* Formulário de Criação Rápida */}
      {showAdd && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Cadastrar Novo Departamento</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              autoFocus
              placeholder="Ex: Tecnologia, Produto, Marketing..."
              value={novoDepartamentoNome}
              onChange={e => setNovoDepartamentoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={loadingId === 'new' || !novoDepartamentoNome.trim() || isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loadingId === 'new' ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista Principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Departamentos da Organização</h2>
          <p className="text-xs text-gray-500 mt-0.5">{filteredDepartamentos.length} cadastrados</p>
        </div>

        {filteredDepartamentos.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-sm font-medium text-gray-900">Nenhum departamento encontrado</p>
            <p className="text-sm text-gray-500 mt-1">Crie departamentos para organizar melhor a sua equipe.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDepartamentos.map(departamento => (
              <div key={departamento.id} className="group transition-colors hover:bg-gray-50/50">
                <div className="px-6 py-4 flex items-center justify-between gap-4">
                  
                  {/* Visualização Padrão */}
                  {editingId !== departamento.id ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <p className="font-medium text-sm text-gray-900">{departamento.name}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                        <button
                          onClick={() => handleStartEdit(departamento)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleRemove(departamento.id)}
                          disabled={loadingId === departamento.id || isPending}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Remover"
                        >
                          {loadingId === departamento.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Modo Edição Inline */
                    <div className="flex-1 flex items-center gap-3 animate-in fade-in">
                      <input
                        type="text"
                        autoFocus
                        value={editNome}
                        onChange={e => setEditNome(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(departamento.id)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      />
                      <button onClick={handleCancelEdit} className="text-xs font-medium text-gray-500 hover:text-gray-700">Cancelar</button>
                      <button 
                        onClick={() => handleSaveEdit(departamento.id)}
                        disabled={loadingId === departamento.id || isPending}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}