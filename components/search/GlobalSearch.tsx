'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SearchResult {
  id: string
  title: string
  description: string
  responsible: string
  color: string
  column: string
  sprint: string | null
  tags: { name: string; color: string }[]
}

export default function GlobalSearch() {
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

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

  return (
    <div ref={containerRef} className="relative w-64">
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
          placeholder="Buscar cards..."
          aria-label="Busca global"
          className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
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
              onClick={() => setOpen(false)}
            >
              <div className="flex items-start gap-2">
                <div className="w-1 h-full rounded-full shrink-0 mt-1" style={{ backgroundColor: result.color, minHeight: '12px' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {result.column}
                    {result.sprint && <span className="ml-1 text-blue-500">· {result.sprint}</span>}
                    {result.responsible && <span className="ml-1">· {result.responsible}</span>}
                  </p>
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
