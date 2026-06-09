'use client'

import { useState, useEffect, useRef, startTransition } from 'react'
import { Card, CardColor, Attachment } from '@/types/kanban'
import { assignTagToCardAction, removeTagFromCardAction } from '@/app/actions/tags'
import { addManualTimeAction, getTimeEntriesAction, updateTimeEntryAction, deleteTimeEntryAction } from '@/app/actions/time'
import { getCardMovementsAction } from '@/app/actions/sprintBoard'
import CardTimer from './CardTimer'
import UserAvatar from '@/components/user/UserAvatar'
import ColorPicker from './ColorPicker'
import { TagSelector } from '../tag/TagSelector'
import MultiUserSelector from './MultiUserSelector'

// --- Interfaces ---
interface User { id: string; name: string; email: string; avatarUrl?: string | null }
interface Tag { id: string; name: string; color: string }
interface Comment { id: string; user: User; content: string; createdAt: Date }

interface TimeEntry {
  id: string
  duration: number
  description?: string | null
  isManual: boolean
  isRunning: boolean
  startedAt: string | Date
  endedAt?: string | Date | null
}

interface CardMovement {
  id: string
  fromColumnTitle: string | null
  toColumnTitle: string | null
  reason: string | null
  movedAt: string
}

interface CardModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; description: string; color: CardColor; priority: string }) => void
  initialCard?: Card
  users?: User[]
  boardTags?: Tag[]
  attachments?: Attachment[]
  onAttachmentUpload?: (file: File) => void
  onAttachmentDelete?: (attachmentId: string) => void
  onAttachmentSetCover?: (attachmentId: string) => void
  comments?: Comment[]
  onAddComment?: (content: string) => void
}

const DEFAULT_COLOR: CardColor = '#6b7280'

// --- Tipos para a Coluna Direita Modular ---
type RightPanelMode = 'comments' | 'timer' | 'properties' | 'movements'

export default function CardModal({
  isOpen, onClose, onSubmit, initialCard, users, boardTags, attachments = [],
  onAttachmentUpload, onAttachmentDelete, onAttachmentSetCover,
  comments = [], onAddComment
}: CardModalProps) {
  
  // Estados Gerais de Dados (Auto-save on close)
  const [title, setTitle] = useState('')
  const [color, setColor] = useState<CardColor>(DEFAULT_COLOR)
  const [priority, setPriority] = useState('media')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [error, setError] = useState('')

  // Estados Isolados de Texto (Exigem salvamento manual)
  const [savedDescription, setSavedDescription] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  
  const [commentText, setCommentText] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)

  // Estados de UI
  const [coverIndex] = useState(0)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('comments')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para Registro Manual de Tempo
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')
  const [manualDesc, setManualDesc] = useState('')

  // Time entries list
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editHours, setEditHours] = useState('')
  const [editMinutes, setEditMinutes] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Movements
  const [movements, setMovements] = useState<CardMovement[]>([])

  const imageAttachments = attachments.filter(a => a.fileType.startsWith('image/'))
  const hasCover = imageAttachments.length > 0
  const isEditing = !!initialCard

  // Setup Inicial e Bloqueio de Scroll
  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        setTitle(initialCard?.title ?? '')
        setSavedDescription(initialCard?.description ?? '')
        setDraftDescription(initialCard?.description ?? '')
        setColor(initialCard?.color ?? DEFAULT_COLOR)
        setPriority(initialCard?.priority ?? 'media')
        setSelectedTagIds(initialCard?.tags?.map(t => t.tagId) ?? [])
        setError('')
        setIsEditingDesc(false)
        setIsCommenting(false)
        setRightPanelMode('comments')
        setManualHours('')
        setManualMinutes('')
        setManualDesc('')
        setTimeEntries([])
        setMovements([])
        setEditingEntryId(null)
      })
      document.body.style.overflow = 'hidden'
      if (initialCard?.id) {
        getTimeEntriesAction(initialCard.id).then(res => {
          if ('entries' in res && res.entries) setTimeEntries(res.entries as TimeEntry[])
        })
        getCardMovementsAction(initialCard.id).then(res => {
          if ('movements' in res && res.movements) setMovements(res.movements as CardMovement[])
        })
      }
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen, initialCard])

  const handleTagToggle = async (tagId: string) => {
    if (!initialCard) return
    setSelectedTagIds(ids => ids.includes(tagId) ? ids.filter(id => id !== tagId) : [...ids, tagId])
    if (selectedTagIds.includes(tagId)) await removeTagFromCardAction(initialCard.id, tagId)
    else await assignTagToCardAction(initialCard.id, tagId)
  }

  // Acionado ao fechar o modal. Salva título e propriedades dinâmicas, e usa a descrição *salva*.
  const handleCloseModal = () => {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    onSubmit({ 
      title: title.trim(), 
      description: savedDescription, 
      color, 
      priority 
    })
    onClose()
  }

  // Botão específico da descrição
  const handleSaveDescription = () => {
    setSavedDescription(draftDescription)
    setIsEditingDesc(false)
    // Se quiser que a requisição de API dispare na hora, chame onSubmit aqui passando o draftDescription
  }

  const handleCommentSubmit = () => {
    if (commentText.trim() && onAddComment) {
      onAddComment(commentText)
      setCommentText('')
      setIsCommenting(false)
    }
  }

  const handleRegisterTime = async () => {
    const h = parseInt(manualHours || '0', 10)
    const m = parseInt(manualMinutes || '0', 10)
    if (h === 0 && m === 0) return
    if (!manualDesc.trim()) return
    if (!initialCard?.id) return
    const res = await addManualTimeAction(initialCard.id, h, m, manualDesc.trim())
    if ('entry' in res && res.entry) {
      setTimeEntries(prev => [res.entry as TimeEntry, ...prev])
    }
    setManualHours('')
    setManualMinutes('')
    setManualDesc('')
  }

  const handleStartEditEntry = (entry: TimeEntry) => {
    setEditingEntryId(entry.id)
    const totalSecs = entry.duration
    setEditHours(String(Math.floor(totalSecs / 3600)))
    setEditMinutes(String(Math.floor((totalSecs % 3600) / 60)))
    setEditDesc(entry.description ?? '')
  }

  const handleSaveEditEntry = async () => {
    if (!editingEntryId) return
    const h = parseInt(editHours || '0', 10)
    const m = parseInt(editMinutes || '0', 10)
    const res = await updateTimeEntryAction(editingEntryId, h, m, editDesc || undefined)
    if ('entry' in res) {
      setTimeEntries(prev => prev.map(e => e.id === editingEntryId ? { ...e, duration: h * 3600 + m * 60, description: editDesc || null } : e))
    }
    setEditingEntryId(null)
  }

  const handleDeleteEntry = async (entryId: string) => {
    await deleteTimeEntryAction(entryId)
    setTimeEntries(prev => prev.filter(e => e.id !== entryId))
  }

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Função helper para a toolbar de markdown
  const insertMarkdown = (prefix: string, suffix = '') => {
    setDraftDescription(prev => prev + `${prefix}texto${suffix}`)
  }

  const hasUnsavedDescription = draftDescription !== savedDescription

  if (!isOpen) return null

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">

      <div className="absolute inset-0" onClick={handleCloseModal} aria-hidden="true" />

      {/* Container Principal do Modal */}
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#22272B] text-[#B6C2CF] rounded-xl shadow-2xl font-sans flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">

        <button
          aria-label="Salvar"
          onClick={handleCloseModal}
          className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* CAPA FIXA NO TOPO */}
        {hasCover && (
          <div className="relative w-full h-48 sm:h-56 bg-[#111214] shrink-0 group flex items-center justify-center border-b border-[#3B444C]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageAttachments[coverIndex].filePath} alt="Capa" className="w-full h-full object-cover opacity-90" />
            <button className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-[#22272B]/80 hover:bg-[#2C333A] text-sm text-white font-medium rounded-md backdrop-blur-md border border-[#3B444C] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Alterar Capa
            </button>
          </div>
        )}

        {/* ÁREA DE SCROLL INDEPENDENTE (FLEX-ROW) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* === COLUNA ESQUERDA (PRINCIPAL) === */}
          <div className="flex-1 p-6 sm:px-10 sm:py-8 space-y-10 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3B444C] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#738496]">
            
            {/* Título */}
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-[#9FADBC] mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              <div className="w-full">
                <input
                  value={title}
                  onChange={e => { setTitle(e.target.value); setError('') }}
                  className="w-full bg-transparent border-none text-2xl sm:text-3xl font-bold text-white focus:bg-[#2C333A] focus:ring-2 focus:ring-[#579DFF] rounded-md px-2 py-1.5 outline-none transition-colors -ml-2"
                  placeholder="Título do cartão"
                />
                {error && <p className="text-red-400 text-xs mt-1 ml-2">{error}</p>}
              </div>
            </div>

            {/* Adicionar ao Cartão */}
            <div className="flex items-center gap-3 pl-10 flex-wrap">
              <button onClick={() => setRightPanelMode('properties')} className="flex items-center gap-2 px-3 py-1.5 bg-[#2C333A] hover:bg-[#3B444C] rounded-sm text-sm text-[#DEE4EA] font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Membros
              </button>
              <button onClick={() => setRightPanelMode('properties')} className="flex items-center gap-2 px-3 py-1.5 bg-[#2C333A] hover:bg-[#3B444C] rounded-sm text-sm text-[#DEE4EA] font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                Etiquetas
              </button>
              <button onClick={() => setRightPanelMode('timer')} className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${rightPanelMode === 'timer' ? 'bg-[#579DFF]/20 text-[#579DFF]' : 'bg-[#2C333A] hover:bg-[#3B444C] text-[#DEE4EA]'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Lançar Tempo
              </button>
            </div>

            {/* Descrição */}
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-[#9FADBC] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-white">Descrição</h3>
                    {hasUnsavedDescription && !isEditingDesc && (
                      <span className="text-xs font-semibold bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-md flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        Alterações não salvas
                      </span>
                    )}
                  </div>
                  {!isEditingDesc && (
                    <button onClick={() => setIsEditingDesc(true)} className="px-4 py-1.5 bg-[#2C333A] hover:bg-[#3B444C] rounded-sm text-sm font-medium text-[#DEE4EA] transition-colors">
                      Editar
                    </button>
                  )}
                </div>

                {isEditingDesc ? (
                  <div className="border border-[#579DFF] rounded-md overflow-hidden ring-1 ring-[#579DFF] bg-[#22272B] shadow-lg">
                    {/* Toolbar Avançada */}
                    <div className="flex items-center gap-1 border-b border-[#3B444C] p-1.5 bg-[#1D2125]">
                      <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors" title="Negrito"><span className="font-bold">B</span></button>
                      <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors" title="Itálico"><span className="italic">I</span></button>
                      <button type="button" onClick={() => insertMarkdown('~~', '~~')} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors" title="Riscado"><span className="line-through">S</span></button>
                      <div className="w-px h-5 bg-[#3B444C] mx-1 self-center"></div>
                      <button type="button" onClick={() => insertMarkdown('### ')} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors font-bold" title="Título">H</button>
                      <button type="button" onClick={() => insertMarkdown('- ')} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors" title="Lista">ul</button>
                      <div className="w-px h-5 bg-[#3B444C] mx-1 self-center"></div>
                      <button type="button" onClick={() => insertMarkdown('[', '](url)')} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors" title="Link">🔗</button>
                      <button type="button" onClick={() => insertMarkdown('`', '`')} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors" title="Código">{'< >'}</button>
                    </div>
                    <textarea
                      autoFocus
                      value={draftDescription}
                      onChange={e => setDraftDescription(e.target.value)}
                      placeholder="Adicione uma descrição mais detalhada..."
                      className="w-full bg-[#22272B] text-[#DEE4EA] p-4 outline-none min-h-[160px] resize-y text-sm font-sans"
                    />
                    <div className="flex items-center gap-3 p-3 bg-[#1D2125] border-t border-[#3B444C]">
                      <button onClick={handleSaveDescription} className="px-5 py-2 bg-[#579DFF] hover:bg-[#85B8FF] text-[#1D2125] font-semibold text-sm rounded-sm transition-colors">
                        Salvar Descrição
                      </button>
                      <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 hover:bg-[#3B444C] text-[#DEE4EA] text-sm font-medium rounded-sm transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-[70px] p-4 rounded-md cursor-pointer bg-[#2C333A]/50 hover:bg-[#2C333A] text-sm text-[#DEE4EA] transition-colors border border-transparent hover:border-[#3B444C]"
                  >
                    {draftDescription ? (
                      <div className="whitespace-pre-wrap">{draftDescription}</div>
                    ) : (
                      <span className="text-[#8C9BAB]">Adicione uma descrição mais detalhada...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Anexos */}
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-[#9FADBC] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <div className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Anexos</h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-1.5 bg-[#2C333A] hover:bg-[#3B444C] rounded-sm text-sm font-medium text-[#DEE4EA] transition-colors"
                  >
                    Adicionar
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.docx,.xlsx"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file && onAttachmentUpload) { onAttachmentUpload(file) }
                      e.target.value = ''
                    }}
                  />
                </div>

                {/* Imagens */}
                {(() => {
                  const imgs = attachments.filter(a => a.fileType.startsWith('image/'))
                  if (!imgs.length) return null
                  return (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-[#8C9BAB] uppercase tracking-wide mb-2">Imagens</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {imgs.map(att => (
                          <div key={att.id} className="relative group aspect-video bg-[#111214] rounded-md overflow-hidden border border-[#3B444C]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={att.filePath} alt={att.fileName} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {onAttachmentSetCover && (
                                <button onClick={() => onAttachmentSetCover(att.id)} title="Definir capa" className="p-1.5 bg-white/20 hover:bg-white/40 rounded-md text-white">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                              )}
                              {onAttachmentDelete && (
                                <button onClick={() => onAttachmentDelete(att.id)} title="Remover" className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-md text-white">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                            <p className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/50 px-1.5 py-0.5 truncate">{att.fileName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Documentos */}
                {(() => {
                  const docs = attachments.filter(a => !a.fileType.startsWith('image/'))
                  if (!docs.length) return null
                  return (
                    <div>
                      <p className="text-xs font-semibold text-[#8C9BAB] uppercase tracking-wide mb-2">Documentos</p>
                      <div className="space-y-2">
                        {docs.map(att => (
                          <div key={att.id} className="flex items-center gap-3 p-3 bg-[#2C333A]/50 hover:bg-[#2C333A] rounded-md group transition-colors border border-[#3B444C]">
                            <div className="w-10 h-10 bg-[#111214] rounded-md flex items-center justify-center shrink-0 border border-[#3B444C]">
                              <span className="text-[10px] font-bold text-[#9FADBC] uppercase">{att.fileType.split('/')[1]?.slice(0, 4) || 'DOC'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{att.fileName}</p>
                              <p className="text-xs text-[#8C9BAB]">{(att.fileSize / 1024).toFixed(0)} KB</p>
                            </div>
                            {onAttachmentDelete && (
                              <button onClick={() => onAttachmentDelete(att.id)} className="p-1.5 hover:bg-red-500/20 rounded-md text-[#9FADBC] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {attachments.length === 0 && (
                  <p className="text-sm text-[#8C9BAB] italic">Nenhum anexo ainda.</p>
                )}
              </div>
            </div>
            
            {/* Espaçamento extra no fim do scroll da esquerda */}
            <div className="h-8"></div>
          </div>

          {/* === COLUNA DIREITA (MODULAR E MAIS LARGA) === */}
          <div className="w-full md:w-96 shrink-0 bg-[#1D2125] flex flex-col border-l border-[#3B444C]">
            
            {/* Navegação da Sidebar */}
            <div className="flex p-2 border-b border-[#3B444C] gap-1 overflow-x-auto bg-[#161A1D] [&::-webkit-scrollbar]:hidden">
              <button 
                onClick={() => setRightPanelMode('comments')}
                className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-sm whitespace-nowrap transition-colors ${rightPanelMode === 'comments' ? 'bg-[#579DFF] text-[#1D2125] shadow-sm' : 'text-[#9FADBC] hover:bg-[#2C333A]'}`}
              >
                Atividade
              </button>
              <button 
                onClick={() => setRightPanelMode('timer')}
                className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-sm whitespace-nowrap transition-colors ${rightPanelMode === 'timer' ? 'bg-[#579DFF] text-[#1D2125] shadow-sm' : 'text-[#9FADBC] hover:bg-[#2C333A]'}`}
              >
                Tempo
              </button>
              <button
                onClick={() => setRightPanelMode('properties')}
                className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-sm whitespace-nowrap transition-colors ${rightPanelMode === 'properties' ? 'bg-[#579DFF] text-[#1D2125] shadow-sm' : 'text-[#9FADBC] hover:bg-[#2C333A]'}`}
              >
                Props
              </button>
              <button
                onClick={() => setRightPanelMode('movements')}
                className={`flex-1 px-3 py-2 text-[13px] font-semibold rounded-sm whitespace-nowrap transition-colors ${rightPanelMode === 'movements' ? 'bg-[#579DFF] text-[#1D2125] shadow-sm' : 'text-[#9FADBC] hover:bg-[#2C333A]'}`}
              >
                Movimentação
              </button>
            </div>

            {/* Conteúdo Dinâmico da Sidebar (Com scroll próprio) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3B444C] [&::-webkit-scrollbar-thumb]:rounded-full">
              
              {/* MODO 1: COMENTÁRIOS E ATIVIDADE */}
              {rightPanelMode === 'comments' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Input de Comentário */}
                  <div className={`w-full border rounded-md overflow-hidden transition-all bg-[#22272B] shadow-sm ${isCommenting ? 'border-[#579DFF] ring-1 ring-[#579DFF]' : 'border-[#738496]'}`}>
                    {isCommenting && (
                      <div className="flex items-center gap-1 border-b border-[#3B444C] p-1.5 bg-[#1D2125]">
                        <button className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC]"><span className="font-bold">B</span></button>
                        <button className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC]"><span className="italic">I</span></button>
                        <button className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC]">@</button>
                      </div>
                    )}
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onFocus={() => setIsCommenting(true)}
                      placeholder="Escreva um comentário..."
                      className={`w-full bg-transparent text-[#DEE4EA] p-3 outline-none resize-none font-sans text-sm ${isCommenting ? 'min-h-[100px]' : 'h-10 overflow-hidden'}`}
                    />
                    {isCommenting && (
                      <div className="p-2 bg-[#1D2125] border-t border-[#3B444C] flex justify-between items-center">
                        <button onClick={handleCommentSubmit} className="px-4 py-1.5 bg-[#579DFF] hover:bg-[#85B8FF] text-[#1D2125] font-semibold text-sm rounded-sm transition-colors">
                          Comentar
                        </button>
                        <button onClick={() => {setIsCommenting(false); setCommentText('')}} className="px-3 py-1.5 text-[#9FADBC] hover:text-white text-sm font-medium transition-colors">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lista de Comentários */}
                  <div className="space-y-6">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar name={comment.user.name} avatarUrl={comment.user.avatarUrl} size="sm" />
                        <div className="w-full">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-bold text-white text-sm">{comment.user.name}</span>
                            <span className="text-[11px] text-[#8C9BAB]">há pouco</span>
                          </div>
                          <div className="bg-[#2C333A] p-3 rounded-md text-sm text-[#DEE4EA] border border-[#3B444C]">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                  </div>
                </div>
              )}

              {/* MODO 2: TEMPO */}
              {rightPanelMode === 'timer' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  
                  {/* Cronômetro */}
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-3 tracking-wide">Rastreador Automático</h4>
                    {initialCard?.id && <CardTimer cardId={initialCard.id} />}
                  </div>

                  <hr className="border-[#3B444C]" />

                  {/* Lançamento Manual */}
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-4 tracking-wide">Lançamento Manual</h4>

                    <div className="flex gap-3 mb-4">
                      <div className="flex-1">
                        <label className="text-xs text-[#9FADBC] mb-1.5 block font-medium">Horas</label>
                        <input
                          type="number" min="0" placeholder="0"
                          value={manualHours} onChange={e => setManualHours(e.target.value)}
                          className="w-full bg-[#22272B] border border-[#738496] text-white rounded-sm px-3 py-2 outline-none focus:border-[#579DFF]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-[#9FADBC] mb-1.5 block font-medium">Minutos</label>
                        <input
                          type="number" min="0" max="59" placeholder="0"
                          value={manualMinutes} onChange={e => setManualMinutes(e.target.value)}
                          className="w-full bg-[#22272B] border border-[#738496] text-white rounded-sm px-3 py-2 outline-none focus:border-[#579DFF]"
                        />
                      </div>
                    </div>

                    <div className="mb-5">
                      <label className="text-xs text-[#9FADBC] mb-1.5 block font-medium">
                        Motivo <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        rows={2} placeholder="O que foi feito?"
                        value={manualDesc} onChange={e => setManualDesc(e.target.value)}
                        className={`w-full bg-[#22272B] border text-white rounded-sm px-3 py-2 outline-none focus:border-[#579DFF] resize-none text-sm ${!manualDesc.trim() && (manualHours || manualMinutes) ? 'border-red-500/60' : 'border-[#738496]'}`}
                      />
                      {!manualDesc.trim() && (manualHours || manualMinutes) && (
                        <p className="text-xs text-red-400 mt-1">Motivo é obrigatório para lançamento manual.</p>
                      )}
                    </div>

                    <button
                      onClick={handleRegisterTime}
                      disabled={!manualDesc.trim() || (parseInt(manualHours || '0') === 0 && parseInt(manualMinutes || '0') === 0)}
                      className="w-full py-2 bg-[#2C333A] hover:bg-[#3B444C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-sm transition-colors border border-[#738496]/50"
                    >
                      Registrar Tempo
                    </button>
                  </div>

                  <hr className="border-[#3B444C]" />

                  {/* Histórico de Tempo */}
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-3 tracking-wide">Histórico</h4>
                    {timeEntries.length === 0 ? (
                      <p className="text-sm text-[#8C9BAB] italic">Nenhum registro ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {timeEntries.map(entry => (
                          <div key={entry.id} className="bg-[#22272B] rounded-md border border-[#3B444C] overflow-hidden">
                            {editingEntryId === entry.id ? (
                              <div className="p-3 space-y-2">
                                <div className="flex gap-2">
                                  <input type="number" min="0" value={editHours} onChange={e => setEditHours(e.target.value)} placeholder="h" className="w-1/2 bg-[#1D2125] border border-[#738496] text-white rounded-sm px-2 py-1.5 text-sm outline-none focus:border-[#579DFF]" />
                                  <input type="number" min="0" max="59" value={editMinutes} onChange={e => setEditMinutes(e.target.value)} placeholder="m" className="w-1/2 bg-[#1D2125] border border-[#738496] text-white rounded-sm px-2 py-1.5 text-sm outline-none focus:border-[#579DFF]" />
                                </div>
                                <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição" className="w-full bg-[#1D2125] border border-[#738496] text-white rounded-sm px-2 py-1.5 text-sm outline-none focus:border-[#579DFF]" />
                                <div className="flex gap-2">
                                  <button onClick={handleSaveEditEntry} className="flex-1 py-1.5 bg-[#579DFF] hover:bg-[#85B8FF] text-[#1D2125] text-xs font-bold rounded-sm transition-colors">Salvar</button>
                                  <button onClick={() => setEditingEntryId(null)} className="flex-1 py-1.5 bg-[#3B444C] hover:bg-[#4B5563] text-white text-xs font-bold rounded-sm transition-colors">Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-3 group">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white">{formatDuration(entry.duration)}</span>
                                    {entry.isManual && <span className="text-[10px] bg-[#3B444C] text-[#9FADBC] px-1.5 py-0.5 rounded font-medium">Manual</span>}
                                    {entry.isRunning && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">Ativo</span>}
                                  </div>
                                  {entry.description && <p className="text-xs text-[#9FADBC] mt-0.5 truncate">{entry.description}</p>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleStartEditEntry(entry)} className="p-1.5 hover:bg-[#3B444C] rounded text-[#9FADBC] hover:text-white transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 hover:bg-red-500/20 rounded text-[#9FADBC] hover:text-red-400 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODO 4: MOVIMENTAÇÃO */}
              {rightPanelMode === 'movements' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase tracking-wide">Histórico de Movimentação</h4>
                  {movements.length === 0 ? (
                    <p className="text-sm text-[#8C9BAB] italic">Nenhuma movimentação registrada.</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#3B444C]" />
                      <div className="space-y-4 pl-8">
                        {movements.map((mov, i) => {
                          const isBackward = !!mov.reason
                          return (
                            <div key={mov.id} className="relative">
                              <div className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${isBackward ? 'bg-amber-500 border-amber-400' : 'bg-[#579DFF] border-[#579DFF]'}`} />
                              <div className={`rounded-md p-3 border ${isBackward ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#22272B] border-[#3B444C]'}`}>
                                <div className="flex items-center gap-1.5 flex-wrap text-sm font-medium text-white mb-1">
                                  <span className="text-[#9FADBC] text-xs">{mov.fromColumnTitle ?? 'Backlog'}</span>
                                  <svg className="w-3 h-3 text-[#579DFF] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  <span className="text-xs">{mov.toColumnTitle ?? 'Backlog'}</span>
                                  {i === movements.length - 1 && (
                                    <span className="text-[10px] bg-[#579DFF]/20 text-[#579DFF] px-1.5 py-0.5 rounded font-semibold ml-auto">Atual</span>
                                  )}
                                </div>
                                {mov.reason && (
                                  <div className="flex items-start gap-1.5 mt-1.5">
                                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <p className="text-xs text-amber-300">{mov.reason}</p>
                                  </div>
                                )}
                                <p className="text-[10px] text-[#8C9BAB] mt-1.5">
                                  {new Date(mov.movedAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODO 3: PROPRIEDADES */}
              {rightPanelMode === 'properties' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-3 tracking-wide">Prioridade</h4>
                    <select
                      aria-label="Prioridade"
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                      className="w-full bg-[#22272B] border border-[#3B444C] text-white rounded-sm text-sm py-2 px-3 outline-none focus:border-[#579DFF]"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-3 tracking-wide">Cor de Destaque</h4>
                    <div className="bg-[#22272B] p-3 rounded-md border border-[#3B444C]">
                      <ColorPicker value={color} onChange={setColor} />
                    </div>
                  </div>

                  {boardTags && boardTags.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-3 tracking-wide">Etiquetas</h4>
                      <TagSelector tags={boardTags} selectedTagIds={selectedTagIds} onToggle={handleTagToggle} />
                    </div>
                  )}

                  {isEditing && users && users.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-3 tracking-wide">Responsáveis</h4>
                      <div className="bg-[#22272B] p-2 rounded-md border border-[#3B444C]">
                        <MultiUserSelector cardId={initialCard.id} users={users} />
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}