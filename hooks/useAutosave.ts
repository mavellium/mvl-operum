'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface Options {
  /** Espera após a última alteração antes de salvar (ms). */
  delay?: number
  /** Desliga o autosave (ex.: modo somente-leitura ou card ainda não criado). */
  enabled?: boolean
}

/**
 * Salva `value` sozinho, com debounce, para o usuário não perder o que
 * escreveu. `flush()` salva na hora (use ao perder o foco ou fechar) e
 * `reset(v)` marca `v` como já salvo (use ao carregar outro registro).
 * Enquanto houver alteração pendente, o navegador pede confirmação ao sair.
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, { delay = 800, enabled = true }: Options = {}) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const valueRef = useRef(value)
  const lastSavedRef = useRef(value)
  const saveRef = useRef(save)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    valueRef.current = value
    saveRef.current = save
  })

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const flush = useCallback(async () => {
    clearTimer()
    const current = valueRef.current
    if (!enabled || Object.is(current, lastSavedRef.current)) return
    setStatus('saving')
    try {
      await saveRef.current(current)
      lastSavedRef.current = current
      // Se o usuário continuou digitando durante o save, o efeito abaixo já reagendou.
      setStatus(Object.is(valueRef.current, current) ? 'saved' : 'pending')
    } catch {
      setStatus('error')
    }
  }, [enabled])

  const reset = useCallback((saved: T) => {
    clearTimer()
    lastSavedRef.current = saved
    valueRef.current = saved
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!enabled || Object.is(value, lastSavedRef.current)) return
    setStatus('pending')
    clearTimer()
    timerRef.current = setTimeout(() => { void flush() }, delay)
    return clearTimer
  }, [value, enabled, delay, flush])

  const dirty = status === 'pending' || status === 'saving' || status === 'error'
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Ao desmontar, não descarta o que ainda não foi salvo.
  useEffect(() => () => { void flush() }, [flush])

  return { status, flush, reset }
}
