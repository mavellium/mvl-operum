import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { avisoTimerLongo, LIMITE_TIMER_HORAS } from '@/lib/avisoTimer'

const agora = new Date('2026-10-16T12:00:00Z')
const ha = (h: number) => new Date(agora.getTime() - h * 3600_000)

describe('aviso de timer esquecido', () => {
  it('a partir de 8 h de sessão avisa, dizendo que para sozinho em 12 h', () => {
    expect(avisoTimerLongo(ha(7.9), agora)).toBeNull()
    expect(avisoTimerLongo(ha(9.2), agora)).toBe('Timer ligado há 9 h. Se você esqueceu, pause e corrija o tempo; ele para sozinho em 12 h.')
    expect(avisoTimerLongo(null, agora)).toBeNull()
  })

  it('o limite da tela é o mesmo do sprint-service', () => {
    const fonte = readFileSync('sprint-service/src/time-entry/regras-tempo.ts', 'utf8')
    expect(fonte).toContain(`export const LIMITE_HORAS = ${LIMITE_TIMER_HORAS}`)
  })
})
