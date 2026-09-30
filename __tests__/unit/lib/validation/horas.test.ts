import { describe, it, expect } from 'vitest'
import { parseHoras, formatHoras, ERRO_HORAS } from '@/lib/validation/horas'

describe('parseHoras (SDD 4.5)', () => {
  it.each([
    ['8', 8],
    ['8,5', 8.5],
    ['8.5', 8.5],
    ['8:30', 8.5],
    ['7:45', 7.75],
    ['8:20', 8.33],
    [' 6,25 ', 6.25],
    ['24', 24],
    ['0,5', 0.5],
    [8.5, 8.5],
  ])('%s → %s', (entrada, esperado) => {
    expect(parseHoras(entrada)).toEqual({ valor: esperado, erro: null })
  })

  it.each([undefined, null, '', '   '])('vazio (%s) é permitido: o campo é opcional', entrada => {
    expect(parseHoras(entrada)).toEqual({ valor: null, erro: null })
  })

  it.each(['30', '24,5', '0', '0:00', '-2', '8:75', '8,555', 'oito', '8h', '1e1', 25])('recusa %s', entrada => {
    expect(parseHoras(entrada)).toEqual({ valor: null, erro: ERRO_HORAS })
  })
})

describe('formatHoras', () => {
  it.each([[8, '8'], [8.5, '8,5'], [7.75, '7,75']])('%s → %s', (valor, texto) => {
    expect(formatHoras(valor)).toBe(texto)
  })
})
