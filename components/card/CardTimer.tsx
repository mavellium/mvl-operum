'use client'

import { useState, useEffect, useRef } from 'react'
import { startTimerAction, pauseTimerAction, getCardTimeAction, getActiveTimerAction, addManualTimeAction } from '@/app/actions/time'

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
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualHours, setManualHours] = useState(0)
  const [manualMinutes, setManualMinutes] = useState(0)
  const [manualError, setManualError] = useState('')

  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef     = useRef<Date | null>(null)
  const baseSecondsRef   = useRef(0)
  const activeEntryIdRef = useRef<string | null>(null)

  async function fetchTotal() {
    const res = await getCardTimeAction(cardId)
    if ('seconds' in res && res.seconds != null) {
      baseSecondsRef.current = res.seconds
      setElapsed(res.seconds)
    }
  }

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

  // Refresh leve quando tempo manual é adicionado externamente
  useEffect(() => {
    if (!timerKey) return
    let cancelled = false
    getCardTimeAction(cardId).then(res => {
      if (cancelled) return
      if ('seconds' in res && res.seconds != null) {
        const total = res.seconds
        if (startedAtRef.current) {
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

  async function handleSaveManual() {
    setManualError('')
    if (manualHours === 0 && manualMinutes === 0) {
      setManualError('Informe um tempo válido')
      return
    }
    setLoading(true)
    const result = await addManualTimeAction(cardId, manualHours, manualMinutes)
    if ('error' in result && result.error) {
      setManualError(result.error as string)
      setLoading(false)
      return
    }
    setShowManualForm(false)
    setManualHours(0)
    setManualMinutes(0)
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

      {!showManualForm ? (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setShowManualForm(true); setManualError('') }}
          className="text-xs text-slate-500 hover:text-slate-700 underline transition-colors cursor-pointer self-start"
        >
          Adicionar manualmente
        </button>
      ) : (
        <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={`manual-hours-${cardId}`} className="text-xs text-slate-500">Horas</label>
              <input
                id={`manual-hours-${cardId}`}
                type="number"
                min={0}
                max={168}
                value={manualHours}
                onChange={e => setManualHours(Number(e.target.value))}
                className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`manual-minutes-${cardId}`} className="text-xs text-slate-500">Minutos</label>
              <input
                id={`manual-minutes-${cardId}`}
                type="number"
                min={0}
                max={59}
                value={manualMinutes}
                onChange={e => setManualMinutes(Number(e.target.value))}
                className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          {manualError && <p className="text-xs text-red-500">{manualError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowManualForm(false); setManualError('') }}
              className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleSaveManual() }}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
