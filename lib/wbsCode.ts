import type { WbsNodeClient } from '@/types/wbs'

/**
 * Recalcula o campo `code` ("1.2.1") de todos os nós a partir de order/parentId.
 * Iterativo (BFS). Root sempre recebe code "1".
 * Retorna novo mapa — estado anterior não é mutado.
 */
export function recalcCodes(
  nodes: Record<string, WbsNodeClient>
): Record<string, WbsNodeClient> {
  const root = Object.values(nodes).find(n => n.parentId === null)
  if (!root) return { ...nodes }

  const result: Record<string, WbsNodeClient> = { ...nodes }
  const queue: Array<{ id: string; code: string }> = [{ id: root.id, code: '1' }]

  while (queue.length > 0) {
    const { id, code } = queue.shift()!
    const node = result[id]
    if (!node) continue
    result[id] = { ...node, code }

    const children = node.childrenIds
      .map(cid => result[cid])
      .filter((n): n is WbsNodeClient => Boolean(n))
      .sort((a, b) => a.order - b.order)

    children.forEach((child, idx) => {
      queue.push({ id: child.id, code: `${code}.${idx + 1}` })
    })
  }

  return result
}
