'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * Data/hora atual só no cliente (null no SSR e na hidratação). Evita
 * divergência de hidratação em textos que dependem do relógio ou do fuso do
 * navegador, como o prazo "30/09" de um card.
 */
export function useClientNow(): Date | null {
  return useSyncExternalStore(subscribe, getNow, () => null)
}

let cached: Date | null = null
let cachedAt = 0

// useSyncExternalStore exige snapshot estável entre renders próximos.
function getNow(): Date {
  const t = Date.now()
  if (!cached || t - cachedAt > 60_000) {
    cached = new Date(t)
    cachedAt = t
  }
  return cached
}
