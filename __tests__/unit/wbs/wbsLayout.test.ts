import { describe, it, expect } from 'vitest'
import { computeLayout, resolveDropPosition, NODE_W, NODE_H, GAP_X, GAP_Y, GAP_STACK, indentDe, PILL_OVERHANG } from '@/lib/wbsLayout'
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
  layout: WbsLayoutOrientation = 'DIREITA',
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

  // ── Direita (organizar-direita.svg) ───────────────────────────────────────

  describe('DIREITA', () => {
    const make = () => ({
      r: node('r', null, 0, ['a', 'b'], 'DIREITA'),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
    })

    it('recuo na proporção do ícone: filho começa a 11/12 da largura do pai', () => {
      expect(NODE_W / 2 + indentDe(NODE_W)).toBe(Math.round(NODE_W * 11 / 12))
    })

    it('pai no topo à esquerda; filhos empilhados à direita da linha que desce do centro do pai', () => {
      const { geometry } = computeLayout(make(), 'r')
      expect(geometry.r).toMatchObject({ x: 0, y: 0 })
      const spineX = NODE_W / 2
      expect(geometry.a.x).toBe(spineX + indentDe(NODE_W))
      expect(geometry.b.x).toBe(spineX + indentDe(NODE_W))
      expect(geometry.a.y).toBe(NODE_H + GAP_Y / 2)
      expect(geometry.b.y).toBe(geometry.a.y + NODE_H + GAP_STACK)
    })

    it('conector desce do centro inferior do pai e entra na borda esquerda do filho', () => {
      const { geometry, connectors } = computeLayout(make(), 'r')
      const c = connectors.find(x => x.toId === 'b')!
      expect(c.path).toBe(`M ${NODE_W / 2} ${NODE_H} V ${geometry.b.y + NODE_H / 2} H ${geometry.b.x}`)
    })
  })

  // ── Esquerda (organizar-esquerda.svg) ─────────────────────────────────────

  describe('ESQUERDA', () => {
    it('espelho da Direita: pai à direita, filhos à esquerda da linha, ramal na borda direita', () => {
      const nodes = {
        r: node('r', null, 0, ['a', 'b'], 'ESQUERDA'),
        a: node('a', 'r', 0, []),
        b: node('b', 'r', 1, []),
      }
      const { geometry, connectors } = computeLayout(nodes, 'r')
      const spineX = geometry.r.x + NODE_W / 2
      expect(geometry.a.x + NODE_W).toBe(spineX - indentDe(NODE_W))
      expect(geometry.r.x).toBeGreaterThan(geometry.a.x)
      expect(geometry.a.x).toBe(0)
      const c = connectors.find(x => x.toId === 'a')!
      expect(c.path).toBe(`M ${spineX} ${NODE_H} V ${geometry.a.y + NODE_H / 2} H ${geometry.a.x + NODE_W}`)
    })
  })

  // ── Horizontais (organizar-horizontal-*.svg) ──────────────────────────────

  describe('horizontais', () => {
    const make = (layout: WbsLayoutOrientation) => ({
      r: node('r', null, 0, ['a', 'b', 'c'], layout),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
      c: node('c', 'r', 2, []),
    })
    const centro = (g: { y: number }) => g.y + NODE_H / 2

    it('filhos em coluna à direita do pai, com GAP_X', () => {
      const { geometry } = computeLayout(make('HORIZONTAL'), 'r')
      for (const id of ['a', 'b', 'c']) expect(geometry[id].x).toBe(NODE_W + GAP_X)
      expect(geometry.a.y).toBe(0)
      expect(geometry.b.y).toBe(NODE_H + GAP_STACK)
    })

    it('Horizontal: pai centralizado entre o primeiro e o último filho', () => {
      const { geometry } = computeLayout(make('HORIZONTAL'), 'r')
      expect(centro(geometry.r)).toBe((centro(geometry.a) + centro(geometry.c)) / 2)
    })

    it('Horizontal (topo): pai alinhado ao primeiro filho', () => {
      const { geometry } = computeLayout(make('HORIZONTAL_TOPO'), 'r')
      expect(centro(geometry.r)).toBe(centro(geometry.a))
    })

    it('Horizontal (base): pai alinhado ao último filho', () => {
      const { geometry } = computeLayout(make('HORIZONTAL_BASE'), 'r')
      expect(centro(geometry.r)).toBe(centro(geometry.c))
      expect(geometry.r.y).toBeGreaterThan(0)
    })

    it('conector sai do meio-direito do pai, passa pela linha vertical e entra na borda esquerda do filho', () => {
      const { geometry, connectors } = computeLayout(make('HORIZONTAL'), 'r')
      const spineX = NODE_W + GAP_X / 2
      const c = connectors.find(x => x.toId === 'c')!
      expect(c.path).toBe(`M ${NODE_W} ${centro(geometry.r)} H ${spineX} V ${centro(geometry.c)} H ${NODE_W + GAP_X}`)
    })

    it('filho horizontal com netos: a subárvore inteira cabe sem sobrepor o irmão de baixo', () => {
      const nodes = {
        r: node('r', null, 0, ['a', 'b'], 'HORIZONTAL'),
        a: node('a', 'r', 0, ['a1', 'a2', 'a3'], 'HORIZONTAL_BASE'),
        a1: node('a1', 'a', 0, []), a2: node('a2', 'a', 1, []), a3: node('a3', 'a', 2, []),
        b: node('b', 'r', 1, []),
      }
      const { geometry } = computeLayout(nodes, 'r')
      expect(geometry.b.y).toBeGreaterThanOrEqual(geometry.a3.y + NODE_H + GAP_STACK)
      expect(centro(geometry.a)).toBe(centro(geometry.a3))
    })
  })

  it('valor antigo ("ABAIXO") é desenhado como Direita, sem perder filhos', () => {
    const nodes = {
      r: node('r', null, 0, ['a'], 'ABAIXO' as WbsLayoutOrientation),
      a: node('a', 'r', 0, []),
    }
    const { geometry } = computeLayout(nodes, 'r')
    expect(geometry.a).toMatchObject({ x: NODE_W / 2 + indentDe(NODE_W), y: NODE_H + GAP_Y / 2 })
  })

  it('LADO_A_LADO largo (5 filhos) — nenhum par se sobrepõe', () => {
    const nodes = {
      r: node('r', null, 0, ['a', 'b', 'c', 'd', 'e'], 'LADO_A_LADO'),
      a: node('a', 'r', 0, []),
      b: node('b', 'r', 1, []),
      c: node('c', 'r', 2, []),
      d: node('d', 'r', 3, []),
      e: node('e', 'r', 4, []),
    }
    const { geometry } = computeLayout(nodes, 'r')
    const xs = ['a', 'b', 'c', 'd', 'e'].map(id => geometry[id].x)
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1] + NODE_W)
    }
  })

  // ── Colapsado ────────────────────────────────────────────────────────────────

  describe('collapsed', () => {
    it('nó colapsado não gera filhos na geometria', () => {
      const nodes = {
        r: node('r', null, 0, ['a'], 'DIREITA'),
        a: { ...node('a', 'r', 0, ['aa']), collapsed: true },
        aa: node('aa', 'a', 0, []),
      }
      const { geometry } = computeLayout(nodes, 'r')
      expect(geometry.a).toBeDefined()
      expect(geometry.aa).toBeUndefined()
    })

    it('nó colapsado não gera conectores para seus filhos', () => {
      const nodes = {
        r: node('r', null, 0, ['a'], 'DIREITA'),
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
    it('pai DIREITA com filho LADO_A_LADO: netos ficam lado a lado', () => {
      const nodes = {
        r: node('r', null, 0, ['a'], 'DIREITA'),
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
    // O bounds reserva a área da pílula de colapso que fica meio para fora do card.
    expect(bounds.height).toBe(maxBottom + PILL_OVERHANG)
  })
})

describe('resolveDropPosition', () => {
  const g = { x: 100, y: 200, width: 160, height: NODE_H }
  const midX = g.x + g.width / 2
  const midY = g.y + g.height / 2

  it('corpo do card → INSIDE (filho)', () => {
    expect(resolveDropPosition(midX, midY, g)).toBe('INSIDE')
  })

  it('abaixo do card (faixa de filhos) → INSIDE', () => {
    expect(resolveDropPosition(midX, g.y + g.height + 10, g)).toBe('INSIDE')
  })

  it('borda esquerda → BEFORE (irmão antes)', () => {
    expect(resolveDropPosition(g.x + 5, midY, g)).toBe('BEFORE')
  })

  it('borda direita → AFTER (irmão depois)', () => {
    expect(resolveDropPosition(g.x + g.width - 5, midY, g)).toBe('AFTER')
  })

  it('fora de qualquer zona → null', () => {
    expect(resolveDropPosition(midX, g.y - 40, g)).toBeNull()
    expect(resolveDropPosition(g.x + g.width + 40, midY, g)).toBeNull()
    expect(resolveDropPosition(midX, g.y + g.height + 40, g)).toBeNull()
  })
})

it('mixed layouts keep every subtree inside bounds with wide cards and taller details', () => {
  const nodes: Record<string, WbsNodeClient> = {}, widths: Record<string, number> = {}
  const layouts: WbsLayoutOrientation[] = ['LADO_A_LADO','DIREITA','ESQUERDA','HORIZONTAL','HORIZONTAL_TOPO','HORIZONTAL_BASE']
  for (let i=0;i<60;i++) {
    const id=String(i), parent=i===0?null:String(Math.floor((i-1)/3))
    nodes[id]=node(id,parent,i,[],layouts[(i*7)%6]); widths[id]=120+(i%5)*70
    if(parent)nodes[parent].childrenIds.push(id)
  }
  const { geometry, bounds } = computeLayout(nodes,'0',widths,162)
  const cards=Object.values(geometry)
  for(const [i,a] of cards.entries()) {
    expect(a.x).toBeGreaterThanOrEqual(0)
    expect(a.y).toBeGreaterThanOrEqual(0)
    expect(a.x+a.width).toBeLessThanOrEqual(bounds.width)
    expect(a.y+a.height).toBeLessThanOrEqual(bounds.height)
    for(const b of cards.slice(i+1)) {
      const overlap=a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y
      expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false)
    }
  }
})
