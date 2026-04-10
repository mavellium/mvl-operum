'use client'

import { useState } from 'react'
import UserAvatar from '@/components/user/UserAvatar'

// --- Tipos Simulados ---
interface DocVersion {
  id: string
  title: string
  content: string
  updatedAt: Date
  author: { name: string; avatarUrl?: string }
}

interface DocumentInfo {
  id: string
  title: string
  icon: string
  versions: DocVersion[]
}

// --- Dados Mockados ---
const MOCK_DOCS: DocumentInfo[] = [
  {
    id: 'doc-1',
    title: 'Visão Geral do Projeto',
    icon: '📚',
    versions: [
      {
        id: 'v2',
        title: 'Visão Geral do Projeto',
        content: '# Visão Geral\n\nEste projeto visa revolucionar o mercado de Kanban...',
        updatedAt: new Date('2026-04-10T10:00:00'),
        author: { name: 'Mavellium' }
      },
      {
        id: 'v1',
        title: 'Visão Geral',
        content: '# Visão\n\nCriar um Kanban legal.',
        updatedAt: new Date('2026-04-01T14:30:00'),
        author: { name: 'João' }
      }
    ]
  },
  {
    id: 'doc-2',
    title: 'Guia de Contribuição',
    icon: '🛠️',
    versions: [
      {
        id: 'v1',
        title: 'Guia de Contribuição',
        content: '## Como comitar\n\n1. Faça um fork\n2. Crie uma branch...',
        updatedAt: new Date('2026-04-05T09:15:00'),
        author: { name: 'Maria' }
      }
    ]
  }
]

export default function DocsPage() {
  const [activeDocId, setActiveDocId] = useState<string>(MOCK_DOCS[0].id)
  const [isEditing, setIsEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  
  // Estado temporário para edição
  const [draftContent, setDraftContent] = useState('')
  const [draftTitle, setDraftTitle] = useState('')

  const activeDoc = MOCK_DOCS.find(d => d.id === activeDocId)
  const latestVersion = activeDoc?.versions[0]

  const handleEditStart = () => {
    if (latestVersion) {
      setDraftTitle(latestVersion.title)
      setDraftContent(latestVersion.content)
      setIsEditing(true)
      setShowHistory(false)
    }
  }

  const handleSave = () => {
    // Aqui entraria a API para criar uma nova versão
    console.log('Salvando nova versão:', draftTitle, draftContent)
    setIsEditing(false)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      
      {/* SIDEBAR: Lista de Documentos */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Documentação</h2>
          <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Novo Documento">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {MOCK_DOCS.map(doc => (
            <button
              key={doc.id}
              onClick={() => { setActiveDocId(doc.id); setIsEditing(false); setShowHistory(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all text-left ${
                activeDocId === doc.id 
                  ? 'bg-blue-50 text-blue-700 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{doc.icon}</span>
              <span className="truncate">{doc.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ÁREA PRINCIPAL: Leitura / Edição */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* HEADER DA PÁGINA */}
        <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
             <span className="text-gray-400">Em / Documentação</span>
             <span className="text-gray-300">/</span>
             <span className="font-medium text-gray-800 truncate max-w-[300px]">{activeDoc?.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${showHistory ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Histórico
                </button>
                <button 
                  onClick={handleEditStart}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                >
                  Editar
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-md transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm">
                  Salvar
                </button>
              </>
            )}
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO (Com scroll) */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto px-8 py-12">
            
            {isEditing ? (
              <div className="space-y-6">
                <input 
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="w-full text-4xl font-extrabold text-gray-900 border-none outline-none placeholder:text-gray-300"
                  placeholder="Título do Documento"
                />
                
                {/* Mockup de Toolbar de Edição Rica */}
                <div className="sticky top-0 z-20 flex items-center gap-1 border border-gray-200 p-1.5 bg-gray-50 rounded-lg shadow-sm mb-4">
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600"><span className="font-bold">B</span></button>
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600"><span className="italic">I</span></button>
                  <div className="w-px h-5 bg-gray-300 mx-1"></div>
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 font-bold">H1</button>
                  <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 font-bold">H2</button>
                </div>

                <textarea 
                  value={draftContent}
                  onChange={e => setDraftContent(e.target.value)}
                  className="w-full h-[500px] text-gray-700 leading-relaxed border-none outline-none resize-none font-mono text-sm"
                  placeholder="Comece a escrever..."
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8 text-gray-500 text-sm">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={latestVersion?.author.name || ''} size="xs" />
                    <span>Modificado por <span className="font-medium text-gray-700">{latestVersion?.author.name}</span></span>
                  </div>
                  <span>•</span>
                  <span>{latestVersion?.updatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <h1 className="text-4xl font-extrabold text-gray-900 mb-8">{latestVersion?.title}</h1>
                
                {/* Aqui você renderizaria o Markdown de verdade usando react-markdown ou similar */}
                <div className="prose prose-blue max-w-none text-gray-700">
                  <div className="whitespace-pre-wrap">{latestVersion?.content}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR DE HISTÓRICO (Desliza da direita) */}
        {showHistory && (
          <div className="absolute top-14 right-0 bottom-0 w-80 bg-gray-50 border-l border-gray-200 shadow-2xl animate-in slide-in-from-right-8 duration-300 flex flex-col z-20">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <h3 className="font-bold text-gray-800">Histórico de Versões</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeDoc?.versions.map((version, idx) => (
                <div key={version.id} className={`p-3 rounded-lg border ${idx === 0 ? 'bg-white border-blue-200 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-gray-300'} cursor-pointer transition-colors`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{idx === 0 ? 'Atual' : version.id}</span>
                    <span className="text-[11px] text-gray-400">{version.updatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-2 truncate">{version.title}</p>
                  <div className="flex items-center gap-2">
                    <UserAvatar name={version.author.name} size="xs" />
                    <span className="text-xs text-gray-500">{version.author.name}</span>
                  </div>
                  {idx !== 0 && (
                    <button className="mt-3 w-full py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                      Restaurar Versão
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}