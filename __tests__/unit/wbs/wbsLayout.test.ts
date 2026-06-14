import { describe, it, expect } from 'vitest'
import { computeLayout, NODE_W, NODE_H, GAP_X, GAP_Y } from '@/lib/wbsLayout'
import type { WbsNodeClient, WbsLayoutOrientation } from '@/types/wbs'

const S = {
  backgroundColor: '#fff', borderColor: '#000', textColor: '#000',
  borderWidth: 1, fontSize: 14, borderRadius: 4,
}

function node(
  id: string,
  parentId: string | null,
  order: number,
  childrenIds: string[],
  layout: WbsLayoutOrientation = 'ABAIXO',
  collapsed = false
): WbsNodeClient {
  return { id, parentId, order, code: '', title: id, layout, collapsed, style: S, properties: {}, childrenIds }
}

describe('computeLayout', () => {
  it('retorna estruturas vazias para rootId null', () => {
    const r = computeLayout({}, null)
    expect(r.geometry).toEqual({})
    expect(r.connectors).toEqual([])
    expect(r.bounds).toEqual({ width: 0, height: 0 })
  })

  it('nó único fica em (0, 0)', () => {
    const { geometry } = computeLayout({ r: node('r', null, 0, []) }, 'r')
    expect(geometry.r).toMatchObject({ x: 0, y: 0, width: NODE_W, height: NODE_H })
  })

  // ── LADO_A_LADO ─────────────────────────────────────────────────────────────

  describe('LADO_A_LADO', () => {
    const make = () => ({
      r: node('r', null, 0, ['a', 'b'], 'LADO_A_LADO'),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
    })

    it('filhos ficam na mesma linha Y (parent_Y + NODE_H + GAP_Y)', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.a.y).toBe(NODE_H + GAP_Y)
      expect(geometry.b.y).toBe(NODE_H + GAP_Y)
    })

    it('subárvores irmãs não se sobrepõem — b.x >= a.x + NODE_W', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.b.x).toBeGreaterThanOrEqual(geometry.a.x + NODE_W)
    })

    it('gera um conector por filho', () => {
      const { connectors } = computeLayout(make(), 'r')
      expect(connectors).toHaveLength(2)
      expect(connectors.map(c => c.toId).sort()).toEqual(['a', 'b'])
    })

    it('path do conector contém V e H', () => {
      const { connectors } = computeLayout(make(), 'r')
      connectors.forEach(c => {
        expect(c.path).toContain('V')
        expect(c.path).toContain('H')
      })
    })

    it('três filhos — nenhum par se sobrepõe', () => {
      const nodes = {
        r: node('r', null, 0, ['a', 'b', 'c'], 'LADO_A_LADO'),
        a: node('a', 'r', 0, []),
        b: node('b', 'r', 1, []),
        c: node('c', 'r', 2, []),
      }
      const { geometry } = computeLayout(nodes, 'r')
      expect(geometry.b.x).toBeGreaterThanOrEqual(geometry.a.x + NODE_W)
      expect(geometry.c.x).toBeGreaterThanOrEqual(geometry.b.x + NODE_W)
    })
  })

  // ── ABAIXO ──────────────────────────────────────────────────────────────────

  describe('ABAIXO', () => {
    const make = () => ({
      r: node('r', null, 0, ['a', 'b'], 'ABAIXO'),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
    })

    it('primeiro filho está em Y = parent_Y + NODE_H + GAP_Y', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.a.y).toBe(NODE_H + GAP_Y)
    })

    it('empilha filhos verticalmente — b.y > a.y', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.b.y).toBeGreaterThan(geometry.a.y)
    })

    it('filhos ficam na mesma coluna X que o pai', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.a.x).toBe(geometry.r.x)
      expect(geometry.b.x).toBe(geometry.r.x)
    })

    it('path do conector usa apenas V (linha vertical)', () => {
      const { connectors } = computeLayout(make(), 'r')
      connectors.forEach(c => {
        expect(c.path).toContain('V')
        expect(c.path).not.toContain('H')
      })
    })
  })

  // ── ABAIXO_L ────────────────────────────────────────────────────────────────

  describe('ABAIXO_L', () => {
    const make = () => ({
      r: node('r', null, 0, ['a', 'b'], 'ABAIXO_L'),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
    })

    it('filhos deslocados GAP_X à direita do pai', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.a.x).toBe(geometry.r.x + GAP_X)
      expect(geometry.b.x).toBe(geometry.r.x + GAP_X)
    })

    it('empilha verticalmente', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.b.y).toBeGreaterThan(geometry.a.y)
    })

    it('path do conector contém V e H (forma em L)', () => {
      const { connectors } = computeLayout(make(), 'r')
      expect(connectors).toHaveLength(2)
      connectors.forEach(c => {
        expect(c.path).toContain('V')
        expect(c.path).toContain('H')
      })
    })
  })

  // ── Colapsado ────────────────────────────────────────────────────────────────

  describe('collapsed', () => {
    it('nó colapsado não gera filhos na geometria', () => {
      const nodes = {
        r: node('r', null, 0, ['a'], 'ABAIXO'),
        a: { ...node('a', 'r', 0, ['aa']), collapsed: true },
        aa: node('aa', 'a', 0, []),
      }
      const { geometry } = computeLayout(nodes, 'r')
      expect(geometry.a).toBeDefined()
      expect(geometry.aa).toBeUndefined()
    })

    it('nó colapsado não gera conectores para seus filhos', () => {
      const nodes = {
        r: node('r', null, 0, ['a'], 'ABAIXO'),
        a: { ...node('a', 'r', 0, ['aa']), collapsed: true },
        aa: node('aa', 'a', 0, []),
      }
      const { connectors } = computeLayout(nodes, 'r')
      const toAa = connectors.find(c => c.toId === 'aa')
      expect(toAa).toBeUndefined()
    })
  })

  // ── Layout misto ─────────────────────────────────────────────────────────────

  describe('layout misto', () => {
    it('pai ABAIXO com filho LADO_A_LADO: netos ficam lado a lado', () => {
      const nodes = {
        r: node('r', null, 0, ['a'], 'ABAIXO'),
        a: node('a', 'r', 0, ['aa', 'ab'], 'LADO_A_LADO'),
        aa: node('aa', 'a', 0, []),
        ab: node('ab', 'a', 1, []),
      }
      const { geometry } = computeLayout(nodes, 'r')
      // Netos devem estar na mesma linha Y
      expect(geometry.aa.y).toBe(geometry.ab.y)
      // E não se sobrepor
      expect(geometry.ab.x).toBeGreaterThanOrEqual(geometry.aa.x + NODE_W)
    })
  })

  // ── Bounds ───────────────────────────────────────────────────────────────────

  it('bounds refletem a extensão máxima da árvore', () => {
    const nodes = {
      r: node('r', null, 0, ['a', 'b'], 'LADO_A_LADO'),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
    }
    const { geometry, bounds } = computeLayout(nodes, 'r')
    const maxRight = Math.max(...Object.values(geometry).map(g => g.x + NODE_W))
    const maxBottom = Math.max(...Object.values(geometry).map(g => g.y + NODE_H))
    expect(bounds.width).toBe(maxRight)
    expect(bounds.height).toBe(maxBottom)
  })
})
