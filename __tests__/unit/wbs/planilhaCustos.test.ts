import { describe, it, expect } from 'vitest'
import {
  computarPlanilhaCustos,
  valorPorMinutoDe,
  situacaoDe,
  fmtDataBR,
} from '@/lib/planilhaCustos'
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
    id, parentId, order: 0, code: id.toUpperCase(), title: id,
    layout: 'ABAIXO', collapsed: false, style: S, properties: props, childrenIds,
  }
}

// Dataset de exemplo (§F.6): com valorReferencia 4000 e horasPorDia 8,
// valorPorMinuto = 4000/30/8/60 = 5/18. Os totais batem com o modelo:
//   orçado ≈ 58,84 e realizado ≈ 22,51.
function eapExemplo(): Record<string, WbsNodeClient> {
  return {
    r: node('r', null, ['m1', 'm2']),
    m1: node('m1', 'r', ['a1', 'a2', 'a3']),
    m2: node('m2', 'r', []),
    a1: node('a1', 'm1', [], {
      tempoMinutos: 90, materiais: 5,
      tempoRealMinutos: 36, materiaisReal: 1,
      dataPrevista: '2026-03-10', dataRealizacao: '2026-03-05',
      elaboradoPor: 'Maria',
    }),
    a2: node('a2', 'm1', [], {
      tempoMinutos: 60, materiais: 2.84,
      tempoRealMinutos: 24, materiaisReal: 1,
      dataPrevista: '2026-03-10', dataRealizacao: '2026-03-10',
      elaboradoPor: 'João',
    }),
    a3: node('a3', 'm1', [], {
      tempoMinutos: 30, materiais: 1,
      tempoRealMinutos: 12, materiaisReal: 0.51,
      dataPrevista: '2026-03-10', dataRealizacao: '2026-03-15',
      elaboradoPor: 'Maria',
    }),
  }
}

const CONFIG = { valorReferencia: 4000, horasPorDia: 8 }

describe('valorPorMinutoDe', () => {
  it('salário mínimo /30/8h/60min (= 5/18)', () => {
    expect(valorPorMinutoDe(CONFIG)).toBeCloseTo(5 / 18, 10)
  })
})

describe('situacaoDe', () => {
  it('sem realização → Pendente', () => {
    expect(situacaoDe('2026-03-10', null)).toBe('Pendente')
  })
  it('realização antes da prevista → Antecipada', () => {
    expect(situacaoDe('2026-03-10', '2026-03-05')).toBe('Antecipada')
  })
  it('realização no mesmo dia → No prazo', () => {
    expect(situacaoDe('2026-03-10', '2026-03-10')).toBe('No prazo')
  })
  it('realização depois → Atrasada', () => {
    expect(situacaoDe('2026-03-10', '2026-03-15')).toBe('Atrasada')
  })
})

describe('fmtDataBR', () => {
  it('yyyy-mm-dd → dd/mm/aaaa; vazio quando ausente', () => {
    expect(fmtDataBR('2026-03-05')).toBe('05/03/2026')
    expect(fmtDataBR(null)).toBe('')
    expect(fmtDataBR(undefined)).toBe('')
  })
})

describe('computarPlanilhaCustos — dataset de exemplo', () => {
  const plan = computarPlanilhaCustos(eapExemplo(), 'r', CONFIG)

  it('macrofase sem atividades folha é ignorada (m2)', () => {
    expect(plan.macrofases.map(f => f.nodeId)).toEqual(['m1'])
  })

  it('TOTAL GERAL orçado ≈ 58,84 e realizado ≈ 22,51', () => {
    expect(plan.totalOrcado).toBeCloseTo(58.84, 2)
    expect(plan.totalReal).toBeCloseTo(22.51, 2)
  })

  it('custo deriva de min × valorPorMinuto + materiais, por linha', () => {
    const [a1, a2, a3] = plan.macrofases[0].atividades
    expect(a1.totalOrcado).toBeCloseTo(90 * (5 / 18) + 5, 2) // 30
    expect(a2.totalOrcado).toBeCloseTo(60 * (5 / 18) + 2.84, 2)
    expect(a3.totalOrcado).toBeCloseTo(30 * (5 / 18) + 1, 2)
    expect(a1.totalReal).toBeCloseTo(36 * (5 / 18) + 1, 2) // 11
    expect(a3.totalReal).toBeCloseTo(12 * (5 / 18) + 0.51, 2)
  })

  it('situação de cada atividade', () => {
    const [a1, a2, a3] = plan.macrofases[0].atividades
    expect(a1.situacao).toBe('Antecipada')
    expect(a2.situacao).toBe('No prazo')
    expect(a3.situacao).toBe('Atrasada')
  })

  it('sub-total da macrofase soma linhas (60,00 min orçados)', () => {
    const f = plan.macrofases[0]
    expect(f.minOrcado).toBe(180)
    expect(f.minReal).toBe(72)
    expect(f.totalOrcado).toBeCloseTo(plan.totalOrcado, 2)
  })

  it('quadro de valores por fase', () => {
    const [v] = plan.quadros.valor
    expect(v.fase).toBe('M1 m1')
    expect(v.orcado).toBeCloseTo(58.84, 2)
    expect(v.realizado).toBeCloseTo(22.51, 2)
  })

  it('quadro de tempo por fase (min)', () => {
    const [t] = plan.quadros.tempo
    expect(t.minOrcado).toBe(180)
    expect(t.minReal).toBe(72)
  })

  it('quadro de elaboradores: quantidade e percentual', () => {
    const els = plan.quadros.elaboradores
    const maria = els.find(e => e.elaborador === 'Maria')!
    expect(maria.qtdeAtividades).toBe(2)
    expect(maria.percentual).toBeCloseTo(66.7, 1) // 2/3
    const joao = els.find(e => e.elaborador === 'João')!
    expect(joao.percentual).toBeCloseTo(33.3, 1)
  })
})