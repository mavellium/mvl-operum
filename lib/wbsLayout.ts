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
/** Área da pílula de colapso que fica meio para fora (~10px abaixo do card). */
export const PILL_OVERHANG = 12

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
  rootX: number
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
  nodeWidths: Record<string, number>,
  nodeHeight: number,
): Record<string, SubtreeSize> {
  const preOrder: string[] = []
  const seen = new Set<string>()
  const q: string[] = [rootId]

  for (let cursor = 0; cursor < q.length; cursor++) {
    const id = q[cursor]
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
      sizes[id] = { width: nw, height: nodeHeight, rootX: 0 }
      continue
    }

    const childrenHeight = ch.reduce((sum, c) => sum + (sizes[c.id]?.height ?? nodeHeight), 0)
    if (node.layout === 'LADO_A_LADO') {
      const totalW = ch.reduce((sum, c) => sum + sizes[c.id].width, 0) + GAP_X * (ch.length - 1)
      const width = Math.max(nw, totalW)
      sizes[id] = { width, rootX: (width - nw) / 2, height: nodeHeight + GAP_Y + Math.max(...ch.map(c => sizes[c.id].height)) }
    } else if (node.layout === 'ABAIXO_L') {
      sizes[id] = { rootX: 0, width: nw + GAP_X + Math.max(...ch.map(c => sizes[c.id].width)), height: nodeHeight + childrenHeight + GAP_Y * ch.length }
    } else {
      const rootCenter = Math.max(nw / 2, ...ch.map(c => sizes[c.id].rootX + (nodeWidths[c.id] ?? NODE_W) / 2))
      const right = Math.max(nw / 2, ...ch.map(c => sizes[c.id].width - sizes[c.id].rootX - (nodeWidths[c.id] ?? NODE_W) / 2))
      sizes[id] = { rootX: rootCenter - nw / 2, width: rootCenter + right, height: nodeHeight + childrenHeight + GAP_Y * ch.length }
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
  nodeWidths: Record<string, number> = {},
  nodeHeight: number = NODE_H,
): WbsLayoutResult {
  if (!rootId || !nodes[rootId]) {
    return { geometry: {}, connectors: [], bounds: { width: 0, height: 0 } }
  }

  const sizes = buildSubtreeSizes(rootId, nodes, nodeWidths, nodeHeight)
  const geometry: Record<string, WbsNodeGeometry> = {}
  const connectors: WbsConnector[] = []

  const stack: Array<{ id: string; x: number; y: number }> = [
    { id: rootId, x: sizes[rootId].rootX, y: 0 },
  ]

  while (stack.length > 0) {
    const { id, x, y } = stack.pop()!
    const node = nodes[id]
    if (!node || geometry[id]) continue

    const nw = nodeWidths[id] ?? NODE_W
    geometry[id] = { id, x, y, width: nw, height: nodeHeight }

    const ch = visibleChildren(node, nodes)
    if (ch.length === 0) continue

    if (node.layout === 'LADO_A_LADO') {
      const childSubtreeWidths = ch.map(c => sizes[c.id]?.width ?? NODE_W)
      const totalW = childSubtreeWidths.reduce((s, w) => s + w, 0) + GAP_X * (ch.length - 1)
      const childY = y + nodeHeight + GAP_Y
      const pCx = x + nw / 2
      const midY = y + nodeHeight + GAP_Y / 2
      let subtreeLeft = x - sizes[id].rootX + (sizes[id].width - totalW) / 2

      for (let i = 0; i < ch.length; i++) {
        const sw = childSubtreeWidths[i]
        const chW = nodeWidths[ch[i].id] ?? NODE_W
        const childX = subtreeLeft + sizes[ch[i].id].rootX
        stack.push({ id: ch[i].id, x: childX, y: childY })

        // Centro da subárvore (independente da largura do card filho)
        const cCx = childX + chW / 2
        connectors.push({
          fromId: id,
          toId: ch[i].id,
          path: `M ${pCx} ${y + nodeHeight} V ${midY} H ${cCx} V ${childY}`,
        })
        subtreeLeft += sw + GAP_X
      }
    } else if (node.layout === 'ABAIXO') {
      const pCx = x + nw / 2
      let childY = y + nodeHeight + GAP_Y

      for (const child of ch) {
        stack.push({ id: child.id, x: x + nw / 2 - (nodeWidths[child.id] ?? NODE_W) / 2, y: childY })
        connectors.push({
          fromId: id,
          toId: child.id,
          path: `M ${pCx} ${y + nodeHeight} V ${childY}`,
        })
        childY += (sizes[child.id]?.height ?? nodeHeight) + GAP_Y
      }
    } else {
      // ABAIXO_L — pai à esquerda, filhos indentados à direita, conector em cotovelo
      // (sai do meio-direito do pai, desce/sobe e entra na borda esquerda do filho).
      const spineX = x + nw + 10
      const parentMidY = y + nodeHeight / 2
      let childY = y + nodeHeight + GAP_Y

      for (const child of ch) {
        const childX = x + nw + GAP_X + sizes[child.id].rootX
        stack.push({ id: child.id, x: childX, y: childY })
        connectors.push({
          fromId: id,
          toId: child.id,
          path: `M ${x + nw} ${parentMidY} H ${spineX} V ${childY + NODE_H / 2} H ${childX}`,
        })
        childY += (sizes[child.id]?.height ?? nodeHeight) + GAP_Y
      }
    }
  }

  let maxX = 0
  let maxY = 0
  for (const g of Object.values(geometry)) {
    if (g.x + g.width > maxX) maxX = g.x + g.width
    if (g.y + nodeHeight > maxY) maxY = g.y + nodeHeight
  }

  return { geometry, connectors, bounds: { width: maxX, height: maxY + PILL_OVERHANG } }
}
