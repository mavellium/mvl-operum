'use client'

import { useState, useEffect, useRef } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Card as CardType, CardColor } from '@/types/kanban'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { TagBadge } from '@/components/tag/TagBadge'
import UserAvatar from '@/components/user/UserAvatar'
import { startTimerAction, pauseTimerAction, getCardTimeAction, getActiveTimerAction } from '@/app/actions/time'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}

interface Tag {
  id: string
  name: string
  color: string
}

interface CardProps {
  card: CardType
  index: number
  columnId: string
  onUpdate: (cardId: string, data: { title: string; description: string; color: CardColor }) => void
  onDelete: (cardId: string, columnId: string) => void
  users?: User[]
  boardTags?: Tag[]
  onClick: () => void
  /** Disparado quando o timer é iniciado a partir do card fechado. */
  onTimerStarted?: (cardId: string) => void
}

function formatTempo(min?: number | null): string {
  if (min == null || min <= 0) return ''
  const horas = (min / 60).toFixed(1).replace('.0', '')
  return `${horas}h`
}

function formatCardTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function Card({ card, index, columnId, onDelete, onClick, onTimerStarted }: CardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<Date | null>(null)
  const baseSecondsRef = useRef(0)
  const activeEntryIdRef = useRef<string | null>(null)

  const hasDescription = !!card.description?.trim()
  const hasAttachments = card.attachments && card.attachments.length > 0
  const cover = card.attachments?.find(a => a.isCover)

  const orcadoMin = card.orcado_min ?? null
  const realizadoMin = card.realizado_min ?? null
  const isOverrun = orcadoMin != null && realizadoMin != null && realizadoMin > orcadoMin
  const hasTempoData = orcadoMin != null || realizadoMin != null

  // Carrega o estado real do timer (mesma fonte de verdade do CardTimer no modal).
  useEffect(() => {
    let cancelled = false
    Promise.all([getCardTimeAction(card.id), getActiveTimerAction(card.id)])
      .then(([timeResult, activeResult]) => {
        if (cancelled) return
        const total = ('seconds' in timeResult ? timeResult.seconds : 0) ?? 0
        const active = 'entry' in activeResult ? activeResult.entry : null
        if (active?.isRunning) {
          const sinceStart = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)
          baseSecondsRef.current = total - (active.duration ?? 0)
          startedAtRef.current = new Date(active.startedAt)
          activeEntryIdRef.current = active.id
          setElapsedSeconds(baseSecondsRef.current + sinceStart)
          setIsTimerRunning(true)
        } else {
          baseSecondsRef.current = total
          activeEntryIdRef.current = null
          setElapsedSeconds(total)
          setIsTimerRunning(false)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [card.id])

  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        const sinceStart = startedAtRef.current
          ? Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000)
          : 0
        setElapsedSeconds(baseSecondsRef.current + sinceStart)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isTimerRunning])

  const handleTimerClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isTimerRunning) {
      const entryId = activeEntryIdRef.current
      if (!entryId) return
      setIsTimerRunning(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      await pauseTimerAction(entryId)
      activeEntryIdRef.current = null
      const res = await getCardTimeAction(card.id)
      if ('seconds' in res && res.seconds != null) {
        baseSecondsRef.current = res.seconds
        setElapsedSeconds(res.seconds)
      }
    } else {
      const result = await startTimerAction(card.id)
      if ('entry' in result && result.entry) {
        activeEntryIdRef.current = (result.entry as { id: string }).id
        baseSecondsRef.current = elapsedSeconds
        startedAtRef.current = new Date()
        setIsTimerRunning(true)
        onTimerStarted?.(card.id)
      }
    }
  }

  return (
    <>
      <Draggable draggableId={card.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`group bg-white rounded-xl shadow-sm border border-gray-200/75 overflow-hidden cursor-pointer transition-all duration-200 flex flex-col drag-handle
              ${isOverrun ? 'border-l-red-500' : ''}
              ${snapshot.isDragging ? 'shadow-2xl rotate-2 ring-2 ring-blue-400 scale-105 z-50' : 'hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 active:scale-[0.98]'}`}
            style={{
              ...provided.draggableProps.style,
              borderLeftWidth: cover ? '0' : '4px',
              borderLeftColor: isOverrun ? '#ef4444' : card.color,
              borderTopWidth: cover ? '4px' : '0',
              borderTopColor: cover ? card.color : 'transparent',
            }}
            onClick={onClick}
          >
            {/* Flag vermelha de estouro */}
            {isOverrun && (
              <div data-testid="card-overrun-flag" className="absolute top-2 right-2 z-10 text-red-500 text-sm" title="Tempo realizado excede o planejado">
                ⚑
              </div>
            )}

            {/* Capa */}
            {cover && (
              <div className="w-full h-32 overflow-hidden border-b border-gray-100 bg-gray-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${cover.id}/image`} alt="Capa" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            )}

            <div className="p-3.5 flex-1 flex flex-col">

              {/* Tags */}
              {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {card.tags.map(ct => (
                    <TagBadge key={ct.tagId} name={ct.tag.name} color={ct.tag.color} className="text-[10px] px-2 py-0.5" />
                  ))}
                </div>
              )}

              {/* Título + botões de ação (prioridade + lixeira) */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[14px] font-bold text-gray-800 leading-snug flex-1 break-words">
                  {card.title}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-1 -mr-1">
                  {/* Prioridade (à esquerda da lixeira) */}
                  {card.priority && (
                    <div className="flex items-center gap-1 px-1.5 py-1 rounded-md">
                      <div className={`w-2 h-2 rounded-full ${
                        card.priority === 'alta' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' :
                        card.priority === 'media' ? 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]' :
                        'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'
                      }`} />
                      <span className="text-[11px] font-bold text-gray-600 capitalize tracking-wide">
                        {card.priority}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmOpen(true) }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Excluir card"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Descrição truncada */}
              {hasDescription && (
                <p
                  data-testid="card-description"
                  title={card.description}
                  className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed"
                >
                  {card.description}
                </p>
              )}

              <div className="flex-1" />

              {/* Rodapé */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 gap-2">

                {/* Esquerda: ícones + timer */}
                <div className="flex items-center gap-3.5 text-gray-500">
                  {hasAttachments && (
                    <div className="flex items-center gap-1 text-xs font-semibold" title="Anexos">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {card.attachments?.length}
                    </div>
                  )}

                  {/* Timer */}
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-md transition-colors ${isTimerRunning ? 'bg-green-50' : 'hover:bg-gray-100'}`}
                    onClick={handleTimerClick}
                    title={isTimerRunning ? 'Pausar tempo' : 'Iniciar tempo'}
                  >
                    {isTimerRunning ? (
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm hover:bg-red-200 transition-colors">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-green-100 hover:text-green-600 transition-colors shadow-sm">
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                    <span className={`text-xs font-mono font-bold tracking-tight mt-px ${isTimerRunning ? 'text-green-700' : 'text-gray-600'}`}>{formatCardTimer(elapsedSeconds)}</span>
                  </div>
                </div>

                {/* Direita: tempo planejado/realizado + avatares */}
                <div className="flex items-center gap-2.5">

                  {/* Tempo */}
                  {hasTempoData && (
                    <div
                      data-testid="card-tempo-row"
                      title="Tempo planejado / realizado"
                      className={`flex items-center gap-1 text-[11px] font-mono font-bold ${isOverrun ? 'text-red-500' : 'text-gray-500'}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>{formatTempo(orcadoMin) || '—'}</span>
                      <span className="text-gray-400">/</span>
                      <span>{formatTempo(realizadoMin) || '—'}</span>
                    </div>
                  )}

                  {/* Avatares */}
                  {card.responsibles && card.responsibles.length > 0 && (
                    <div className="flex -space-x-2 overflow-hidden hover:space-x-0.5 transition-all duration-300">
                      {card.responsibles.slice(0, 3).map(r => (
                        <div key={r.user.id} className="ring-[2px] ring-white rounded-full bg-gray-200 shrink-0">
                          <UserAvatar name={r.user.name} avatarUrl={r.user.avatarUrl} size="sm" />
                        </div>
                      ))}
                      {card.responsibles.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500 z-10 shadow-sm shrink-0">
                          +{card.responsibles.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}
      </Draggable>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onDelete(card.id, columnId)}
        title="Excluir card"
        message={`Tem certeza que deseja excluir o card "${card.title}"? Esta ação não pode ser desfeita.`}
      />
    </>
  )
}
