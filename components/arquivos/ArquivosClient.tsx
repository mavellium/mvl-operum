'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

interface Attachment {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileSizeFormatted: string
  filePath: string
  isCover: boolean
  uploadedAt: string
  card: {
    id: string
    title: string
    sprintId: string
    sprintName: string
  }
  uploadedBy: string | null
}

interface Props {
  initialAttachments: Attachment[]
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) {
    return (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  if (fileType === 'application/pdf') {
    return (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function getFileCategory(fileType: string) {
  if (fileType.startsWith('image/')) return 'imagem'
  if (fileType === 'application/pdf') return 'pdf'
  return 'outro'
}

export default function ArquivosClient({ initialAttachments }: Props) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterSprint, setFilterSprint] = useState('')

  const sprints = useMemo(() => {
    const map = new Map<string, string>()
    initialAttachments.forEach(a => map.set(a.card.sprintId, a.card.sprintName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [initialAttachments])

  const filtered = useMemo(() => {
    return initialAttachments.filter(a => {
      if (search) {
        const q = search.toLowerCase()
        if (!a.fileName.toLowerCase().includes(q) && !a.card.title.toLowerCase().includes(q)) return false
      }
      if (filterType && getFileCategory(a.fileType) !== filterType) return false
      if (filterSprint && a.card.sprintId !== filterSprint) return false
      return true
    })
  }, [initialAttachments, search, filterType, filterSprint])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="Buscar por nome ou card…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os tipos</option>
          <option value="imagem">Imagens</option>
          <option value="pdf">PDFs</option>
          <option value="outro">Outros</option>
        </select>
        <select
          value={filterSprint}
          onChange={e => setFilterSprint(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as sprints</option>
          {sprints.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {filtered.length} arquivo{filtered.length !== 1 ? 's' : ''}
        {search || filterType || filterSprint ? ' (filtrado)' : ''}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Arquivo</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Card / Sprint</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Enviado por</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Tamanho</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Data</th>
              <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhum arquivo encontrado
                </td>
              </tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getFileIcon(a.fileType)}
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{a.fileName}</p>
                      <p className="text-xs text-gray-400">{a.fileType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-gray-700 truncate max-w-[180px]">{a.card.title}</p>
                  <p className="text-xs text-gray-400">{a.card.sprintName}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{a.uploadedBy ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">{a.fileSizeFormatted}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-400 hidden lg:table-cell">
                  {new Date(a.uploadedAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={a.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Download
                    </a>
                    <Link
                      href={`/sprints/${a.card.sprintId}`}
                      className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Ver card
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
