import { describe, it, expect } from 'vitest'
import {
  recomputeNodeCodes,
  countNodes,
  maxDepth,
  flattenTree,
  findNode,
  collectSubtreeIds,
} from '@/lib/eapCode'
import type { EapNode } from '@/types/eap'

function n(id: string, title: string, children: EapNode[] = []): EapNode {
  return { id, parentId: null, code: '', title, level: 1, order: 0, children }
}

function plainTree(): EapNode[] {
  return [
    n('r', 'Projeto', [
      n('a', 'Fase A', [n('aa', 'Pacote A1'), n('ab', 'Pacote A2'), n('ac', 'Pacote A3')]),
      n('b', 'Fase B', [n('ba', 'Pacote B1'), n('bb', 'Pacote B2')]),
      n('c', 'Fase C', [n('ca', 'Pacote C1')]),
    ]),
  ]
}

describe('recomputeNodeCodes', () => {
  it('raiz recebe code "1"', () => {
    const out = recomputeNodeCodes([n('r', 'Projeto')])
    expect(out[0].code).toBe('1')
    expect(out[0].level).toBe(1)
    expect(out[0].parentId).toBeNull()
    expect(out[0].order).toBe(0)
  })

  it('filhos recebem "1.1", "1.2", "1.3" na ordem do array', () => {
    const out = recomputeNodeCodes([
      n('r', 'Projeto', [n('a', 'A'), n('b', 'B'), n('c', 'C')]),
    ])
    expect(out[0].children.map(c => c.code)).toEqual(['1.1', '1.2', '1.3'])
    expect(out[0].children[0].parentId).toBe('r')
    expect(out[0].children[1].level).toBe(2)
    expect(out[0].children[1].order).toBe(1)
  })

  it('netos recebem "1.1.1", "1.1.2", "1.1.3"', () => {
    const out = recomputeNodeCodes(plainTree())
    const r = out[0]
    expect(r.code).toBe('1')
    expect(r.children[0].code).toBe('1.1')
    expect(r.children[0].children.map(c => c.code)).toEqual(['1.1.1', '1.1.2', '1.1.3'])
    expect(r.children[0].children[0].parentId).toBe('a')
    expect(r.children[0].children[0].level).toBe(3)
  })

  it('ignora code/level/parentId/order enviados pelo cliente (autoridade do servidor)', () => {
    const dirty: EapNode = {
      id: 'r',
      parentId: 'hacker',
      code: '9.9.9',
      title: 'Projeto',
      level: 99,
      order: 5,
      children: [
        { id: 'a', parentId: 'x', code: 'zzz', title: 'A', level: 0, order: 7, children: [] },
      ],
    }
    const out = recomputeNodeCodes([dirty])
    expect(out[0].code).toBe('1')
    expect(out[0].parentId).toBeNull()
    expect(out[0].level).toBe(1)
    expect(out[0].order).toBe(0)
    expect(out[0].children[0].code).toBe('1.1')
  })

  it('múltiplas raízes (caso extremo) recebem "1" e "2"', () => {
    const out = recomputeNodeCodes([n('r1', 'A'), n('r2', 'B')])
    expect(out.map(x => x.code)).toEqual(['1', '2'])
  })

  it('descartar campos extras preserva apenas o essencial', () => {
    const weird = { ...n('r', 'Projeto'), extra: 'lixo', children: [] }
    const out = recomputeNodeCodes([weird as unknown as EapNode])
    expect(out[0]).toEqual({ id: 'r', parentId: null, code: '1', title: 'Projeto', level: 1, order: 0, children: [] })
    expect('extra' in out[0]).toBe(false)
  })
})

describe('countNodes / maxDepth / flattenTree / findNode / collectSubtreeIds', () => {
  const tree = plainTree()

  it('conta todos os nós', () => {
    expect(countNodes(tree)).toBe(1 + 3 + 6) // raiz + 3 fases + 6 pacotes
  })

  it('profundidade máxima (raiz = 1)', () => {
    expect(maxDepth(tree)).toBe(3)
    expect(maxDepth(recomputeNodeCodes([n('r', 'x')]))).toBe(1)
  })

  it('flattenTree percorre em pré-ordem', () => {
    const ids = flattenTree(tree).map(x => x.id)
    expect(ids).toEqual(['r', 'a', 'aa', 'ab', 'ac', 'b', 'ba', 'bb', 'c', 'ca'])
  })

  it('findNode acha em qualquer profundidade', () => {
    expect(findNode(tree, 'aa')?.title).toBe('Pacote A1')
    expect(findNode(tree, 'nada')).toBeNull()
  })

  it('collectSubtreeIds inclui o próprio nó e todos os descendentes', () => {
    const ids = collectSubtreeIds(tree, 'a')
    expect(ids.has('a')).toBe(true)
    expect(ids.has('aa')).toBe(true)
    expect(ids.has('ab')).toBe(true)
    expect(ids.has('ac')).toBe(true)
    expect(ids.has('r')).toBe(false)
    expect(ids.has('b')).toBe(false)
  })
})