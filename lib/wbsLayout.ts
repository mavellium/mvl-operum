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
  /** Posição do card do nó dentro da caixa da subárvore. */
  rootX: number
  rootY: number
}

/**
 * Recuo dos filhos em relação à linha vertical (Direita/Esquerda), na proporção do
 * organizar-direita.svg: linha no centro do pai (x 9 de 3–15) e filho em x 14, ou
 * seja, 5/12 da largura do pai depois da linha.
 */
export function indentDe(parentWidth: number): number {
  return Math.round((parentWidth * 5) / 12)
}
/** Espaço vertical entre filhos empilhados (Direita, Esquerda e horizontais). */
export const GAP_STACK = 24

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

type Layout = WbsNodeClient['layout']
const CONHECIDOS: ReadonlySet<string> = new Set(['LADO_A_LADO', 'DIREITA', 'ESQUERDA', 'HORIZONTAL', 'HORIZONTAL_TOPO', 'HORIZONTAL_BASE'])
/** Valores antigos ("Abaixo", "Abaixo com L") ou desconhecidos são desenhados como Direita. */
function layoutDe(node: WbsNodeClient): Layout {
  return CONHECIDOS.has(node.layout) ? node.layout : 'DIREITA'
}
const isHorizontal = (l: Layout) => l === 'HORIZONTAL' || l === 'HORIZONTAL_TOPO' || l === 'HORIZONTAL_BASE'

/** Topo de cada filho numa coluna empilhada, a partir de 0. */
function stackTops(heights: number[]): number[] {
  const tops: number[] = []
  let y = 0
  for (const h of heights) { tops.push(y); y += h + GAP_STACK }
  return tops
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
    const layout = layoutDe(node)
    const ch = visibleChildren(node, nodes).map(c => sizes[c.id])
    const nw = nodeWidths[id] ?? NODE_W
    const H = nodeHeight

    if (ch.length === 0) {
      sizes[id] = { width: nw, height: H, rootX: 0, rootY: 0 }
      continue
    }

    const stackH = ch.reduce((sum, c) => sum + c.height, 0) + GAP_STACK * (ch.length - 1)
    const maxChildW = Math.max(...ch.map(c => c.width))

    if (layout === 'LADO_A_LADO') {
      const totalW = ch.reduce((sum, c) => sum + c.width, 0) + GAP_X * (ch.length - 1)
      const width = Math.max(nw, totalW)
      sizes[id] = { width, rootX: (width - nw) / 2, rootY: 0, height: H + GAP_Y + Math.max(...ch.map(c => c.height)) }
    } else if (layout === 'DIREITA' || layout === 'ESQUERDA') {
      // Linha vertical no centro do pai; filhos a indentDe(nw) dela.
      const width = Math.max(nw, nw / 2 + indentDe(nw) + maxChildW)
      sizes[id] = {
        width,
        rootX: layout === 'DIREITA' ? 0 : width - nw,
        rootY: 0,
        height: H + GAP_Y / 2 + stackH,
      }
    } else {
      // Horizontais: pai à esquerda; o centro dele vai ao meio, ao primeiro ou ao último filho.
      const tops = stackTops(ch.map(c => c.height))
      const centers = ch.map((c, k) => tops[k] + c.rootY + H / 2)
      const parentCenter = layout === 'HORIZONTAL_TOPO' ? centers[0]
        : layout === 'HORIZONTAL_BASE' ? centers[centers.length - 1]
        : (centers[0] + centers[centers.length - 1]) / 2
      const rootY = parentCenter - H / 2
      sizes[id] = { width: nw + GAP_X + maxChildW, rootX: 0, rootY, height: Math.max(stackH, rootY + H) }
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
  const H = nodeHeight

  // Cada item é a caixa da subárvore (canto superior esquerdo).
  const stack: Array<{ id: string; left: number; top: number }> = [{ id: rootId, left: 0, top: 0 }]

  while (stack.length > 0) {
    const { id, left, top } = stack.pop()!
    const node = nodes[id]
    if (!node || geometry[id]) continue

    const size = sizes[id]
    const nw = nodeWidths[id] ?? NODE_W
    const x = left + size.rootX
    const y = top + size.rootY
    geometry[id] = { id, x, y, width: nw, height: H }

    const ch = visibleChildren(node, nodes)
    if (ch.length === 0) continue
    const layout = layoutDe(node)
    const widthOf = (c: WbsNodeClient) => nodeWidths[c.id] ?? NODE_W

    if (layout === 'LADO_A_LADO') {
      const totalW = ch.reduce((s, c) => s + sizes[c.id].width, 0) + GAP_X * (ch.length - 1)
      const childTop = y + H + GAP_Y
      const pCx = x + nw / 2
      const midY = y + H + GAP_Y / 2
      let subtreeLeft = left + (size.width - totalW) / 2

      for (const c of ch) {
        const cs = sizes[c.id]
        stack.push({ id: c.id, left: subtreeLeft, top: childTop })
        const cCx = subtreeLeft + cs.rootX + widthOf(c) / 2
        connectors.push({ fromId: id, toId: c.id, path: `M ${pCx} ${y + H} V ${midY} H ${cCx} V ${childTop + cs.rootY}` })
        subtreeLeft += cs.width + GAP_X
      }
    } else if (layout === 'DIREITA' || layout === 'ESQUERDA') {
      // Linha desce do centro do pai; um ramal entra em cada filho (o último fecha a linha).
      const direita = layout === 'DIREITA'
      const spineX = x + nw / 2
      let childTop = y + H + GAP_Y / 2

      for (const c of ch) {
        const cs = sizes[c.id]
        const cLeft = direita ? spineX + indentDe(nw) : spineX - indentDe(nw) - cs.width
        stack.push({ id: c.id, left: cLeft, top: childTop })
        const cx = cLeft + cs.rootX
        const mid = childTop + cs.rootY + H / 2
        const edge = direita ? cx : cx + widthOf(c)
        connectors.push({ fromId: id, toId: c.id, path: `M ${spineX} ${y + H} V ${mid} H ${edge}` })
        childTop += cs.height + GAP_STACK
      }
    } else if (isHorizontal(layout)) {
      // Pai à esquerda: sai do meio-direito dele até a linha vertical, que liga os filhos.
      const spineX = x + nw + GAP_X / 2
      const pMid = y + H / 2
      const tops = stackTops(ch.map(c => sizes[c.id].height))

      ch.forEach((c, k) => {
        const cs = sizes[c.id]
        const cLeft = x + nw + GAP_X
        // A coluna de filhos começa no topo da subárvore; o pai é que desce (rootY).
        const cTop = top + tops[k]
        stack.push({ id: c.id, left: cLeft, top: cTop })
        const mid = cTop + cs.rootY + H / 2
        connectors.push({ fromId: id, toId: c.id, path: `M ${x + nw} ${pMid} H ${spineX} V ${mid} H ${cLeft + cs.rootX}` })
      })
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
