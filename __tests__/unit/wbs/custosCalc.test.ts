import { describe, it, expect } from 'vitest'
import {
  custoFolhaPrevisto,
  custoFolhaRealizado,
  computePlanilha,
} from '@/lib/custosCalc'
import type { WbsNodeClient } from '@/types/wbs'

const S = {
  backgroundColor: '#fff', borderColor: '#000', textColor: '#000',
  borderWidth: 1, fontSize: 14, borderRadius: 4,
}

function node(
  id: string,
  parentId: string | null,
  childrenIds: string[],
  props: WbsNodeClient['properties'] = {},
): WbsNodeClient {
  return {
    id, parentId, order: 0, code: `C${id.toUpperCase()}`, title: id,
    layout: 'ABAIXO', collapsed: false, style: S, properties: props, childrenIds,
  }
}

describe('custoFolhaPrevisto / custoFolhaRealizado', () => {
  it('deriva custo previsto = tempo × valorPorMinuto + materiais', () => {
    expect(custoFolhaPrevisto(60, 0.5, 100)).toBe(130) // 60*0.5 + 100
  })

  it('deriva custo realizado a partir de tempo/materiais reais', () => {
    expect(custoFolhaRealizado(30, 0.5, 50)).toBe(65)
  })

  it('arredonda para 2 casas', () => {
    expect(custoFolhaPrevisto(1, 0.12345, 0)).toBe(0.12)
  })
})

describe('computePlanilha', () => {
  const vpm = 0.5 // R$/min

  it('retorna vazio sem root', () => {
    expect(computePlanilha({}, null, { valorPorMinuto: vpm, horasPorDia: 8 })).toEqual({
      rows: [], totalPrevisto: 0, totalReal: 0,
    })
  })

  it('folha única: previsto/real derivados e ordem pai-antes', () => {
    const nodes = {
      r: node('r', null, ['a']),
      a: node('a', 'r', [], { tempoMinutos: 60, materiais: 100, tempoRealMinutos: 30, materiaisReal: 50 }),
    }
    const { rows, totalPrevisto, totalReal } = computePlanilha(nodes, 'r', { valorPorMinuto: vpm, horasPorDia: 8 })
    expect(totalPrevisto).toBe(130)
    expect(totalReal).toBe(65)
    // pre-order: pai primeiro
    expect(rows.map(x => x.id)).toEqual(['r', 'a'])
    const folha = rows[1]
    expect(folha.éFolha).toBe(true)
    expect(folha.custoPrevisto).toBe(130)
    expect(folha.custoReal).toBe(65)
    // pai consolida a soma dos filhos
    expect(rows[0].custoPrevisto).toBe(130)
    expect(rows[0].custoReal).toBe(65)
    expect(rows[0].éFolha).toBe(false)
  })

  it('soma múltiplas folhas e não conta pai duas vezes', () => {
    const nodes = {
      r: node('r', null, ['a', 'b']),
      a: node('a', 'r', [], { tempoMinutos: 60, materiais: 100 }), // 130
      b: node('b', 'r', [], { tempoMinutos: 30, materiais: 0 }), // 15
    }
    const { totalPrevisto, rows } = computePlanilha(nodes, 'r', { valorPorMinuto: vpm, horasPorDia: 8 })
    expect(totalPrevisto).toBe(145)
    expect(rows[0].custoPrevisto).toBe(145) // pai = soma, não duplicado
    expect(rows.length).toBe(3)
  })
})
