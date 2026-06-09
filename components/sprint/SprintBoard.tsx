'use client'

import { useState, useEffect, useRef } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import SprintHeader from './SprintHeader'
import ColumnComponent from '@/components/board/Column'
import CardComponent from '@/components/card/Card'
import CardModal from '@/components/card/CardModal'
import { Column as ColumnType, Card as CardType, CardColor } from '@/types/kanban'
import {
  moveCardInSprintAction,
  addSprintColumnAction,
  renameSprintColumnAction,
  deleteSprintColumnAction,
  reorderSprintColumnsAction,
  createCardInSprintAction,
  updateCardInSprintAction,
  deleteCardInSprintAction,
  getProjectBacklogAction,
  moveCardToSprintAction,
  moveCardToBacklogAction,
  createBacklogCardAction,
} from '@/app/actions/sprintBoard'
import { createCommentAction, getCommentsAction } from '@/app/actions/comentarios'
import { deleteAttachmentAction, setCoverAction } from '@/app/actions/attachments'

interface SprintCard {
  id: string
  title: string
  description: string
  color: string
  priority?: string | null
  sprintPosition?: number | null
  tags?: { tagId: string; tag: { id?: string; name: string; color: string } }[]
  attachments?: { id: string; fileName: string; fileType: string; filePath: string; fileSize: number; isCover?: boolean; uploadedAt: string | Date }[]
  timeEntries?: { duration: number }[]
  responsibles?: { user: { id: string; name: string; avatarUrl: string | null } }[]
}

interface SprintColumnData {
  id: string
  title: string
  position: number
  cards: SprintCard[]
}

interface Sprint {
  id: string
  name: string
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  startDate: Date | string | null
  endDate: Date | string | null
  description?: string | null
  qualidade?: number | null
  dificuldade?: number | null
}

interface SprintBoardProps {
  sprint: Sprint
  columns: SprintColumnData[]
  backlogCards?: SprintCard[]
  users?: { id: string; name: string; email: string; avatarUrl?: string | null }[]
  tags?: { id: string; name: string; color: string }[]
  currentUser?: { id: string; name: string; email: string; avatarUrl?: string | null } | null
  initialCardId?: string | null
  projectId?: string | null
}

function toColumnType(col: SprintColumnData): ColumnType {
  return { id: col.id, title: col.title, cardIds: col.cards.map(c => c.id) }
}

function toCardType(card: SprintCard, sprintId: string): CardType {
  return {
    id: card.id,
    title: card.title,
    description: card.description ?? '',
    color: (card.color ?? '#6b7280') as CardColor,
    priority: card.priority ?? 'media',
    sprintId,
    tags: card.tags?.map(ct => ({
      tagId: ct.tagId,
      tag: { id: ct.tag.id ?? ct.tagId, name: ct.tag.name, color: ct.tag.color },
    })),
    attachments: card.attachments?.map(a => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType,
      filePath: a.filePath,
      fileSize: a.fileSize,
      isCover: a.isCover ?? false,
      uploadedAt: typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt instanceof Date ? a.uploadedAt.getTime() : Date.now(),
    })) ?? [],
    responsibles: card.responsibles ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export default function SprintBoard({ sprint, columns: initialColumns, backlogCards: initialBacklogCards, users, tags, currentUser, initialCardId, projectId }: SprintBoardProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [newColTitle, setNewColTitle] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [openCardId, setOpenCardId] = useState<string | null>(initialCardId ?? null)
  const [cardComments, setCardComments] = useState<{ id: string; user: { id: string; name: string; avatarUrl: string | null }; content: string; createdAt: Date }[]>([])
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null)
  const [boardBg, setBoardBg] = useState('bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900')
  const [backlogCards, setBacklogCards] = useState<SprintCard[]>(initialBacklogCards ?? [])
  const [addingBacklogCard, setAddingBacklogCard] = useState(false)
  const [newBacklogTitle, setNewBacklogTitle] = useState('')
  const [pendingMove, setPendingMove] = useState<{
    cardId: string
    srcColumnId: string
    srcColumnIndex: number
    dstColumnId: string
    dstColumnIndex: number
    reason: string
  } | null>(null)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const isImageBg = boardBg.startsWith('url')

  useEffect(() => {
    if (!openCardId) return
    getCommentsAction(openCardId).then(res => {
      if (res.comments) setCardComments(res.comments)
    })
    return () => { setCardComments([]) }
  }, [openCardId])

  useEffect(() => {
    if (!projectId || initialBacklogCards) return
    getProjectBacklogAction(projectId).then(result => {
      if (Array.isArray(result)) setBacklogCards(result as SprintCard[])
    })
  }, [projectId, initialBacklogCards])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return 
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('.drag-handle')) return

    setIsDragging(true)
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0))
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0)
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  async function handleAddBacklogCard() {
    if (!newBacklogTitle.trim() || !projectId) return
    const result = await createBacklogCardAction(projectId, newBacklogTitle.trim())
    if ('card' in result && result.card) {
      const c = result.card
      setBacklogCards(prev => [...prev, { id: c.id, title: c.title, description: c.description ?? '', color: c.color, tags: [], attachments: [], timeEntries: [] }])
    }
    setNewBacklogTitle('')
    setAddingBacklogCard(false)
  }

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId, type } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    if (type === 'COLUMN') {
      const newOrder = [...columns]
      const [moved] = newOrder.splice(source.index, 1)
      newOrder.splice(destination.index, 0, moved)
      setColumns(newOrder)
      await reorderSprintColumnsAction(sprint.id, newOrder.map(c => c.id))
      return
    }

    // Backlog → coluna da sprint
    if (source.droppableId === 'BACKLOG' && destination.droppableId !== 'BACKLOG') {
      const card = backlogCards[source.index]
      if (!card) return
      const newBacklog = [...backlogCards]
      newBacklog.splice(source.index, 1)
      setBacklogCards(newBacklog)
      setColumns(cols => cols.map(col =>
        col.id === destination.droppableId
          ? { ...col, cards: [...col.cards.slice(0, destination.index), card, ...col.cards.slice(destination.index)] }
          : col
      ))
      await moveCardToSprintAction(draggableId, sprint.id, destination.droppableId, destination.index)
      return
    }

    // Coluna da sprint → Backlog
    if (source.droppableId !== 'BACKLOG' && destination.droppableId === 'BACKLOG') {
      const srcCol = columns.find(c => c.id === source.droppableId)
      if (!srcCol) return
      const card = srcCol.cards[source.index]
      setColumns(cols => cols.map(col =>
        col.id === source.droppableId
          ? { ...col, cards: col.cards.filter((_, i) => i !== source.index) }
          : col
      ))
      setBacklogCards(prev => [...prev.slice(0, destination.index), card, ...prev.slice(destination.index)])
      await moveCardToBacklogAction(draggableId)
      return
    }

    // Column → Column
    const srcColMeta = columns.find(c => c.id === source.droppableId)
    const dstColMeta = columns.find(c => c.id === destination.droppableId)
    if (!srcColMeta || !dstColMeta) return

    if (dstColMeta.position < srcColMeta.position) {
      setPendingMove({
        cardId: draggableId,
        srcColumnId: source.droppableId,
        srcColumnIndex: source.index,
        dstColumnId: destination.droppableId,
        dstColumnIndex: destination.index,
        reason: '',
      })
      return
    }

    const newColumns = columns.map(col => ({ ...col, cards: [...col.cards] }))
    const srcCol = newColumns.find(c => c.id === source.droppableId)
    const dstCol = newColumns.find(c => c.id === destination.droppableId)
    if (!srcCol || !dstCol) return

    const [movedCard] = srcCol.cards.splice(source.index, 1)
    dstCol.cards.splice(destination.index, 0, movedCard)
    setColumns(newColumns)

    await moveCardInSprintAction(draggableId, destination.droppableId, destination.index)
  }

  async function confirmPendingMove() {
    if (!pendingMove || !pendingMove.reason.trim()) return
    const newColumns = columns.map(col => ({ ...col, cards: [...col.cards] }))
    const srcCol = newColumns.find(c => c.id === pendingMove.srcColumnId)
    const dstCol = newColumns.find(c => c.id === pendingMove.dstColumnId)
    if (!srcCol || !dstCol) { setPendingMove(null); return }
    const [movedCard] = srcCol.cards.splice(pendingMove.srcColumnIndex, 1)
    dstCol.cards.splice(pendingMove.dstColumnIndex, 0, movedCard)
    setColumns(newColumns)
    await moveCardInSprintAction(pendingMove.cardId, pendingMove.dstColumnId, pendingMove.dstColumnIndex, pendingMove.reason)
    setPendingMove(null)
  }

  async function handleAddColumn() {
    if (!newColTitle.trim()) return
    const result = await addSprintColumnAction(sprint.id, newColTitle.trim())
    if ('column' in result && result.column) {
      setColumns(cols => [...cols, { ...result.column, cards: [] }])
      setNewColTitle('')
      setAddingCol(false)
    }
  }

  async function handleRenameColumn(columnId: string, title: string) {
    setColumns(cols => cols.map(c => c.id === columnId ? { ...c, title } : c))
    await renameSprintColumnAction(sprint.id, columnId, title)
  }

  async function handleDeleteColumn(columnId: string) {
    setColumns(cols => cols.filter(c => c.id !== columnId))
    await deleteSprintColumnAction(sprint.id, columnId)
  }

  async function handleAddCard(columnId: string, data: { title: string; description: string; color: CardColor; priority?: string }) {
    const result = await createCardInSprintAction({
      sprintId: sprint.id,
      sprintColumnId: columnId,
      title: data.title,
      description: data.description,
      color: data.color,
      priority: data.priority,
    })
    if ('card' in result && result.card) {
      const newCard: SprintCard = {
        id: result.card.id,
        title: result.card.title,
        description: result.card.description,
        color: result.card.color,
        tags: [],
        attachments: [],
        timeEntries: [],
      }
      setColumns(cols => cols.map(col =>
        col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
      ))
    }
  }

  async function handleUpdateCard(
    cardId: string,
    data: { title: string; description: string; color: CardColor; priority?: string },
  ) {
    setColumns(cols => cols.map(col => ({
      ...col,
      cards: col.cards.map(c => c.id === cardId ? { ...c, ...data } : c),
    })))
    await updateCardInSprintAction(sprint.id, cardId, {
      title: data.title,
      description: data.description,
      color: data.color,
      priority: data.priority,
    })
  }

  async function handleUpdateBacklogCard(
    cardId: string,
    data: { title: string; description: string; color: CardColor; priority?: string },
  ) {
    setBacklogCards(prev => prev.map(c => c.id === cardId ? { ...c, ...data } : c))
    await updateCardInSprintAction(sprint.id, cardId, data)
  }

  async function handleDeleteBacklogCard(cardId: string) {
    setBacklogCards(prev => prev.filter(c => c.id !== cardId))
    await deleteCardInSprintAction(sprint.id, cardId)
  }

  async function handleDeleteCard(cardId: string) {
    setColumns(cols => cols.map(col => ({
      ...col,
      cards: col.cards.filter(c => c.id !== cardId),
    })))
    await deleteCardInSprintAction(sprint.id, cardId)
  }

  return (
    <div 
      className={`h-[calc(100vh-64px)] w-full flex flex-col overflow-hidden bg-cover bg-center bg-fixed transition-all duration-700 selection:bg-blue-500/30 ${!isImageBg ? boardBg : ''}`}
      style={isImageBg ? { backgroundImage: boardBg } : {}}
    >
      <SprintHeader 
        sprint={sprint} 
        currentUser={currentUser} 
        tags={tags}
        onChangeBackground={setBoardBg} 
      />

      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={`flex-1 overflow-x-auto overflow-y-hidden cursor-default ${isDragging ? 'cursor-grabbing select-none' : ''}
          [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-black/10 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30`}
      >
        <div className="h-full inline-flex items-start p-6 space-x-4">
          <DragDropContext onDragEnd={handleDragEnd}>

            {/* Coluna virtual de Backlog — global por projeto, mesmo design das outras colunas */}
            {projectId && (
              <div className="flex flex-col w-72 sm:w-80 max-h-full shrink-0 bg-gray-100/90 backdrop-blur-sm rounded-2xl shadow-sm border border-black/5 overflow-hidden">

                {/* Header — igual ao ColumnHeader mas sem rename/delete */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-gray-800 text-sm tracking-tight">Backlog</span>
                    <span className="bg-gray-200/50 text-gray-600 text-[10px] font-bold rounded-md px-1.5 py-0.5 min-w-[20px] text-center border border-black/5">
                      {backlogCards.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <Droppable droppableId="BACKLOG" type="CARD">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`px-2 pb-2 flex flex-col gap-2 overflow-y-auto min-h-0
                        [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/20
                        ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                    >
                      {backlogCards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-300 rounded-xl text-xs text-gray-400 mx-2 mt-2 shrink-0">
                          Arraste cards aqui
                        </div>
                      )}
                      {backlogCards.map((card, index) => (
                        <div key={card.id} className="shrink-0">
                          <CardComponent
                            card={toCardType(card, sprint.id)}
                            index={index}
                            columnId="BACKLOG"
                            onUpdate={handleUpdateBacklogCard}
                            onDelete={handleDeleteBacklogCard}
                            users={users}
                            boardTags={tags}
                            onClick={() => setOpenCardId(card.id)}
                          />
                        </div>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Footer — igual ao das outras colunas */}
                <div className="p-2 border-t border-black/5 bg-gray-100 rounded-b-2xl shrink-0">
                  {addingBacklogCard ? (
                    <div className="px-1 space-y-2">
                      <input
                        autoFocus
                        value={newBacklogTitle}
                        onChange={e => setNewBacklogTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddBacklogCard()
                          if (e.key === 'Escape') { setAddingBacklogCard(false); setNewBacklogTitle('') }
                        }}
                        placeholder="Título do card..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddBacklogCard} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-all">Criar</button>
                        <button onClick={() => { setAddingBacklogCard(false); setNewBacklogTitle('') }} className="px-3 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingBacklogCard(true)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-white rounded-xl transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Adicionar card
                    </button>
                  )}
                </div>
              </div>
            )}

            <Droppable droppableId="sprint-columns" direction="horizontal" type="COLUMN">
                {provided => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex h-full items-start space-x-4"
                  >
                    {columns.map((col, index) => (
                      <div key={col.id} className="h-full">
                        <ColumnComponent
                          column={toColumnType(col)}
                          cards={col.cards.map(c => toCardType(c, sprint.id))}
                          index={index}
                          onRenameColumn={handleRenameColumn}
                          onDeleteColumn={handleDeleteColumn}
                          onAddCard={(colId) => setAddingCardToColumn(colId)}
                          onUpdateCard={handleUpdateCard}
                          onDeleteCard={handleDeleteCard}
                          users={users}
                          boardTags={tags}
                          onCardClick={(cardId) => setOpenCardId(cardId)}
                        />
                      </div>
                    ))}
                    {provided.placeholder}

                    <div className="w-72 shrink-0 h-full">
                      {addingCol ? (
                        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-300">
                          <input
                            autoFocus
                            value={newColTitle}
                            onChange={e => setNewColTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddColumn()
                              if (e.key === 'Escape') setAddingCol(false)
                            }}
                            placeholder="Título da coluna..."
                            className="w-full px-4 py-2.5 bg-gray-100/50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all mb-3"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddColumn}
                              className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                            >
                              Criar Coluna
                            </button>
                            <button
                              onClick={() => setAddingCol(false)}
                              className="px-3 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingCol(true)}
                          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl text-sm text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] group"
                        >
                          <div className="bg-white/20 p-1 rounded-md group-hover:bg-blue-500 transition-colors">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                          </div>
                          Nova Coluna
                        </button>
                      )}
                    </div>

                    <div className="w-8 shrink-0 invisible" />
                  </div>
                )}
              </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* MODAL DO CARD - TOTALMENTE INTEGRADO */}
      {(() => {
        if (!openCardId) return null
        
        // Encontra a coluna atual para passar o nome como referência (caso você adicione no modal no futuro)
        const currentColumn = columns.find(col => col.cards.some(c => c.id === openCardId))
        const openCardRaw = currentColumn?.cards.find(c => c.id === openCardId)
        
        if (!openCardRaw) return null
        
        const openCardType = toCardType(openCardRaw, sprint.id)

        return (
          <CardModal
            isOpen
            onClose={() => setOpenCardId(null)}
            onSubmit={data => handleUpdateCard(openCardId, data)}
            initialCard={openCardType}
            users={users}
            boardTags={tags}
            
            // Repassando os anexos (o componente CardModal já mapeia eles)
            attachments={openCardType.attachments}
            
            onAttachmentUpload={async (file) => {
              if (!openCardId) return
              const form = new FormData()
              form.append('cardId', openCardId)
              form.append('file', file)
              const res = await fetch('/api/uploads', { method: 'POST', body: form })
              if (res.ok) {
                const att = await res.json()
                setColumns(prev => prev.map(col => ({
                  ...col,
                  cards: col.cards.map(c =>
                    c.id === openCardId
                      ? { ...c, attachments: [...(c.attachments ?? []), att] }
                      : c
                  ),
                })))
              }
            }}
            onAttachmentDelete={async (attachmentId) => {
              await deleteAttachmentAction(attachmentId)
              setColumns(prev => prev.map(col => ({
                ...col,
                cards: col.cards.map(c =>
                  c.id === openCardId
                    ? { ...c, attachments: (c.attachments ?? []).filter(a => a.id !== attachmentId) }
                    : c
                ),
              })))
            }}
            onAttachmentSetCover={async (attachmentId) => {
              if (!openCardId) return
              await setCoverAction(openCardId, attachmentId)
              setColumns(prev => prev.map(col => ({
                ...col,
                cards: col.cards.map(c =>
                  c.id === openCardId
                    ? { ...c, attachments: (c.attachments ?? []).map(a => ({ ...a, isCover: a.id === attachmentId })) }
                    : c
                ),
              })))
            }}
            onAddComment={async (content) => {
              if (!openCardId) return
              const res = await createCommentAction(openCardId, content)
              if (res.comment) setCardComments(prev => [...prev, res.comment!])
            }}
            comments={cardComments.map(c => ({
              id: c.id,
              user: { id: c.user.id, name: c.user.name, email: '', avatarUrl: c.user.avatarUrl },
              content: c.content,
              createdAt: new Date(c.createdAt),
            }))}
          />
        )
      })()}

      <CardModal
        isOpen={!!addingCardToColumn}
        onClose={() => setAddingCardToColumn(null)}
        onSubmit={async (data) => {
          if (addingCardToColumn) {
            await handleAddCard(addingCardToColumn, data)
            setAddingCardToColumn(null)
          }
        }}
        users={users}
        boardTags={tags}
      />

      {/* Diálogo de motivo para movimentação retroativa */}
      {pendingMove && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-900 mb-1">Motivo da movimentação</h3>
            <p className="text-sm text-gray-500 mb-4">
              Por que este card está voltando para uma etapa anterior?
            </p>
            <textarea
              autoFocus
              value={pendingMove.reason}
              onChange={e => setPendingMove(prev => prev ? { ...prev, reason: e.target.value } : null)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && pendingMove.reason.trim()) { e.preventDefault(); confirmPendingMove() }
                if (e.key === 'Escape') setPendingMove(null)
              }}
              placeholder="Ex: Bug encontrado em produção, cliente solicitou revisão..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingMove(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPendingMove}
                disabled={!pendingMove.reason.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}