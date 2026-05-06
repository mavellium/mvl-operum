'use client'

const DOCUMENTS = [
  { id: 'stakeholder', label: 'Formulário de Partes Interessadas' },
  { id: 'charter', label: 'Termo de Abertura' },
] as const

interface Props {
  activeDoc: string
  onSelect: (id: string) => void
}

export default function DocumentSidebar({ activeDoc, onSelect }: Props) {
  return (
    <nav className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col py-4 gap-1 px-2">
      <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Documentos
      </p>
      {DOCUMENTS.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeDoc === doc.id
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {doc.label}
        </button>
      ))}
    </nav>
  )
}
