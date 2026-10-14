'use client'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { getCardTimeAction, getCardsTimerAction, pauseTimerAction, startTimerAction, type CardTimerState } from '@/app/actions/time'

type Entry = { id: string; isRunning?: boolean; startedAt: string | Date; duration?: number | null }
type Snapshot = { seconds: number; entry: Entry | null; known: boolean; loading: boolean; error: string }
type Store = { snapshot: Snapshot; listeners: Set<() => void>; operation: Promise<boolean> | null }
const initial: Snapshot = { seconds: 0, entry: null, known: false, loading: true, error: '' }
const stores = new Map<string, Store>()
function storeFor(id: string) {
  let store = stores.get(id)
  if (!store) { store = { snapshot: initial, listeners: new Set(), operation: null }; stores.set(id, store) }
  return store
}
function update(store: Store, patch: Partial<Snapshot>) { store.snapshot = { ...store.snapshot, ...patch }; store.listeners.forEach(notify => notify()) }
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Não foi possível confirmar o timer. Atualize e tente novamente.')), 15000) })]) }
  finally { clearTimeout(timeout!) }
}
// Leituras do mesmo instante (todos os cards do quadro ao montar) viram uma única
// Server Action: o cliente executa Server Actions uma de cada vez, e uma chamada por
// card enfileirava o quadro inteiro até estourar o tempo do timer.
type Pedido = { id: string; resolve: (state: CardTimerState) => void; reject: (error: unknown) => void }
let fila: Pedido[] = []
let agendado = false
const LOTE_MAX = 200
async function processarFila() {
  const pedidos = fila
  fila = []
  agendado = false
  for (let i = 0; i < pedidos.length; i += LOTE_MAX) {
    const lote = pedidos.slice(i, i + LOTE_MAX)
    try {
      const estados = await getCardsTimerAction(lote.map(p => p.id))
      for (const p of lote) p.resolve(estados[p.id] ?? { error: 'Não foi possível carregar o timer' })
    } catch (error) {
      for (const p of lote) p.reject(error)
    }
  }
}
function lerEmLote(id: string): Promise<CardTimerState> {
  return new Promise((resolve, reject) => {
    fila.push({ id, resolve, reject })
    if (!agendado) { agendado = true; queueMicrotask(() => { void processarFila() }) }
  })
}
async function read(id: string, store: Store) {
  const state = await bounded(lerEmLote(id))
  if ('error' in state || state.seconds == null) throw new Error(('error' in state ? state.error : '') || 'Não foi possível carregar o timer')
  update(store, { seconds: state.seconds, entry: state.entry?.isRunning ? state.entry : null, known: true })
}
function run(id: string, action: 'refresh' | 'toggle'): Promise<boolean> {
  const store = storeFor(id)
  if (store.operation) return store.operation
  update(store, { loading: true, error: '' })
  store.operation = (async () => {
    try {
      if (action === 'refresh') await read(id, store)
      else {
        if (!store.snapshot.known) throw new Error('Atualize o timer antes de iniciar ou pausar')
        const active = store.snapshot.entry
        const result = await bounded(active ? pauseTimerAction(active.id) : startTimerAction(id))
        if ('error' in result || !result.entry) throw new Error(('error' in result && result.error) || 'Não foi possível confirmar o timer')
        const entry = result.entry as Record<string, unknown>
        if (typeof entry.id !== 'string') throw new Error('Resposta inválida do timer')
        if (active) update(store, { entry: null, seconds: store.snapshot.seconds + (typeof entry.duration === 'number' ? entry.duration : 0), known: true })
        else update(store, { entry: { id: entry.id, startedAt: typeof entry.startedAt === 'string' || entry.startedAt instanceof Date ? entry.startedAt : new Date().toISOString() }, known: true })
        // Persisted total is canonical, especially after an idempotent stop.
        if (active) {
          const total = await bounded(getCardTimeAction(id))
          if ('seconds' in total && total.seconds != null) update(store, { seconds: total.seconds })
        }
      }
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível confirmar o timer'
      if (action === 'toggle') {
        try { await read(id, store) } catch { update(store, { known: false }) }
      } else update(store, { known: false })
      update(store, { error: message })
      return false
    } finally { update(store, { loading: false }); store.operation = null; if (!store.listeners.size && stores.get(id) === store) stores.delete(id) }
  })()
  return store.operation
}
export function useCardTimer(cardId: string, refreshKey?: number) {
  const subscribe = useCallback((notify: () => void) => {
    const store = storeFor(cardId)
    store.listeners.add(notify)
    return () => { store.listeners.delete(notify); if (!store.listeners.size && !store.operation) stores.delete(cardId) }
  }, [cardId])
  const snapshot = useSyncExternalStore(subscribe, useCallback(() => storeFor(cardId).snapshot, [cardId]), () => initial)
  const [now, tick] = useState(() => Date.now())
  useEffect(() => { void run(cardId, 'refresh') }, [cardId, refreshKey])
  useEffect(() => {
    if (!snapshot.entry) return
    const interval = setInterval(() => tick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [snapshot.entry])
  const elapsed = snapshot.seconds + (snapshot.entry ? Math.max(0, Math.floor((now - new Date(snapshot.entry.startedAt).getTime()) / 1000)) : 0)
  return { ...snapshot, elapsed, isRunning: !!snapshot.entry, toggle: () => run(cardId, 'toggle'), refresh: () => run(cardId, 'refresh') }
}
