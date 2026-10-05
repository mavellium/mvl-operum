'use client'
import { useCallback, useSyncExternalStore } from 'react'
export function useMediaQuery(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    if (!window.matchMedia) return () => {}
    const media = window.matchMedia(query)
    media.addEventListener('change', notify)
    return () => media.removeEventListener('change', notify)
  }, [query])
  const snapshot = useCallback(() => window.matchMedia?.(query).matches ?? false, [query])
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
