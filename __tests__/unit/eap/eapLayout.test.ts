import { describe, it, expect } from 'vitest'
import {
  computeEapLayout,
  fitScale,
  EAP_BOX_W,
  EAP_BOX_H,
  EAP_GAP_X,
  EAP_GAP_Y,
} from '@/lib/eapLayout'
import type { EapNode } from '@/types/eap'

function n(id: string, title: string, children: EapNode[] = []): EapNode {
  return { id, parentId: null, code: '', title, level: 1, order: 0, children }
}

function plainTree(): EapNode[] {
  return [
    n('r', 'Projeto', [
      n('f1', 'Fase A', [n('p11', 'Pacote A1'), n('p12', 'Pacote A2'), n('p13', 'Pacote A3')]),
      n('f2', 'Fase B', [n('p21', 'Pacote B1'), n('p22', 'Pacote B2')]),
      n('f3', 'Fase C', [n('p31', 'Pacote C1')]),
    ]),
  ]
}

/** True se os dois retângulos se sobrepõem (com folga de 0). */
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

describe('computeEapLayout', () => {
  it('árvore vazia → geometria e conectores vazios, bounds zerados', () => {
    expect(computeEapLayout([])).toEqual({ geometry: {}, connectors: [], bounds: { width: 0, height: 0 } })
  })

  it('raiz única: box no canto superior esquerdo, marcada isRoot, sem conectores', () => {
    const { geometry, connectors, bounds } = computeEapLayout([n('r', 'Projeto')])
    expect(Object.keys(geometry)).toEqual(['r'])
    expect(geometry.r).toMatchObject({ x: 0, y: 0, width: EAP_BOX_W, height: EAP_BOX_H, isRoot: true })
    expect(connectors).toEqual([])
    expect(bounds).toEqual({ width: EAP_BOX_W, height: EAP_BOX_H })
  })

  it('um conector por filho (cotovelo: V → H → V) terminando no topo do filho', () => {
    const tree = [n('r', 'Projeto', [n('a', 'A'), n('b', 'B')])]
    const { connectors } = computeEapLayout(tree)

    expect(connectors).toHaveLength(2)
    // A raiz tem subárvore de 340 (2 filhos) → sua caixa fica centrada sobre a
    // extensão dos filhos: root x = 340/2 − 150/2 = 95, pCx = 170.
    // Filhos: regiões [0, 340] → centros 75 e 265 (caixas em x=0 e x=190).
    const pCx = EAP_BOX_W + EAP_GAP_X / 2
    const midY = EAP_BOX_H + EAP_GAP_Y / 2
    const childY = EAP_BOX_H + EAP_GAP_Y
    const childCx1 = EAP_BOX_W / 2
    const childCx2 = pCx + EAP_BOX_W / 2 + EAP_GAP_X / 2

    expect(connectors[0]).toEqual({
      fromId: 'r',
      toId: 'a',
      path: `M ${pCx} ${EAP_BOX_H} V ${midY} H ${childCx1} V ${childY}`,
    })
    expect(connectors[1]).toMatchObject({ fromId: 'r', toId: 'b' })
    expect(connectors[1].path).toBe(`M ${pCx} ${EAP_BOX_H} V ${midY} H ${childCx2} V ${childY}`)
  })

  it('filhos de mesma largura de subárvore ficam centralizados sob o pai', () => {
    const tree = [n('r', 'Projeto', [n('a', 'A', [n('aa', 'AA')]), n('b', 'B', [n('bb', 'BB')])])]
    const { geometry } = computeEapLayout(tree)

    const pCx = geometry.r.x + EAP_BOX_W / 2
    const centerA = geometry.a.x + EAP_BOX_W / 2
    const centerB = geometry.b.x + EAP_BOX_W / 2
    expect((centerA + centerB) / 2).toBeCloseTo(pCx, 6)

    // Filho único centrado sob o pai.
    expect(geometry.aa.x + EAP_BOX_W / 2).toBeCloseTo(centerA, 6)
    expect(geometry.bb.x + EAP_BOX_W / 2).toBeCloseTo(centerB, 6)
  })

  it('com subárvores de larguras diferentes, o pai fica centrado sobre a extensão total dos filhos', () => {
    const tree = [n('r', 'Projeto', [n('a', 'A', [n('aa', 'AA'), n('ab', 'AB')]), n('b', 'B')])]
    const { geometry } = computeEapLayout(tree)

    const r = geometry.r
    const pCx = r.x + EAP_BOX_W / 2
    // a tem subárvore de 340 (2 filhos) e b de 150 → extensão total 530+gap.
    const wA = 2 * EAP_BOX_W + EAP_GAP_X
    const wB = EAP_BOX_W
    const regionLeft = pCx - (wA + EAP_GAP_X + wB) / 2
    const regionRight = pCx + (wA + EAP_GAP_X + wB) / 2

    // O centro do bloco de cada filho coincide com o centro da subárvore dele.
    expect(geometry.a.x + EAP_BOX_W / 2).toBeCloseTo(regionLeft + wA / 2, 6)
    expect(geometry.b.x + EAP_BOX_W / 2).toBeCloseTo(regionRight - wB / 2, 6)
    // A extensão dos filhos é simétrica em torno do centro do pai.
    expect((regionLeft + regionRight) / 2).toBeCloseTo(pCx, 6)
  })

  it('filhos de um nó estão sempre uma linha abaixo (y = pai + BOX_H + GAP_Y)', () => {
    const { geometry } = computeEapLayout(plainTree())
    expect(geometry.f1.y).toBe(geometry.r.y + EAP_BOX_H + EAP_GAP_Y)
    expect(geometry.p11.y).toBe(geometry.f1.y + EAP_BOX_H + EAP_GAP_Y)
  })

  it('nenhum par de blocos se sobrepõe (árvore do SPEC §26)', () => {
    const tree = plainTree()
    const { geometry } = computeEapLayout(tree)
    const boxes = Object.values(geometry)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i], boxes[j])).toBe(false)
      }
    }
  })

  it('um conector para cada nó não-raiz e isRoot apenas na raiz', () => {
    const { geometry, connectors } = computeEapLayout(plainTree())
    expect(connectors).toHaveLength(9) // 10 nós − 1 raiz
    for (const [id, g] of Object.entries(geometry)) {
      expect(g.isRoot).toBe(id === 'r')
    }
  })

  it('bounds cobrem o retângulo mais à direita e mais abaixo', () => {
    const { geometry, bounds } = computeEapLayout(plainTree())
    const maxRight = Math.max(...Object.values(geometry).map(g => g.x + g.width))
    const maxBottom = Math.max(...Object.values(geometry).map(g => g.y + g.height))
    expect(bounds.width).toBeGreaterThanOrEqual(maxRight)
    expect(bounds.height).toBeGreaterThanOrEqual(maxBottom)
    expect(bounds.height).toBe(maxBottom)
  })
})

describe('fitScale', () => {
  it('reduz quando a árvore é maior que a área disponível (usa o menor fator)', () => {
    // Largura folgada, altura apertada.
    expect(fitScale(1000, 2000, 1000, 1000)).toBe(0.5)
    // Altura folgada, largura apertada.
    expect(fitScale(2000, 1000, 1000, 1000)).toBe(0.5)
    // Mais estreito em largura ainda.
    expect(fitScale(200, 1000, 100, 1000)).toBe(0.5)
  })

  it('nunca amplia (escala ≤ 1)', () => {
    expect(fitScale(100, 100, 1000, 1000)).toBe(1)
    expect(fitScale(100, 100, 200, 100)).toBe(1)
  })

  it('dimensões zeradas/negativas → 1 (sem divisão inválida)', () => {
    expect(fitScale(0, 100, 1000, 1000)).toBe(1)
    expect(fitScale(100, 0, 1000, 1000)).toBe(1)
    expect(fitScale(-5, 100, 1000, 1000)).toBe(1)
  })
})