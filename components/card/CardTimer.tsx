'use client'

import { useState, useEffect, useRef } from 'react'
import { startTimerAction, pauseTimerAction, getCardTimeAction, getActiveTimerAction, addManualTimeAction } from '@/app/actions/time'
import TimeEntryList from './TimeEntryList'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface CardTimerProps {
  cardId: string
}

export default function CardTimer({ cardId }: CardTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds displayed
  const [loading, setLoading] = useState(true)
  const [showManual, setShowManual] = useState(false)
  const [manualHours, setManualHours] = useState('0')
  const [manualMinutes, setManualMinutes] = useState('0')
  const [manualDescription, setManualDescription] = useState('')
  const [manualError, setManualError] = useState('')
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<Date | null>(null)
  const baseSecondsRef = useRef(0)

  useEffect(() => {
    async function init() {
      const [timeResult, activeResult] = await Promise.all([
        getCardTimeAction(cardId),
        getActiveTimerAction(cardId),
      ])
      const total = ('seconds' in timeResult ? timeResult.seconds : 0) ?? 0
      const active = 'entry' in activeResult ? activeResult.entry : null

      if (active?.isRunning) {
        const sinceStart = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)
        baseSecondsRef.current = total
        startedAtRef.current = new Date(active.startedAt)
        setElapsed((total - (active.duration ?? 0)) + sinceStart)
        setIsRunning(true)
      } else {
        baseSecondsRef.current = total
        setElapsed(total)
        setIsRunning(false)
      }
      setLoading(false)
    }
    init()
  }, [cardId])

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
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  async function handleStart() {
    setLoading(true)
    const result = await startTimerAction(cardId)
    if ('entry' in result && result.entry) {
      baseSecondsRef.current = elapsed
      startedAtRef.current = new Date()
      setIsRunning(true)
    }
    setLoading(false)
  }

  async function handlePause() {
    setLoading(true)
    await pauseTimerAction(cardId)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false)
    // Refresh total
    const timeResult = await getCardTimeAction(cardId)
    if ('seconds' in timeResult && timeResult.seconds != null) {
      baseSecondsRef.current = timeResult.seconds
      setElapsed(timeResult.seconds)
    }
    setLoading(false)
  }

  async function handleManualSave() {
    setManualError('')
    const h = parseInt(manualHours) || 0
    const m = parseInt(manualMinutes) || 0
    if (h < 0 || m < 0 || (h === 0 && m === 0)) {
      setManualError('Informe um tempo válido maior que zero.')
      return
    }
    setLoading(true)
    const result = await addManualTimeAction(cardId, h, m, manualDescription || undefined)
    setLoading(false)
    if ('error' in result && result.error) {
      setManualError(result.error)
      return
    }
    // Refresh total displayed
    const timeResult = await getCardTimeAction(cardId)
    if ('seconds' in timeResult && timeResult.seconds != null) {
      baseSecondsRef.current = timeResult.seconds
      setElapsed(timeResult.seconds)
    }
    setManualHours('0')
    setManualMinutes('0')
    setManualDescription('')
    setShowManual(false)
    setListRefreshKey(k => k + 1)
  }

  async function handleRefreshTotal() {
    const timeResult = await getCardTimeAction(cardId)
    if ('seconds' in timeResult && timeResult.seconds != null) {
      baseSecondsRef.current = timeResult.seconds
      setElapsed(timeResult.seconds)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-3">
        <span
          className="text-2xl font-mono font-semibold text-gray-800 tabular-nums min-w-[80px]"
          aria-label="Tempo acumulado"
        >
          {formatDuration(elapsed)}
        </span>
        {isRunning ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handlePause() }}
            disabled={loading}
            aria-label="Pausar timer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleStart() }}
            disabled={loading}
            aria-label="Iniciar timer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Iniciar
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowManual(v => !v); setManualError('') }}
          className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          Adicionar manualmente
        </button>
      </div>

      {showManual && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Horas</label>
              <input
                type="number"
                min="0"
                value={manualHours}
                onChange={e => setManualHours(e.target.value)}
                aria-label="Horas"
                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Minutos</label>
              <input
                type="number"
                min="0"
                max="59"
                value={manualMinutes}
                onChange={e => setManualMinutes(e.target.value)}
                aria-label="Minutos"
                className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleManualSave() }}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowManual(false) }}
              className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={manualDescription}
            onChange={e => setManualDescription(e.target.value)}
            aria-label="Descrição"
            className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {manualError && <p className="text-xs text-red-500">{manualError}</p>}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-1">Histórico</p>
        <TimeEntryList cardId={cardId} refreshKey={listRefreshKey} onChanged={handleRefreshTotal} />
      </div>
    </div>
  )
}
