'use client'

import { useSyncExternalStore } from 'react'
import { toDateInputValue } from '@/lib/date'

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000)
  return () => clearInterval(timer)
}
function browserToday() { return toDateInputValue(new Date()) }
/** Stable SSR snapshot; after hydration, use the viewer's calendar and follow midnight. */
export function useCalendarToday(serverToday: string) {
  return useSyncExternalStore(subscribe, browserToday, () => serverToday)
}
