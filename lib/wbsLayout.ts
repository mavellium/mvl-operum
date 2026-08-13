import type {
  WbsNodeClient,
  WbsLayoutResult,
  WbsNodeGeometry,
  WbsConnector,
  DropPosition,
} from '@/types/wbs'

export const NODE_W = 160
export const NODE_H = 60
export const GAP_X = 40
export const GAP_Y = 60

/**
 * Resolve a posição de drop sobre (ou logo abaixo de) um card:
 * - borda esquerda  → BEFORE (irmão antes)
 * - borda direita   → AFTER  (irmão depois)
 * - corpo/abaixo    → INSIDE (filho)
 * Retorna null quando o cursor não está em nenhuma zona do card.
 */
export function resolveDropPosition(
  cx: number,
  cy: number,
  g: Pick<WbsNodeGeometry, 'x' | 'y' | 'width' | 'height'>
): DropPosition | null {
  const SIDE_W = Math.max(18, g.width * 0.2)
  const BELOW_H = 24

  const withinCard =
    cx >= g.x && cx <= g.x + g.width &&
    cy >= g.y && cy <= g.y + g.height
  if (withinCard) {
    if (cx < g.x + SIDE_W) return 'BEFORE'
    if (cx > g.x + g.width - SIDE_W) return 'AFTER'
    return 'INSIDE'
  }

  const inBelowBand =
    cy > g.y + g.height && cy <= g.y + g.height + BELOW_H &&
    cx >= g.x && cx <= g.x + g.width
  if (inBelowBand) return 'INSIDE'

  return null
}

interface SubtreeSize {
  width: number
  height: number
}

function visibleChildren(
  node: WbsNodeClient,
  nodes: Record<string, WbsNodeClient>
): WbsNodeClient[] {
  if (node.collapsed) return []
  return node.childrenIds
    .map(id => nodes[id])
    .filter((n): n is WbsNodeClient => Boolean(n))
    .sort((a, b) => a.order - b.order)
}

/**
 * Calcula o bounding-box de cada subárvore em pós-ordem.
 * nodeWidths: largura real de cada nó (calculada por texto). Fallback = NODE_W.
 */
function buildSubtreeSizes(
  rootId: string,
  nodes: Record<string, WbsNodeClient>,
  nodeWidths: Record<string, number>
): Record<string, SubtreeSize> {
  const preOrder: string[] = []
  const seen = new Set<string>()
  const q: string[] = [rootId]

  while (q.length > 0) {
    const id = q.shift()!
    if (!nodes[id] || seen.has(id)) continue
    seen.add(id)
    preOrder.push(id)
    visibleChildren(nodes[id], nodes).forEach(c => q.push(c.id))
  }

  const sizes: Record<string, SubtreeSize> = {}

  for (let i = preOrder.length - 1; i >= 0; i--) {
    const id = preOrder[i]
    const node = nodes[id]
    const ch = visibleChildren(node, nodes)
    const nw = nodeWidths[id] ?? NODE_W

    if (ch.length === 0) {
      sizes[id] = { width: nw, height: NODE_H }
      continue
    }

    if (node.layout === 'LADO_A_LADO') {
      const totalW =
        ch.reduce((s, c) => s + (sizes[c.id]?.width ?? NODE_W), 0) +
        GAP_X * (ch.length - 1)
      const maxH = Math.max(...ch.map(c => sizes[c.id]?.height ?? NODE_H))
      sizes[id] = { width: Math.max(nw, totalW), height: NODE_H + GAP_Y + maxH }
    } else {
      // ABAIXO ou ABAIXO_L
      const totalH = ch.reduce(
        (s, c) => s + (sizes[c.id]?.height ?? NODE_H) + GAP_Y,
        0
      )
      const maxW = Math.max(...ch.map(c => sizes[c.id]?.width ?? NODE_W))
      const xOff = node.layout === 'ABAIXO_L' ? GAP_X : 0
      sizes[id] = {
        width: Math.max(nw, xOff + maxW),
        height: NODE_H + totalH,
      }
    }
  }

  return sizes
}

/**
 * Calcula geometria (x, y, width, height) e conectores SVG para todos os nós.
 * nodeWidths: mapa de larguras reais por nodeId (medidas por texto). Fallback = NODE_W.
 */
export function computeLayout(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null,
  nodeWidths: Record<string, number> = {}
): WbsLayoutResult {
  if (!rootId || !nodes[rootId]) {
    return { geometry: {}, connectors: [], bounds: { width: 0, height: 0 } }
  }

  const sizes = buildSubtreeSizes(rootId, nodes, nodeWidths)
  const geometry: Record<string, WbsNodeGeometry> = {}
  const connectors: WbsConnector[] = []

  const stack: Array<{ id: string; x: number; y: number }> = [
    { id: rootId, x: 0, y: 0 },
  ]

  while (stack.length > 0) {
    const { id, x, y } = stack.pop()!
    const node = nodes[id]
    if (!node || geometry[id]) continue

    const nw = nodeWidths[id] ?? NODE_W
    geometry[id] = { id, x, y, width: nw, height: NODE_H }

    const ch = visibleChildren(node, nodes)
    if (ch.length === 0) continue

    if (node.layout === 'LADO_A_LADO') {
      const childSubtreeWidths = ch.map(c => sizes[c.id]?.width ?? NODE_W)
      const totalW = childSubtreeWidths.reduce((s, w) => s + w, 0) + GAP_X * (ch.length - 1)
      const childY = y + NODE_H + GAP_Y
      const pCx = x + nw / 2
      const midY = y + NODE_H + GAP_Y / 2
      let subtreeLeft = x + nw / 2 - totalW / 2

      for (let i = 0; i < ch.length; i++) {
        const sw = childSubtreeWidths[i]
        const chW = nodeWidths[ch[i].id] ?? NODE_W
        const childX = subtreeLeft + sw / 2 - chW / 2
        stack.push({ id: ch[i].id, x: childX, y: childY })

        // Centro da subárvore (independente da largura do card filho)
        const cCx = subtreeLeft + sw / 2
        connectors.push({
          fromId: id,
          toId: ch[i].id,
          path: `M ${pCx} ${y + NODE_H} V ${midY} H ${cCx} V ${childY}`,
        })
        subtreeLeft += sw + GAP_X
      }
    } else if (node.layout === 'ABAIXO') {
      const pCx = x + nw / 2
      let childY = y + NODE_H + GAP_Y

      for (const child of ch) {
        stack.push({ id: child.id, x, y: childY })
        connectors.push({
          fromId: id,
          toId: child.id,
          path: `M ${pCx} ${y + NODE_H} V ${childY}`,
        })
        childY += (sizes[child.id]?.height ?? NODE_H) + GAP_Y
      }
    } else {
      // ABAIXO_L
      const childX = x + GAP_X
      let childY = y + NODE_H + GAP_Y

      for (const child of ch) {
        stack.push({ id: child.id, x: childX, y: childY })
        connectors.push({
          fromId: id,
          toId: child.id,
          path: `M ${x + nw / 2} ${y + NODE_H} V ${childY + NODE_H / 2} H ${childX}`,
        })
        childY += (sizes[child.id]?.height ?? NODE_H) + GAP_Y
      }
    }
  }

  let maxX = 0
  let maxY = 0
  for (const g of Object.values(geometry)) {
    if (g.x + g.width > maxX) maxX = g.x + g.width
    if (g.y + NODE_H > maxY) maxY = g.y + NODE_H
  }

  return { geometry, connectors, bounds: { width: maxX, height: maxY } }
}
