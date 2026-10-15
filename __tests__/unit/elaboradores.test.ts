import { describe, it, expect } from 'vitest'
import { elaboradoresDe, propsDosElaboradores, reconciliarElaboradores, diferencaParaCard, somaValoresPorMinuto, menorJornada } from '@/lib/elaboradores'
import { podeEditarRealizado } from '@/lib/permissoesCustos'

describe('elaboradores', () => {
  it('lê a lista nova e o formato antigo (um só), sem repetidos', () => {
    expect(elaboradoresDe({ elaboradoPorUserIds: ['a', 'b', 'a'] })).toEqual(['a', 'b'])
    expect(elaboradoresDe({ elaboradoPorUserId: 'a' })).toEqual(['a'])
    expect(elaboradoresDe({ elaboradoPorUserIds: [], elaboradoPorUserId: 'a' })).toEqual([])
    expect(elaboradoresDe({})).toEqual([])
  })

  it('grava a lista, o primeiro no campo antigo e os nomes juntos', () => {
    expect(propsDosElaboradores(['a', 'b'], new Map([['a', 'Ana'], ['b', 'Bruno']]))).toEqual({
      elaboradoPorUserIds: ['a', 'b'], elaboradoPorUserId: 'a', elaboradoPor: 'Ana, Bruno',
    })
    expect(propsDosElaboradores([], new Map())).toEqual({ elaboradoPorUserIds: [], elaboradoPorUserId: null, elaboradoPor: '' })
  })

  it('primeira vez junta os dois lados (card primeiro) e diz quem entra no card', () => {
    expect(reconciliarElaboradores(['ana', 'bia'], ['bia', 'caio'], false)).toEqual({
      ids: ['bia', 'caio', 'ana'], adicionarNoCard: ['ana'], removerDoCard: [],
    })
  })

  it('depois da primeira vez o card manda: quem saiu do card não volta pelo nó', () => {
    expect(reconciliarElaboradores(['ana', 'bia'], ['bia'], true)).toEqual({ ids: ['bia'], adicionarNoCard: [], removerDoCard: [] })
  })

  it('diferença da lista escolhida na planilha para os responsáveis do card', () => {
    expect(diferencaParaCard(['ana', 'caio'], ['ana', 'bia'])).toEqual({ adicionarNoCard: ['caio'], removerDoCard: ['bia'] })
  })

  it('custo: soma os valores por minuto (todos trabalham o tempo inteiro); jornada: a menor', () => {
    expect(somaValoresPorMinuto([1, 2, null])).toBe(3)
    expect(somaValoresPorMinuto([null, undefined])).toBeNull()
    expect(menorJornada([8, 6, null, 0])).toBe(6)
    expect(menorJornada([null])).toBeNull()
  })

  it('realizado próprio vale para qualquer um dos elaboradores', () => {
    const proprio = new Set(['planilha:realizado-proprio'] as const)
    expect(podeEditarRealizado(proprio, 'bia', ['ana', 'bia'])).toBe(true)
    expect(podeEditarRealizado(proprio, 'caio', ['ana', 'bia'])).toBe(false)
    expect(podeEditarRealizado(proprio, 'ana', 'ana')).toBe(true)
  })
})
