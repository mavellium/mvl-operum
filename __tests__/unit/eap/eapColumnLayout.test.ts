import { describe, it, expect } from 'vitest'
import {
  computeEapColumnLayout, eapBoxLabel, eapWrapLines,
  EAP_COL_BOX_W, EAP_COL_INDENT, EAP_COL_MAX_LINES,
} from '@/lib/eapLayout'
import type { EapNode } from '@/types/eap'

function n(id: string, code: string, title: string, children: EapNode[] = []): EapNode {
  return { id, parentId: null, code, title, level: code.split('.').length, order: 0, children }
}

const tree = (): EapNode[] => [
  n('r', '1', 'Educação de Idiomas para Autistas', [
    n('a', '1.1', 'Apresentação', [
      n('a1', '1.1.1', 'Tema central', [n('a11', '1.1.1.1', 'Ensino de inglês'), n('a12', '1.1.1.2', 'Educação inclusiva')]),
      n('a2', '1.1.2', 'Problema de pesquisa'),
    ]),
    n('b', '1.2', 'Justificativa', [n('b1', '1.2.1', 'Relevância social')]),
    n('c', '1.3', 'Público-alvo'),
  ]),
]

describe('computeEapColumnLayout (modelo da EAP gráfica)', () => {
  it('árvore vazia → nada', () => {
    expect(computeEapColumnLayout([])).toEqual({ geometry: {}, connectors: [], bounds: { width: 0, height: 0 } })
  })

  it('nível 2 fica lado a lado, na mesma altura, abaixo da raiz', () => {
    const { geometry } = computeEapColumnLayout(tree())
    const [a, b, c] = [geometry.a, geometry.b, geometry.c]
    expect(a.y).toBe(b.y)
    expect(b.y).toBe(c.y)
    expect(a.y).toBeGreaterThan(geometry.r.y + geometry.r.height)
    expect(a.x).toBeLessThan(b.x)
    expect(b.x).toBeLessThan(c.x)
    expect(geometry.r.isRoot).toBe(true)
  })

  it('descendentes do nível 2 ficam empilhados em coluna, em pré-ordem, com recuo', () => {
    const { geometry } = computeEapColumnLayout(tree())
    const coluna = ['a1', 'a11', 'a12', 'a2'].map(id => geometry[id])
    for (const g of coluna) {
      expect(g.x).toBe(geometry.a.x + EAP_COL_INDENT)
      expect(g.width).toBe(EAP_COL_BOX_W)
    }
    for (let i = 1; i < coluna.length; i++) expect(coluna[i].y).toBeGreaterThan(coluna[i - 1].y + coluna[i - 1].height)
    expect(coluna[0].y).toBeGreaterThan(geometry.a.y + geometry.a.height)
  })

  it('cada bloco tem um conector e as colunas não se sobrepõem', () => {
    const { geometry, connectors, bounds } = computeEapColumnLayout(tree())
    expect(connectors).toHaveLength(Object.keys(geometry).length - 1)
    expect(geometry.b.x).toBeGreaterThanOrEqual(geometry.a1.x + EAP_COL_BOX_W)
    for (const g of Object.values(geometry)) {
      expect(g.x + g.width).toBeLessThanOrEqual(bounds.width)
      expect(g.y + g.height).toBeLessThanOrEqual(bounds.height)
    }
  })
})

describe('rótulo e quebra do bloco', () => {
  it('raiz mostra só o título; os demais, "código título"', () => {
    const [r] = tree()
    expect(eapBoxLabel(r, true)).toBe('Educação de Idiomas para Autistas')
    expect(eapBoxLabel(r.children[0], false)).toBe('1.1 Apresentação')
  })

  it('limita o número de linhas com reticências', () => {
    const lines = eapWrapLines('palavra '.repeat(60), 20)
    expect(lines).toHaveLength(EAP_COL_MAX_LINES)
    expect(lines.at(-1)!.endsWith('…')).toBe(true)
    expect(eapWrapLines('curto')).toEqual(['curto'])
  })
})
