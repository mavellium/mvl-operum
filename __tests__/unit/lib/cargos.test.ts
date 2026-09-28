import { describe, it, expect } from 'vitest'
import { cargoNoProjeto } from '@/lib/cargos'

describe('cargoNoProjeto', () => {
  it('usa os cargos do projeto, limpando espaços e vazios', () => {
    expect(cargoNoProjeto(' Analista ,, Gerente de Projeto ', 'Educador')).toBe('Analista, Gerente de Projeto')
  })

  it('sem cargo no projeto, cai no cargo global', () => {
    expect(cargoNoProjeto(null, 'Educador')).toBe('Educador')
    expect(cargoNoProjeto('  ', 'Educador')).toBe('Educador')
  })

  it('sem nenhum dos dois, null', () => {
    expect(cargoNoProjeto(null, null)).toBeNull()
    expect(cargoNoProjeto('', ' ')).toBeNull()
  })
})
