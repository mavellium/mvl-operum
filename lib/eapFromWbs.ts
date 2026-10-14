import type { EapNode } from '@/types/eap'
import type { WbsNodeClient } from '@/types/wbs'

/**
 * Converte a árvore da aba EAP/WBS (`WbsNode`) na árvore do documento EAP.
 * Mantém títulos, ordem e códigos da WBS; a raiz recebe o código "1".
 * Função pura e iterativa (sem recursão).
 */
export function eapNodesFromWbs(nodes: Record<string, WbsNodeClient>, rootId: string | null): EapNode[] {
  const root = rootId ? nodes[rootId] : undefined
  if (!root) return []

  const toEap = (n: WbsNodeClient, parentId: string | null, level: number, order: number, code: string): EapNode =>
    ({ id: n.id, parentId, code, title: n.title, level, order, children: [] })

  const eapRoot = toEap(root, null, 1, 0, '1')
  const stack: Array<{ wbs: WbsNodeClient; eap: EapNode }> = [{ wbs: root, eap: eapRoot }]
  const seen = new Set<string>([root.id])
  while (stack.length > 0) {
    const { wbs, eap } = stack.pop()!
    let i = 0
    wbs.childrenIds.forEach(childId => {
      const child = nodes[childId]
      if (!child || seen.has(childId)) return
      seen.add(childId)
      i++
      const node = toEap(child, eap.id, eap.level + 1, i - 1, child.code || `${eap.code}.${i}`)
      eap.children.push(node)
      stack.push({ wbs: child, eap: node })
    })
  }
  return [eapRoot]
}
