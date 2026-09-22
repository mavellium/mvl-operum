'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, X, Briefcase } from 'lucide-react'
import { associarFuncaoAction, desassociarFuncaoAction } from '@/app/actions/cadastros'

export interface CatalogItem {
  id: string
  name: string
}

interface Props {
  projetoId: string
  catalogo: CatalogItem[]
  associadasIniciais: string[]
}

export default function ProjetoFuncoesClient({ projetoId, catalogo, associadasIniciais }: Props) {
  const [associadas, setAssociadas] = useState<string[]>(associadasIniciais)
  const [addMode, setAddMode] = useState(false)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const associadasItems = catalogo
    .filter(f => associadas.includes(f.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const disponiveis = catalogo
    .filter(f => !associadas.includes(f.id))
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  function associar(id: string) {
    setBusyId(id)
    setError(null)
    startTransition(async () => {
      const result = await associarFuncaoAction(projetoId, id)
      if ('error' in result) { setError(result.error ?? "Erro"); setBusyId(null); return }
      setAssociadas(prev => [...prev, id])
      setBusyId(null)
    })
  }

  function desassociar(id: string) {
    setBusyId(id)
    setError(null)
    startTransition(async () => {
      const result = await desassociarFuncaoAction(projetoId, id)
      if ('error' in result) { setError(result.error ?? "Erro"); setBusyId(null); return }
      setAssociadas(prev => prev.filter(x => x !== id))
      setBusyId(null)
    })
  }

  function toggleAddMode() {
    setAddMode(v => !v)
    setSearch('')
    setError(null)
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">
        O catálogo de funções é global (gerido pelo admin). Apenas as funções associadas a este projeto são exibidas. Desassociar não apaga o cadastro global.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Funções associadas ao projeto</h2>
            <p className="text-xs text-gray-500 mt-0.5">{associadas.length} de {catalogo.length} associadas</p>
          </div>
          <button
            type="button"
            onClick={toggleAddMode}
            disabled={isPending || busyId !== null}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
              addMode
                ? 'border border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {addMode ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {addMode ? 'Fechar' : 'Associar função'}
          </button>
        </div>

        {associadasItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">Nenhuma função associada a este projeto ainda.</p>
            <p className="text-xs text-gray-400 mt-1">Clique em “Associar função” para escolher do catálogo global.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {associadasItems.map(item => {
              const loading = busyId === item.id
              return (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-2 py-0.5">Associada</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => desassociar(item.id)}
                    disabled={isPending || busyId !== null}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : 'Desassociar'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {addMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-200">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-900">Associar função do catálogo global</h2>
            <p className="text-xs text-gray-500 mt-0.5">Busque e associe funções cadastradas globalmente neste projeto.</p>
          </div>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar no catálogo global..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
          </div>
          {disponiveis.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-500">Nenhuma função disponível para associar.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {disponiveis.map(item => {
                const loading = busyId === item.id
                return (
                  <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => associar(item.id)}
                      disabled={isPending || busyId !== null}
                      className="px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Salvando...' : 'Associar'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}