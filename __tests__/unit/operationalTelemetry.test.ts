import { describe, expect, it } from 'vitest'
import { metrics, observe, requestId } from '@/lib/operationalTelemetry'
describe('operational telemetry privacy', () => {
  it('preserves safe ID and replaces injection/oversized values', () => {
    expect(requestId('trace-123')).toBe('trace-123')
    expect(requestId('secret\nforged-log')).toMatch(/^[a-f0-9-]{36}$/)
    expect(requestId('a'.repeat(65))).toMatch(/^[a-f0-9-]{36}$/)
  })
  it('limits cardinality to method/status classes without payload or URL', () => {
    observe('UNTRUSTED-METHOD-secret', 503, 0.25)
    expect(metrics()).toContain('method="OTHER",status="5xx"')
    expect(metrics()).not.toContain('UNTRUSTED-METHOD-secret')
    expect(metrics()).toContain('operum_process_uptime_seconds')
  })
})
