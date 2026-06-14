import { describe, it, expect } from 'vitest'
import { computeRollups } from '@/lib/wbsRollup'
import type { WbsNodeClient } from '@/types/wbs'

const S = {
  backgroundColor: '#fff', borderColor: '#000', textColor: '#000',
  borderWidth: 1, fontSize: 14, borderRadius: 4,
}

function node(
  id: string,
  parentId: string | null,
  childrenIds: string[],
  cost?: number,
  durationDays?: number
): WbsNodeClient {
  return {
    id, parentId, order: 0, code: '', title: id,
    layout: 'ABAIXO', collapsed: false, style: S,
    properties: { cost, durationDays },
    childrenIds,
  }
}

describe('computeRollups', () => {
  it('retorna {} para rootId null', () => {
    expect(computeRollups({}, null)).toEqual({})
  })

  it('retorna {} para rootId inexistente', () => {
    expect(computeRollups({}, 'nope')).toEqual({})
  })

  it('folha usa valor próprio', () => {
    const r = computeRollups({ r: node('r', null, [], 100, 5) }, 'r')
    expect(r.r).toEqual({ cost: 100, durationDays: 5, isRolledUp: false })
  })

  it('folha sem valores retorna zeros', () => {
    const r = computeRollups({ r: node('r', null, []) }, 'r')
    expect(r.r).toEqual({ cost: 0, durationDays: 0, isRolledUp: false })
  })

  it('pai é soma dos filhos (isRolledUp: true)', () => {
    const nodes = {
      r: node('r', null, ['a', 'b']),
      a: node('a', 'r', [], 30, 2),
      b: node('b', 'r', [], 70, 3),
    }
    const r = computeRollups(nodes, 'r')
    expect(r.r).toEqual({ cost: 100, durationDays: 5, isRolledUp: true })
  })

  it('rollup em cascata — 3 níveis', () => {
    const nodes = {
      r: node('r', null, ['a']),
      a: node('a', 'r', ['aa', 'ab']),
      aa: node('aa', 'a', [], 10, 1),
      ab: node('ab', 'a', [], 20, 2),
    }
    const r = computeRollups(nodes, 'r')
    expect(r.aa).toEqual({ cost: 10, durationDays: 1, isRolledUp: false })
    expect(r.ab).toEqual({ cost: 20, durationDays: 2, isRolledUp: false })
    expect(r.a).toEqual({ cost: 30, durationDays: 3, isRolledUp: true })
    expect(r.r).toEqual({ cost: 30, durationDays: 3, isRolledUp: true })
  })

  it('nó com filhos ignora valor próprio (rollup substitui)', () => {
    const nodes = {
      r: node('r', null, ['a'], 999, 999),
      a: node('a', 'r', [], 50, 4),
    }
    const r = computeRollups(nodes, 'r')
    expect(r.r.cost).toBe(50)
    expect(r.r.durationDays).toBe(4)
    expect(r.r.isRolledUp).toBe(true)
  })

  it('não processa childrenIds cujos nós não existem no mapa', () => {
    const nodes = {
      r: node('r', null, ['a', 'ghost']),
      a: node('a', 'r', [], 10, 1),
    }
    const r = computeRollups(nodes, 'r')
    expect(r.r.cost).toBe(10)
    expect(r.r.isRolledUp).toBe(true)
  })
})
