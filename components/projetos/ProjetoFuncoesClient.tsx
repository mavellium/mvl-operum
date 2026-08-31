'use client'

import { useState, useTransition } from 'react'
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
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtradas = catalogo
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(associadas.includes(b.id)) - Number(associadas.includes(a.id)))

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
        O catálogo de funções é global (gerido pelo admin). Marque as que este projeto utiliza. Desmarcar não apaga o cadastro global.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Funções associadas ao projeto</h2>
          <p className="text-xs text-gray-500 mt-0.5">{associadas.length} de {catalogo.length} associadas</p>
        </div>

        {filtradas.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">Nenhuma função encontrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtradas.map(item => {
              const isOn = associadas.includes(item.id)
              const loading = busyId === item.id
              return (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    {isOn && <span className="text-[10px] font-semibold uppercase tracking-wide bg-green-50 text-green-700 rounded-full px-2 py-0.5">Associada</span>}
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
