import { describe, it, expect } from 'vitest'
import { precisaDeOutroResponsavel } from '@/lib/responsavelInativo'

describe('precisaDeOutroResponsavel', () => {
  const inativos = new Set(['u1', 'u2'])
  it('todos os responsáveis inativos: precisa', () => {
    expect(precisaDeOutroResponsavel(['u1'], inativos)).toBe(true)
    expect(precisaDeOutroResponsavel(['u1', 'u2'], inativos)).toBe(true)
  })
  it('basta um ativo para não precisar', () => {
    expect(precisaDeOutroResponsavel(['u1', 'u3'], inativos)).toBe(false)
  })
  it('card sem responsável não entra na regra', () => {
    expect(precisaDeOutroResponsavel([], inativos)).toBe(false)
  })
})
