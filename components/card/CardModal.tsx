'use client'

import { useState, useEffect, startTransition } from 'react'
import { Card, CardColor, Attachment } from '@/types/kanban'
import { assignTagToCardAction, removeTagFromCardAction } from '@/app/actions/tags'
import { addManualTimeAction } from '@/app/actions/time'
import CardTimer from './CardTimer'
import UserAvatar from '@/components/user/UserAvatar'
import ColorPicker from './ColorPicker'
import { TagSelector } from '../tag/TagSelector'
import MultiUserSelector from './MultiUserSelector'

// --- Interfaces ---
interface User { id: string; name: string; email: string; avatarUrl?: string | null }
interface Tag { id: string; name: string; color: string }
interface Comment { id: string; user: User; content: string; createdAt: Date }

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
type RightPanelMode = 'comments' | 'timer' | 'properties'

export default function CardModal({
  isOpen, onClose, onSubmit, initialCard, users, boardTags, attachments = [],
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

  // Estados para Registro Manual de Tempo
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')
  const [manualDesc, setManualDesc] = useState('')

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
      })
      document.body.style.overflow = 'hidden'
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
    if (!initialCard?.id) return
    await addManualTimeAction(initialCard.id, h, m, manualDesc || undefined)
    setManualHours('')
    setManualMinutes('')
    setManualDesc('')
  }

  // Função helper para a toolbar de markdown
  const insertMarkdown = (prefix: string, suffix = '') => {
    setDraftDescription(prev => prev + `${prefix}texto${suffix}`)
  }

  const hasUnsavedDescription = draftDescription !== savedDescription

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="absolute inset-0" onClick={handleCloseModal} aria-hidden="true" />

      {/* Container Principal do Modal */}
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#22272B] text-[#B6C2CF] rounded-xl shadow-2xl font-sans flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
        
        <button 
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
                  <button className="px-4 py-1.5 bg-[#2C333A] hover:bg-[#3B444C] rounded-sm text-sm font-medium text-[#DEE4EA] transition-colors">
                    Adicionar
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map(att => {
                    const isImg = att.fileType.startsWith('image/')
                    return (
                      <div key={att.id} className="flex h-24 bg-[#2C333A]/50 hover:bg-[#2C333A] rounded-md overflow-hidden cursor-pointer group transition-colors border border-[#3B444C]">
                        <div className="w-32 bg-[#111214] flex items-center justify-center shrink-0 border-r border-[#3B444C]">
                          {isImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={att.filePath} alt={att.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[#9FADBC] uppercase">{att.fileType.split('/')[1] || 'DOC'}</span>
                          )}
                        </div>
                        <div className="p-3 flex flex-col justify-between w-full min-w-0">
                          <p className="text-sm font-bold text-white truncate">{att.fileName}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#8C9BAB]">Recente</span>
                            <button className="p-1 hover:bg-[#3B444C] rounded-sm text-[#9FADBC] opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
                      <label className="text-xs text-[#9FADBC] mb-1.5 block font-medium">Descrição (Opcional)</label>
                      <textarea 
                        rows={2} placeholder="O que foi feito?" 
                        value={manualDesc} onChange={e => setManualDesc(e.target.value)}
                        className="w-full bg-[#22272B] border border-[#738496] text-white rounded-sm px-3 py-2 outline-none focus:border-[#579DFF] resize-none text-sm" 
                      />
                    </div>

                    <button onClick={handleRegisterTime} className="w-full py-2 bg-[#2C333A] hover:bg-[#3B444C] text-white font-semibold text-sm rounded-sm transition-colors border border-[#738496]/50">
                      Registrar Tempo
                    </button>
                  </div>
                </div>
              )}

              {/* MODO 3: PROPRIEDADES */}
              {rightPanelMode === 'properties' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h4 className="text-[11px] font-bold text-[#8C9BAB] uppercase mb-3 tracking-wide">Prioridade</h4>
                    <select
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