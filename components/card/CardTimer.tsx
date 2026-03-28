'use client'

import { useState, useEffect, useRef } from 'react'
import { startTimerAction, pauseTimerAction, getCardTimeAction, getActiveTimerAction } from '@/app/actions/time'

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

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="text-2xl font-mono font-semibold text-gray-800 tabular-nums min-w-[80px]"
        aria-label="Tempo acumulado"
      >
        {formatDuration(elapsed)}
      </span>
      {isRunning ? (
        <button
          onClick={handlePause}
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
          onClick={handleStart}
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
    </div>
  )
}
