'use client'

import { useState, useTransition } from 'react'
import { associarDepartamentoAction, desassociarDepartamentoAction } from '@/app/actions/cadastros'

export interface CatalogItem {
  id: string
  name: string
}

interface Props {
  projetoId: string
  catalogo: CatalogItem[]
  associadosIniciais: string[]
}

export default function ProjetoDepartamentosClient({ projetoId, catalogo, associadosIniciais }: Props) {
  const [associados, setAssociados] = useState<string[]>(associadosIniciais)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtrados = catalogo
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(associados.includes(b.id)) - Number(associados.includes(a.id)))

  function associar(id: string) {
    setBusyId(id)
    setError(null)
    startTransition(async () => {
      const result = await associarDepartamentoAction(projetoId, id)
      if ('error' in result) { setError(result.error ?? "Erro"); setBusyId(null); return }
      setAssociados(prev => [...prev, id])
      setBusyId(null)
    })
  }

  function desassociar(id: string) {
    setBusyId(id)
    setError(null)
    startTransition(async () => {
      const result = await desassociarDepartamentoAction(projetoId, id)
      if ('error' in result) { setError(result.error ?? "Erro"); setBusyId(null); return }
      setAssociados(prev => prev.filter(x => x !== id))
      setBusyId(null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="search"
          placeholder="Buscar no catálogo global..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
        />
      </div>

      <p className="text-xs text-gray-500">
        O catálogo de departamentos é global (gerido pelo admin). Marque os que este projeto utiliza. Desmarcar não apaga o cadastro global.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Departamentos associados ao projeto</h2>
          <p className="text-xs text-gray-500 mt-0.5">{associados.length} de {catalogo.length} associados</p>
        </div>

        {filtrados.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">Nenhum departamento encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtrados.map(item => {
              const isOn = associados.includes(item.id)
              const loading = busyId === item.id
              return (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    {isOn && <span className="text-[10px] font-semibold uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-2 py-0.5">Associado</span>}
                  </div>
                  <button
                    onClick={() => (isOn ? desassociar(item.id) : associar(item.id))}
                    disabled={isPending || busyId !== null}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${
                      isOn
                        ? 'border border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Salvando...' : (isOn ? 'Desassociar' : 'Associar')}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
