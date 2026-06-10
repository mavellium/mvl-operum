'use client'

import { useState, useEffect, useRef } from 'react'
import { startTimerAction, pauseTimerAction, getCardTimeAction, getActiveTimerAction } from '@/app/actions/time'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface CardTimerProps {
  cardId: string
  onEntryChanged?: () => void
  timerKey?: number
}

export default function CardTimer({ cardId, onEntryChanged, timerKey }: CardTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const intervalRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef      = useRef<Date | null>(null)
  const baseSecondsRef    = useRef(0)
  const activeEntryIdRef  = useRef<string | null>(null)

  async function fetchTotal() {
    const res = await getCardTimeAction(cardId)
    if ('seconds' in res && res.seconds != null) {
      baseSecondsRef.current = res.seconds
      setElapsed(res.seconds)
    }
  }

  // Inicialização completa — só roda quando o card muda
  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      const [timeResult, activeResult] = await Promise.all([
        getCardTimeAction(cardId),
        getActiveTimerAction(cardId),
      ])
      if (cancelled) return

      const total  = ('seconds' in timeResult ? timeResult.seconds : 0) ?? 0
      const active = 'entry' in activeResult ? activeResult.entry : null

      if (active?.isRunning) {
        const sinceStart = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)
        baseSecondsRef.current   = total - (active.duration ?? 0)
        startedAtRef.current     = new Date(active.startedAt)
        activeEntryIdRef.current = active.id
        setElapsed(baseSecondsRef.current + sinceStart)
        setIsRunning(true)
      } else {
        baseSecondsRef.current   = total
        activeEntryIdRef.current = null
        setElapsed(total)
        setIsRunning(false)
      }
      setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [cardId])

  // Refresh leve quando tempo manual é adicionado externamente — não toca em isRunning nem no intervalo
  useEffect(() => {
    if (!timerKey) return
    let cancelled = false
    getCardTimeAction(cardId).then(res => {
      if (cancelled) return
      if ('seconds' in res && res.seconds != null) {
        const total = res.seconds
        if (startedAtRef.current) {
          // timer rodando: recalcula a base sem parar o intervalo
          const sinceStart = Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000)
          baseSecondsRef.current = total - sinceStart
        } else {
          baseSecondsRef.current = total
          setElapsed(total)
        }
      }
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const sinceStart = startedAtRef.current
          ? Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000)
          : 0
        setElapsed(baseSecondsRef.current + sinceStart)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  async function handleStart() {
    setError('')
    setLoading(true)
    const result = await startTimerAction(cardId)
    if ('error' in result && result.error) {
      setError(result.error as string)
      setLoading(false)
      return
    }
    if ('entry' in result && result.entry) {
      const entry = result.entry as { id: string }
      activeEntryIdRef.current = entry.id
      baseSecondsRef.current   = elapsed
      startedAtRef.current     = new Date()
      setIsRunning(true)
    }
    setLoading(false)
  }

  async function handlePause() {
    const entryId = activeEntryIdRef.current
    if (!entryId) return
    setError('')
    setLoading(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false)
    const result = await pauseTimerAction(entryId)
    if ('error' in result && result.error) {
      setError(result.error as string)
    }
    activeEntryIdRef.current = null
    await fetchTotal()
    setLoading(false)
    onEntryChanged?.()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span
          className="text-2xl font-mono font-semibold text-slate-800 tabular-nums min-w-[80px]"
          aria-label="Tempo acumulado"
        >
          {loading && elapsed === 0 ? '—' : formatDuration(elapsed)}
        </span>

        {isRunning ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handlePause() }}
            disabled={loading}
            aria-label="Pausar timer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleStart() }}
            disabled={loading}
            aria-label="Iniciar timer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Iniciar
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
