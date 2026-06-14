import type { WbsNodeClient, WbsRollup } from '@/types/wbs'

/**
 * Calcula rollup de custo e durationDays para cada nó.
 * Pós-ordem iterativa (sem recursão). Resultado NÃO é persistido.
 *
 * - Folha: usa properties.cost / properties.durationDays (0 se ausente).
 * - Pai: soma os rollups dos filhos. Valor próprio é ignorado enquanto há filhos.
 */
export function computeRollups(
  nodes: Record<string, WbsNodeClient>,
  rootId: string | null
): Record<string, WbsRollup> {
  if (!rootId || !nodes[rootId]) return {}

  // Coleta pré-ordem para depois inverter → pós-ordem
  const preOrder: string[] = []
  const seen = new Set<string>()
  const stack: string[] = [rootId]

  while (stack.length > 0) {
    const id = stack.pop()!
    if (!nodes[id] || seen.has(id)) continue
    seen.add(id)
    preOrder.push(id)

    const node = nodes[id]
    // Empurra filhos na ordem inversa para processar em ordem correta
    for (let i = node.childrenIds.length - 1; i >= 0; i--) {
      stack.push(node.childrenIds[i])
    }
  }

  const result: Record<string, WbsRollup> = {}

  // Processa em pós-ordem (folhas primeiro)
  for (let i = preOrder.length - 1; i >= 0; i--) {
    const id = preOrder[i]
    const node = nodes[id]
    if (!node) continue

    const activeChildren = node.childrenIds.filter(cid => nodes[cid])

    if (activeChildren.length === 0) {
      result[id] = {
        cost: node.properties.cost ?? 0,
        durationDays: node.properties.durationDays ?? 0,
        isRolledUp: false,
      }
    } else {
      let cost = 0
      let durationDays = 0
      for (const cid of activeChildren) {
        cost += result[cid]?.cost ?? 0
        durationDays += result[cid]?.durationDays ?? 0
      }
      result[id] = { cost, durationDays, isRolledUp: true }
    }
  }

  return result
}
