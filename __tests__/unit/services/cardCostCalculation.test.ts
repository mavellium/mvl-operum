// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  calcularDerivados,
  calcularSituacaoStatus,
  type DerivadosInput,
} from '@/lib/cardUtils'

describe('calcularDerivados', () => {
  const base: DerivadosInput = {
    minutos: 480,
    horasDiarias: 8,
    remuneracao: 2400,
  }

  it('calcula horas corretamente', () => {
    const result = calcularDerivados(base)
    expect(result.horas).toBeCloseTo(8)
  })

  it('calcula dias corretamente', () => {
    const result = calcularDerivados(base)
    expect(result.dias).toBeCloseTo(1)
  })

  it('calcula valor_por_minuto corretamente', () => {
    // remuneracao=2400, horasDiarias=8 → 2400 / (8*60) = 5 por minuto
    const result = calcularDerivados(base)
    expect(result.valorPorMinuto).toBeCloseTo(5)
  })

  it('calcula total corretamente', () => {
    // 480 min × R$5/min = R$2400
    const result = calcularDerivados(base)
    expect(result.total).toBeCloseTo(2400)
  })

  it('retorna zeros quando minutos é 0', () => {
    const result = calcularDerivados({ ...base, minutos: 0 })
    expect(result.horas).toBe(0)
    expect(result.dias).toBe(0)
    expect(result.total).toBe(0)
  })

  it('retorna zeros quando horasDiarias é 0 (evita divisão por zero)', () => {
    const result = calcularDerivados({ ...base, horasDiarias: 0 })
    expect(result.dias).toBe(0)
    expect(result.valorPorMinuto).toBe(0)
    expect(result.total).toBe(0)
  })

  it('retorna zeros quando remuneracao é 0', () => {
    const result = calcularDerivados({ ...base, remuneracao: 0 })
    expect(result.valorPorMinuto).toBe(0)
    expect(result.total).toBe(0)
  })

  it('calcula corretamente para jornada de 6h (freelancer)', () => {
    const result = calcularDerivados({ minutos: 360, horasDiarias: 6, remuneracao: 1800 })
    expect(result.horas).toBeCloseTo(6)
    expect(result.dias).toBeCloseTo(1)
    expect(result.valorPorMinuto).toBeCloseTo(5)
    expect(result.total).toBeCloseTo(1800)
  })
})

describe('calcularSituacaoStatus', () => {
  const dataPrevista = new Date('2024-06-15')

  it('retorna "Antecipada" quando realização antes do previsto', () => {
    const dataRealizacao = new Date('2024-06-10')
    expect(calcularSituacaoStatus(dataRealizacao, dataPrevista)).toBe('Antecipada')
  })

  it('retorna "No prazo" quando realização na mesma data que previsto', () => {
    const dataRealizacao = new Date('2024-06-15')
    expect(calcularSituacaoStatus(dataRealizacao, dataPrevista)).toBe('No prazo')
  })

  it('retorna "Atrasada" quando realização após o previsto', () => {
    const dataRealizacao = new Date('2024-06-20')
    expect(calcularSituacaoStatus(dataRealizacao, dataPrevista)).toBe('Atrasada')
  })

  it('retorna null quando uma das datas é nula', () => {
    expect(calcularSituacaoStatus(null, dataPrevista)).toBeNull()
    expect(calcularSituacaoStatus(new Date(), null)).toBeNull()
  })
})
