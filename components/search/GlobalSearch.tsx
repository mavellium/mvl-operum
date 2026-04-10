'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UserAvatar from '@/components/user/UserAvatar' // Adicionado para renderizar a foto do usuário

// Tipagem atualizada para suportar 'member' e seus dados específicos
interface SearchResult {
  id: string
  title: string
  type: 'project' | 'card' | 'member'
  description?: string
  color?: string
  sprintId?: string
  projectId?: string // Útil para saber de qual projeto o membro é
  sprint?: string | null
  sprintColumn?: string | null
  tags?: { name: string; color: string }[]
  avatarUrl?: string | null // Específico para o tipo 'member'
}

interface GlobalSearchProps {
  placeholder?: string
  searchContext?: 'global_projects' | 'project_items' | 'sprint_items' | 'project_members' | 'default'
  contextId?: string
}

export default function GlobalSearch({
  placeholder = 'Buscar...',
  searchContext = 'default',
  contextId
}: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        q,
        context: searchContext,
        ...(contextId && { contextId }) 
      })

      const res = await fetch(`/api/search?${queryParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      }
    } finally {
      setLoading(false)
    }
  }, [searchContext, contextId])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
  }

  // Lógica de Redirecionamento Atualizada
  const handleResultClick = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    
    if (result.type === 'project') {
      router.push(`/projetos/${result.id}`)
    } else if (result.type === 'card' && result.sprintId) {
      router.push(`/sprints/${result.sprintId}?card=${result.id}`)
    } else if (result.type === 'member' && contextId) {
      // Se for membro, leva o usuário para a página de membros do projeto
      // Dica: Você pode usar '?user=id' na URL para dar um highlight na página depois!
      router.push(`/projetos/${contextId}/membros?highlight=${result.id}`)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Busca global"
          className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-shadow"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 w-96 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 max-h-80 overflow-y-auto"
          role="listbox"
          aria-label="Resultados da busca"
        >
          {results.map(result => (
            <div
              key={result.id}
              className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
              role="option"
              aria-selected={false}
              onClick={() => handleResultClick(result)}
            >
              <div className="flex items-center gap-3">
                
                {/* Ícones Dinâmicos com base no tipo de resultado */}
                {result.type === 'card' && (
                  <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: result.color || '#3b82f6' }} />
                )}
                
                {result.type === 'project' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                )}

                {result.type === 'member' && (
                  <div className="shrink-0">
                    <UserAvatar name={result.title} avatarUrl={result.avatarUrl} size="sm" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                  
                  {/* Descrição para Cards */}
                  {result.type === 'card' && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {result.sprintColumn}
                      {result.sprint && <span className="ml-1 text-blue-500">· {result.sprint}</span>}
                    </p>
                  )}

                  {/* Descrição para Projetos ou Membros (ex: Email ou Cargo) */}
                  {(result.type === 'project' || result.type === 'member') && result.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {result.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute top-full mt-1 left-0 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-4 z-50 text-center">
          <p className="text-sm text-gray-500">Nenhum resultado para &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}