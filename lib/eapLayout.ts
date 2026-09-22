import type { EapLayoutResult, EapNode } from '@/types/eap'

/**
 * Layout FIXO de impressão da EAP gráfica (SPEC §7, §13, §14).
 *
 * Árvore "tidy" (organograma): raiz no topo-centro; cada nível é distribuído
 * lado a lado; conectores em cotovelo (descida vertical + barra horizontal +
 * descida ao filho). As coordenadas são independentes de tela — a página SVG
 * usa viewBox e é dimensionada para caber no A4 tanto no editor quanto no PDF.
 *
 * Função pura e iterativa. Testada em __tests__/unit/eap/eapLayout.test.ts.
 */

export const EAP_BOX_W = 150
export const EAP_BOX_H = 48
export const EAP_GAP_X = 40
export const EAP_GAP_Y = 56

interface SubtreeSize {
  width: number
  height: number
}

function childrenOf(node: EapNode): EapNode[] {
  return node.children ?? []
}

/** Largura + altura da subárvore de cada nó, em pós-ordem (iterativo). */
function buildSubtreeSizes(rootId: string, nodes: Record<string, EapNode>): Record<string, SubtreeSize> {
  const preOrder: string[] = []
  const seen = new Set<string>()
  const q: string[] = [rootId]

  while (q.length > 0) {
    const id = q.shift()!
    const node = nodes[id]
    if (!node || seen.has(id)) continue
    seen.add(id)
    preOrder.push(id)
    for (const c of childrenOf(node)) q.push(c.id)
  }

  const sizes: Record<string, SubtreeSize> = {}

  for (let i = preOrder.length - 1; i >= 0; i--) {
    const id = preOrder[i]
    const node = nodes[id]
    const ch = childrenOf(node)

    if (ch.length === 0) {
      sizes[id] = { width: EAP_BOX_W, height: EAP_BOX_H }
      continue
    }

    const totalW =
      ch.reduce((s, c) => s + (sizes[c.id]?.width ?? EAP_BOX_W), 0) +
      EAP_GAP_X * (ch.length - 1)
    const maxH = Math.max(...ch.map(c => sizes[c.id]?.height ?? EAP_BOX_H))
    sizes[id] = {
      width: Math.max(EAP_BOX_W, totalW),
      height: EAP_BOX_H + EAP_GAP_Y + maxH,
    }
  }

  return sizes
}

/**
 * Calcula geometria + conectores da árvore inteira.
 * Root único do documento; se houver múltiplas raízes, trata como subárvores
 * consecutivas (caso extremo de segurança).
 */
export function computeEapLayout(roots: EapNode[]): EapLayoutResult {
  if (roots.length === 0) {
    return { geometry: {}, connectors: [], bounds: { width: 0, height: 0 } }
  }

  const allSizes: Record<string, SubtreeSize> = {}
  const geometry: EapLayoutResult['geometry'] = {}
  const connectors: EapLayoutResult['connectors'] = []
  let maxX = 0
  let maxY = 0

  // Posiciona cada raiz lado a lado e processa suas subárvores.
  const rootsSizes = roots.map(r => {
    const sizes = buildSubtreeSizes(r.id, indexTree(roots))
    Object.assign(allSizes, sizes)
    return sizes[r.id] ?? { width: EAP_BOX_W, height: EAP_BOX_H }
  })
  const totalRootsW = rootsSizes.reduce((s, sz) => s + sz.width, 0) + EAP_GAP_X * (roots.length - 1)

  let cursorX = 0
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i]
    const subtreeW = rootsSizes[i].width
    const rootX = cursorX + subtreeW / 2 - EAP_BOX_W / 2
    cursorX += subtreeW + EAP_GAP_X

    const stack: Array<{ id: string; x: number; y: number }> = [{ id: root.id, x: rootX, y: 0 }]
    const idMap = indexTree(roots)

    while (stack.length > 0) {
      const { id, x, y } = stack.pop()!
      const node = idMap[id]
      if (!node || geometry[id]) continue

      geometry[id] = { id, x, y, width: EAP_BOX_W, height: EAP_BOX_H, isRoot: i === 0 && root.id === id && node.level === 1 }
      if (x + EAP_BOX_W > maxX) maxX = x + EAP_BOX_W
      if (y + EAP_BOX_H > maxY) maxY = y + EAP_BOX_H

      const ch = childrenOf(node)
      if (ch.length === 0) continue

      const childWidths = ch.map(c => allSizes[c.id]?.width ?? EAP_BOX_W)
      const totalW = childWidths.reduce((s, w) => s + w, 0) + EAP_GAP_X * (ch.length - 1)
      const childY = y + EAP_BOX_H + EAP_GAP_Y
      const pCx = x + EAP_BOX_W / 2
      const midY = y + EAP_BOX_H + EAP_GAP_Y / 2
      let subtreeLeft = x + EAP_BOX_W / 2 - totalW / 2

      for (let k = 0; k < ch.length; k++) {
        const sw = childWidths[k]
        const chCx = subtreeLeft + sw / 2
        const childX = chCx - EAP_BOX_W / 2
        stack.push({ id: ch[k].id, x: childX, y: childY })

        connectors.push({
          fromId: id,
          toId: ch[k].id,
          path: `M ${pCx} ${y + EAP_BOX_H} V ${midY} H ${chCx} V ${childY}`,
        })
        subtreeLeft += sw + EAP_GAP_X
      }
    }
  }

  return {
    geometry,
    connectors,
    bounds: { width: Math.max(totalRootsW, maxX), height: maxY },
  }
}

function indexTree(roots: EapNode[]): Record<string, EapNode> {
  const map: Record<string, EapNode> = {}
  const stack: EapNode[] = [...roots]
  while (stack.length > 0) {
    const node = stack.pop()!
    map[node.id] = node
    for (const c of node.children ?? []) stack.push(c)
  }
  return map
}

/**
 * Escala para encaixar a árvore na área disponível do A4 (mm → px na altura).
 * Retorna o menor fator que garante largura E altura dentro da área.
 */
export function fitScale(
  treeWidth: number,
  treeHeight: number,
  availWidth: number,
  availHeight: number,
): number {
  if (treeWidth <= 0 || treeHeight <= 0) return 1
  const sx = availWidth / treeWidth
  const sy = availHeight / treeHeight
  const scale = Math.min(sx, sy, 1)
  return scale > 0 ? scale : 1
}