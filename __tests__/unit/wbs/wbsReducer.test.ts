import { describe, it, expect } from 'vitest'
import { wbsReducer, DEFAULT_STYLE } from '@/lib/wbsReducer'
import type { WbsAction } from '@/lib/wbsReducer'
import type { WbsTreeState, WbsNodeClient } from '@/types/wbs'

type State = WbsTreeState
type Action = WbsAction

function node(
  id: string,
  parentId: string | null,
  order: number,
  childrenIds: string[],
  code = ''
): WbsNodeClient {
  return {
    id, parentId, order, code, title: id,
    layout: 'ABAIXO', collapsed: false,
    style: { ...DEFAULT_STYLE }, properties: {}, childrenIds,
  }
}

function makeState(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null = 'r'
): State {
  return {
    nodes,
    rootId,
    selectedNodeIds: [],
    editingNodeId: null,
    clipboard: { nodes: [], copiedStyle: null, actionType: null },
    history: { past: [], future: [] },
    viewport: { zoom: 1, panX: 0, panY: 0 },
    sync: { status: 'IDLE', lastSavedAt: null, serverVersion: 0 },
  }
}

const act = (s: State, a: Action) => wbsReducer(s, a)

/** ID do nó recém-criado (diff dos mapas). */
function newId(prev: State, next: State): string {
  const prevIds = new Set(Object.keys(prev.nodes))
  return Object.keys(next.nodes).find(id => !prevIds.has(id))!
}

// ── INSERT_CHILD ─────────────────────────────────────────────────────────────

describe('INSERT_CHILD', () => {
  const base = makeState({ r: node('r', null, 0, [], '1') })

  it('cria filho com parentId correto', () => {
    const s = act(base, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s.nodes[newId(base, s)].parentId).toBe('r')
  })

  it('filho recebe order=0 quando pai vazio', () => {
    const s = act(base, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s.nodes[newId(base, s)].order).toBe(0)
  })

  it('filho recebe code "1.1"', () => {
    const s = act(base, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s.nodes[newId(base, s)].code).toBe('1.1')
  })

  it('segundo filho recebe code "1.2"', () => {
    const s1 = act(base, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    const s2 = act(s1, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s2.nodes[s2.nodes.r.childrenIds[1]].code).toBe('1.2')
  })

  it('pai atualiza childrenIds', () => {
    const s = act(base, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s.nodes.r.childrenIds).toHaveLength(1)
  })

  it('empilha no history', () => {
    const s = act(base, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s.history.past).toHaveLength(1)
  })

  it('ignora parentId inexistente', () => {
    const s = act(base, { type: 'INSERT_CHILD', payload: { parentId: 'ghost' } })
    expect(s).toBe(base)
  })
})

// ── INSERT_SIBLING ───────────────────────────────────────────────────────────

describe('INSERT_SIBLING', () => {
  const base = makeState({
    r: node('r', null, 0, ['a'], '1'),
    a: node('a', 'r', 0, [], '1.1'),
  })

  it('novo irmão inserido após o selecionado (order=1)', () => {
    const s = act(base, { type: 'INSERT_SIBLING', payload: { siblingId: 'a' } })
    expect(s.nodes[newId(base, s)].order).toBe(1)
  })

  it('novo irmão recebe code "1.2"', () => {
    const s = act(base, { type: 'INSERT_SIBLING', payload: { siblingId: 'a' } })
    expect(s.nodes[newId(base, s)].code).toBe('1.2')
  })

  it('irmãos posteriores têm orders reajustados', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
    })
    const s = act(s0, { type: 'INSERT_SIBLING', payload: { siblingId: 'a' } })
    expect(s.nodes.b.order).toBe(2)
    expect(s.nodes.b.code).toBe('1.3')
  })

  it('não insere irmão da raiz', () => {
    const s0 = makeState({ r: node('r', null, 0, [], '1') })
    expect(act(s0, { type: 'INSERT_SIBLING', payload: { siblingId: 'r' } })).toBe(s0)
  })
})

// ── DELETE_NODE ──────────────────────────────────────────────────────────────

describe('DELETE_NODE', () => {
  it('remove o nó do mapa', () => {
    const s0 = makeState({ r: node('r', null, 0, ['a'], '1'), a: node('a', 'r', 0, [], '1.1') })
    expect(act(s0, { type: 'DELETE_NODE', payload: { nodeId: 'a' } }).nodes.a).toBeUndefined()
  })

  it('cascata: remove subárvore inteira', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a'], '1'),
      a: node('a', 'r', 0, ['aa'], '1.1'),
      aa: node('aa', 'a', 0, [], '1.1.1'),
    })
    const s = act(s0, { type: 'DELETE_NODE', payload: { nodeId: 'a' } })
    expect(s.nodes.a).toBeUndefined()
    expect(s.nodes.aa).toBeUndefined()
  })

  it('renumera irmãos remanescentes sem lacunas', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b', 'c'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
      c: node('c', 'r', 2, [], '1.3'),
    })
    const s = act(s0, { type: 'DELETE_NODE', payload: { nodeId: 'b' } })
    expect(s.nodes.c.order).toBe(1)
    expect(s.nodes.c.code).toBe('1.2')
    expect(s.nodes.a.order).toBe(0)
  })

  it('atualiza childrenIds do pai', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
    })
    const s = act(s0, { type: 'DELETE_NODE', payload: { nodeId: 'a' } })
    expect(s.nodes.r.childrenIds).toEqual(['b'])
  })

  it('ignora nodeId inexistente', () => {
    const s0 = makeState({ r: node('r', null, 0, [], '1') })
    expect(act(s0, { type: 'DELETE_NODE', payload: { nodeId: 'ghost' } })).toBe(s0)
  })

  it('regressão lexical: 11 irmãos → delete do 6º → renumeração numérica', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `c${i}`)
    const children = ids.reduce<Record<string, WbsNodeClient>>((acc, id, i) => {
      acc[id] = node(id, 'r', i, [], `1.${i + 1}`)
      return acc
    }, {})
    const s0 = makeState({ r: node('r', null, 0, ids, '1'), ...children })
    const s = act(s0, { type: 'DELETE_NODE', payload: { nodeId: 'c5' } })
    expect(s.nodes.c6.order).toBe(5)
    expect(s.nodes.c6.code).toBe('1.6')
    expect(s.nodes.c10.order).toBe(9)
    expect(s.nodes.c10.code).toBe('1.10')
  })
})

// ── MOVE_NODE ────────────────────────────────────────────────────────────────

describe('MOVE_NODE', () => {
  it('rejeita ciclo: target é descendente do nó', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a'], '1'),
      a: node('a', 'r', 0, ['aa'], '1.1'),
      aa: node('aa', 'a', 0, [], '1.1.1'),
    })
    expect(act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'a', targetId: 'aa', position: 'INSIDE' } })).toBe(s0)
  })

  it('rejeita mover nó para ele mesmo', () => {
    const s0 = makeState({ r: node('r', null, 0, ['a'], '1'), a: node('a', 'r', 0, [], '1.1') })
    expect(act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'a', targetId: 'a', position: 'INSIDE' } })).toBe(s0)
  })

  it('INSIDE: nó vira filho do target', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
    })
    const s = act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'a', targetId: 'b', position: 'INSIDE' } })
    expect(s.nodes.a.parentId).toBe('b')
    expect(s.nodes.b.childrenIds).toContain('a')
  })

  it('BEFORE: reordena corretamente', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b', 'c'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
      c: node('c', 'r', 2, [], '1.3'),
    })
    // c BEFORE a → [c, a, b]
    const s = act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'c', targetId: 'a', position: 'BEFORE' } })
    expect(s.nodes.c.order).toBe(0)
    expect(s.nodes.a.order).toBe(1)
    expect(s.nodes.b.order).toBe(2)
  })

  it('AFTER: reordena corretamente', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b', 'c'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
      c: node('c', 'r', 2, [], '1.3'),
    })
    // a AFTER c → [b, c, a]
    const s = act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'a', targetId: 'c', position: 'AFTER' } })
    expect(s.nodes.a.order).toBe(2)
    expect(s.nodes.b.order).toBe(0)
    expect(s.nodes.c.order).toBe(1)
  })

  it('codes recalculados após mover', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
    })
    const s = act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'b', targetId: 'a', position: 'INSIDE' } })
    expect(s.nodes.b.code).toBe('1.1.1')
  })

  it('pai original tem orders recompactadas', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b', 'c'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, ['ba'], '1.2'),
      c: node('c', 'r', 2, [], '1.3'),
      ba: node('ba', 'b', 0, [], '1.2.1'),
    })
    const s = act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'a', targetId: 'b', position: 'INSIDE' } })
    expect(s.nodes.r.childrenIds).toEqual(['b', 'c'])
    expect(s.nodes.b.order).toBe(0)
    expect(s.nodes.c.order).toBe(1)
  })

  it('empilha no history', () => {
    const s0 = makeState({
      r: node('r', null, 0, ['a', 'b'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
    })
    const s = act(s0, { type: 'MOVE_NODE', payload: { nodeId: 'a', targetId: 'b', position: 'INSIDE' } })
    expect(s.history.past).toHaveLength(1)
  })
})

// ── PASTE_STYLE ──────────────────────────────────────────────────────────────

describe('PASTE_STYLE', () => {
  it('aplica estilo copiado, preserva title e properties', () => {
    const src: WbsNodeClient = {
      ...node('a', 'r', 0, [], '1.1'),
      title: 'Meu título',
      properties: { cost: 999 },
    }
    const s: State = {
      ...makeState({ r: node('r', null, 0, ['a'], '1'), a: src }),
      clipboard: { nodes: [], copiedStyle: { ...DEFAULT_STYLE, backgroundColor: '#ff0000' }, actionType: null },
    }
    const result = act(s, { type: 'PASTE_STYLE', payload: { nodeIds: ['a'] } })
    expect(result.nodes.a.style.backgroundColor).toBe('#ff0000')
    expect(result.nodes.a.title).toBe('Meu título')
    expect(result.nodes.a.properties.cost).toBe(999)
  })

  it('aplica a múltiplos nós', () => {
    const s: State = {
      ...makeState({
        r: node('r', null, 0, ['a', 'b'], '1'),
        a: node('a', 'r', 0, [], '1.1'),
        b: node('b', 'r', 1, [], '1.2'),
      }),
      clipboard: { nodes: [], copiedStyle: { ...DEFAULT_STYLE, backgroundColor: '#0000ff' }, actionType: null },
    }
    const result = act(s, { type: 'PASTE_STYLE', payload: { nodeIds: ['a', 'b'] } })
    expect(result.nodes.a.style.backgroundColor).toBe('#0000ff')
    expect(result.nodes.b.style.backgroundColor).toBe('#0000ff')
  })

  it('não faz nada se copiedStyle for null', () => {
    const s = makeState({ r: node('r', null, 0, [], '1') })
    expect(act(s, { type: 'PASTE_STYLE', payload: { nodeIds: ['r'] } })).toBe(s)
  })
})

// ── UNDO / REDO ──────────────────────────────────────────────────────────────

describe('UNDO / REDO', () => {
  it('UNDO restaura estado anterior', () => {
    const s0 = makeState({ r: node('r', null, 0, [], '1') })
    const s1 = act(s0, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    const u = act(s1, { type: 'UNDO' })
    expect(Object.keys(u.nodes)).toHaveLength(1)
    expect(u.nodes.r.childrenIds).toHaveLength(0)
  })

  it('REDO restaura estado forward', () => {
    const s0 = makeState({ r: node('r', null, 0, [], '1') })
    const s1 = act(s0, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    const u = act(s1, { type: 'UNDO' })
    const r = act(u, { type: 'REDO' })
    expect(Object.keys(r.nodes)).toHaveLength(2)
  })

  it('múltiplos UNDOs funcionam', () => {
    const s0 = makeState({ r: node('r', null, 0, [], '1') })
    const s1 = act(s0, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    const s2 = act(s1, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    const u2 = act(act(s2, { type: 'UNDO' }), { type: 'UNDO' })
    expect(Object.keys(u2.nodes)).toHaveLength(1)
  })

  it('UNDO sem history não modifica estado', () => {
    const s = makeState({ r: node('r', null, 0, [], '1') })
    expect(act(s, { type: 'UNDO' })).toBe(s)
  })

  it('REDO sem future não modifica estado', () => {
    const s = makeState({ r: node('r', null, 0, [], '1') })
    expect(act(s, { type: 'REDO' })).toBe(s)
  })

  it('nova ação após UNDO limpa o future', () => {
    const s0 = makeState({ r: node('r', null, 0, [], '1') })
    const s1 = act(s0, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    const u = act(s1, { type: 'UNDO' })
    const s2 = act(u, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s2.history.future).toHaveLength(0)
  })
})

// ── Imutabilidade ─────────────────────────────────────────────────────────────

describe('imutabilidade', () => {
  it('INSERT_CHILD não muta o estado anterior', () => {
    const s = makeState({ r: node('r', null, 0, [], '1') })
    const origNodes = s.nodes
    act(s, { type: 'INSERT_CHILD', payload: { parentId: 'r' } })
    expect(s.nodes).toBe(origNodes)
    expect(s.nodes.r.childrenIds).toHaveLength(0)
  })

  it('DELETE_NODE não muta o estado anterior', () => {
    const s = makeState({ r: node('r', null, 0, ['a'], '1'), a: node('a', 'r', 0, [], '1.1') })
    act(s, { type: 'DELETE_NODE', payload: { nodeId: 'a' } })
    expect(s.nodes.a).toBeDefined()
  })

  it('MOVE_NODE não muta o estado anterior', () => {
    const s = makeState({
      r: node('r', null, 0, ['a', 'b'], '1'),
      a: node('a', 'r', 0, [], '1.1'),
      b: node('b', 'r', 1, [], '1.2'),
    })
    const orig = [...s.nodes.r.childrenIds]
    act(s, { type: 'MOVE_NODE', payload: { nodeId: 'a', targetId: 'b', position: 'INSIDE' } })
    expect(s.nodes.r.childrenIds).toEqual(orig)
  })
})

// ── RESET_TREE ────────────────────────────────────────────────────────────────

describe('RESET_TREE', () => {
  it('cria árvore com nó raiz único (code="1")', () => {
    const s = makeState({ r: node('r', null, 0, ['a'], '1'), a: node('a', 'r', 0, [], '1.1') })
    const next = act(s, { type: 'RESET_TREE' })
    expect(Object.keys(next.nodes)).toHaveLength(1)
    expect(next.nodes[next.rootId!].code).toBe('1')
    expect(next.nodes[next.rootId!].parentId).toBeNull()
  })

  it('usa rootTitle customizado', () => {
    const s = makeState({ r: node('r', null, 0, [], '1') })
    const next = act(s, { type: 'RESET_TREE', payload: { rootTitle: 'Alpha' } })
    expect(next.nodes[next.rootId!].title).toBe('Alpha')
  })
})

// ── SET_COLLAPSED ─────────────────────────────────────────────────────────────

describe('SET_COLLAPSED', () => {
  it('colapsa o nó', () => {
    const s = makeState({ r: node('r', null, 0, [], '1') })
    expect(act(s, { type: 'SET_COLLAPSED', payload: { nodeId: 'r', collapsed: true } }).nodes.r.collapsed).toBe(true)
  })

  it('expande o nó', () => {
    const collapsed = { ...node('r', null, 0, [], '1'), collapsed: true }
    const s = makeState({ r: collapsed })
    expect(act(s, { type: 'SET_COLLAPSED', payload: { nodeId: 'r', collapsed: false } }).nodes.r.collapsed).toBe(false)
  })
})
