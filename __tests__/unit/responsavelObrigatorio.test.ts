import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { colunaExigeResponsavel } from '@/lib/responsavelObrigatorio'

const semCabecalho = (p: string) => readFileSync(p, 'utf8').split('\n').filter(l => !l.includes('Espelho de')).join('\n')

describe('responsável obrigatório (app = sprint-service)', () => {
  it('o app usa a mesma regra do sprint-service', () => {
    expect(semCabecalho('lib/responsavelObrigatorio.ts')).toBe(semCabecalho('sprint-service/src/card/responsavel-obrigatorio.ts'))
  })

  it('a partir de "Em andamento"', () => {
    const cols = [
      { id: 'a', title: 'A Fazer', position: 0 }, { id: 'b', title: 'Em andamento', position: 1 }, { id: 'c', title: 'Concluído', position: 2 },
    ]
    expect(cols.map(c => colunaExigeResponsavel(cols, c.id))).toEqual([false, true, true])
  })
})
