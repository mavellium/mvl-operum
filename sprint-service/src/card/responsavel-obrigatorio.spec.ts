// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { colunaExigeResponsavel } from './responsavel-obrigatorio'

const padrao = [
  { id: 'todo', title: 'A Fazer', position: 0 },
  { id: 'doing', title: 'Em Andamento', position: 1 },
  { id: 'test', title: 'Em teste', position: 2 },
  { id: 'done', title: 'Concluído', position: 3 },
]

describe('colunaExigeResponsavel', () => {
  it('a partir de "Em andamento" (sem diferenciar maiúsculas e acentos)', () => {
    expect(padrao.map(c => colunaExigeResponsavel(padrao, c.id))).toEqual([false, true, true, true])
  })

  it('sem coluna "Em andamento", vale toda coluna depois da primeira', () => {
    const outras = [{ id: 'a', title: 'Ideias', position: 0 }, { id: 'b', title: 'Fazendo', position: 1 }]
    expect(colunaExigeResponsavel(outras, 'a')).toBe(false)
    expect(colunaExigeResponsavel(outras, 'b')).toBe(true)
  })

  it('coluna desconhecida não exige', () => {
    expect(colunaExigeResponsavel(padrao, 'x')).toBe(false)
  })
})
