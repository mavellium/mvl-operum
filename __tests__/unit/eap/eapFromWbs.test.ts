import { describe, it, expect } from 'vitest'
import { eapNodesFromWbs } from '@/lib/eapFromWbs'
import type { WbsNodeClient } from '@/types/wbs'

const w = (id: string, parentId: string | null, code: string, title: string, childrenIds: string[] = [], order = 0) =>
  ({ id, parentId, code, title, order, childrenIds, layout: 'LADO_A_LADO', collapsed: false, style: {}, properties: {} }) as unknown as WbsNodeClient

describe('eapNodesFromWbs', () => {
  it('sem raiz → árvore vazia', () => {
    expect(eapNodesFromWbs({}, null)).toEqual([])
  })

  it('copia títulos, ordem, níveis e códigos da aba EAP/WBS', () => {
    const nodes = {
      r: w('r', null, '1', 'Buddy', ['a', 'b']),
      a: w('a', 'r', '1.1', 'Sprint 1', ['a1']),
      a1: w('a1', 'a', '1.1.1', 'Tela de login'),
      b: w('b', 'r', '1.2', 'Sprint 2', [], 1),
    }
    const [root] = eapNodesFromWbs(nodes, 'r')
    expect(root).toMatchObject({ id: 'r', code: '1', title: 'Buddy', level: 1, parentId: null })
    expect(root.children.map(c => [c.code, c.title, c.level, c.order])).toEqual([['1.1', 'Sprint 1', 2, 0], ['1.2', 'Sprint 2', 2, 1]])
    expect(root.children[0].children[0]).toMatchObject({ code: '1.1.1', title: 'Tela de login', level: 3, parentId: 'a', children: [] })
  })

  it('ignora filho inexistente e não entra em ciclo', () => {
    const nodes = { r: w('r', null, '1', 'P', ['x', 'a']), a: w('a', 'r', '', 'A', ['r']) }
    const [root] = eapNodesFromWbs(nodes, 'r')
    expect(root.children).toHaveLength(1)
    expect(root.children[0]).toMatchObject({ code: '1.1', children: [] })
  })
})
