import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useCalendarToday } from '@/hooks/useCalendarToday'
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
it('usa o calendário local em vez de antecipar hoje pelo UTC e acompanha a virada do dia', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T01:00:00Z'))
  vi.stubEnv('TZ', 'America/Sao_Paulo')
  const hook = renderHook(() => useCalendarToday('2026-10-06'))
  expect(hook.result.current).toBe('2026-10-05')
  act(() => vi.advanceTimersByTime(2 * 60 * 60_000))
  expect(hook.result.current).toBe('2026-10-06')
  hook.unmount()
})
