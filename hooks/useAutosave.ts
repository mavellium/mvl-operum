'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface Options {
  /** Espera após a última alteração antes de salvar (ms). */
  delay?: number
  /** Desliga o autosave (ex.: modo somente-leitura ou card ainda não criado). */
  enabled?: boolean
  guardNavigation?: boolean
}

/**
 * Salva `value` sozinho, com debounce, para o usuário não perder o que
 * escreveu. `flush()` salva na hora (use ao perder o foco ou fechar) e
 * `reset(v)` marca `v` como já salvo (use ao carregar outro registro).
 * Enquanto houver alteração pendente, o navegador pede confirmação ao sair.
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, { delay = 800, enabled = true, guardNavigation = false }: Options = {}) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const valueRef = useRef(value)
  const lastSavedRef = useRef(value)
  const saveRef = useRef(save)
  const epoch = useRef(0)
  const inFlight = useRef<Promise<boolean> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    valueRef.current = value
    saveRef.current = save
  })

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer()
    if (inFlight.current) return inFlight.current
    if (!enabled || Object.is(valueRef.current, lastSavedRef.current)) return true
    const generation = epoch.current
    inFlight.current = (async () => {
      try {
        while (!Object.is(valueRef.current, lastSavedRef.current)) {
          if (generation !== epoch.current) return false
          const current = valueRef.current
          setStatus('saving')
          await saveRef.current(current)
          if (generation !== epoch.current) return false
          lastSavedRef.current = current
        }
        setStatus('saved')
        return true
      } catch {
        if (generation === epoch.current) setStatus('error')
        return false
      } finally { if (generation === epoch.current) inFlight.current = null }
    })()
    return inFlight.current
  }, [enabled])

  const reset = useCallback((saved: T) => {
    clearTimer()
    epoch.current += 1
    inFlight.current = null
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
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!dirty || !guardNavigation) return
    const navigate = async (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || new URL(anchor.href).pathname === location.pathname) return
      event.preventDefault()
      event.stopPropagation()
      if (await flush()) location.assign(anchor.href)
    }
    document.addEventListener('click', navigate, true)
    return () => document.removeEventListener('click', navigate, true)
  }, [dirty, guardNavigation, flush])

  // Ao desmontar, não descarta o que ainda não foi salvo.
  useEffect(() => () => { void flush() }, [flush])

  return { status, flush, reset }
}
