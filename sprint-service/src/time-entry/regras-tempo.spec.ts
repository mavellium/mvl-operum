// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { conflito, erroDoIntervalo, venceu, LIMITE_SEGUNDOS } from './regras-tempo'

const agora = new Date('2026-10-16T12:00:00Z')
const h = (x: number) => new Date(agora.getTime() + x * 3600_000)

describe('regras de tempo', () => {
  it('intervalo válido e inválidos', () => {
    expect(erroDoIntervalo({ inicio: h(-2), fim: h(-1) }, agora)).toBeNull()
    expect(erroDoIntervalo({ inicio: h(-1), fim: h(-2) }, agora)).toMatch('depois do início')
    expect(erroDoIntervalo({ inicio: h(-1), fim: h(1) }, agora)).toMatch('futuro')
    expect(erroDoIntervalo({ inicio: h(-13), fim: h(-0.5) }, agora)).toMatch('12 h')
    expect(erroDoIntervalo({ inicio: new Date('x'), fim: h(-1) }, agora)).toMatch('datas válidas')
  })

  it('sobreposição: encostar não conflita; timer rodando vai até agora', () => {
    const existentes = [{ id: 'a', startedAt: h(-3), endedAt: h(-2), isRunning: false }]
    expect(conflito({ inicio: h(-2), fim: h(-1) }, existentes, agora)).toBeNull()
    expect(conflito({ inicio: h(-2.5), fim: h(-1) }, existentes, agora)?.id).toBe('a')
    expect(conflito({ inicio: h(-2.5), fim: h(-1) }, existentes, agora, 'a')).toBeNull()
    expect(conflito({ inicio: h(-0.5), fim: h(-0.1) }, [{ id: 'r', startedAt: h(-1), endedAt: null, isRunning: true }], agora)?.id).toBe('r')
  })

  it('vence só depois de 12 h', () => {
    expect(venceu(new Date(agora.getTime() - LIMITE_SEGUNDOS * 1000 + 1000), agora)).toBe(false)
    expect(venceu(h(-12.01), agora)).toBe(true)
  })
})
