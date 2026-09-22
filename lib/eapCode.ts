import type { EapNode } from '@/types/eap'

/**
 * Recálculo autoritativo de `code`, `level` e `parentId` a partir da estrutura
 * aninhada. `order` também é normalizado (posição no array de irmãos).
 *
 * Princípios (SPEC §3 / §10):
 * - `order` é a fonte de verdade da ordenação; `code` é DERIVADO.
 * - Numeração automática: raiz = "1", filhos "1.1", "1.2"... netos "1.1.1".
 * - O usuário nunca digita códigos manualmente.
 *
 * Função pura e iterativa (sem recursão profunda, tolerante a árvores grandes).
 */
export function recomputeNodeCodes(roots: EapNode[]): EapNode[] {
  // Pilha: [array de nós, índice no array, prefixo do código, profundidade, parentId]
  type Frame = [EapNode[], number, string, number, string | null]

  const stack: Frame[] = []
  for (let i = roots.length - 1; i >= 0; i--) {
    stack.push([roots, i, '', 1, null])
  }

  // 1ª passada: normaliza cada nó (ordem pré-ordem, em travessia iterativa),
  // guardando referências por id. A árvore ainda é "achatada" neste momento.
  const byId = new Map<string, EapNode>()
  const preOrder: EapNode[] = []
  const seen = new Set<string>()

  while (stack.length > 0) {
    const [siblings, index, prefix, level, parentId] = stack.pop() as Frame
    const node = siblings[index]
    if (!node || seen.has(node.id)) continue
    seen.add(node.id)

    const order = index
    // Código: raiz = "1"; filhos = "1.1", "1.2"… (prefixo + "." + número)
    const code = prefix ? `${prefix}.${order + 1}` : String(order + 1)

    const normalized: EapNode = {
      id: node.id,
      parentId,
      code,
      title: node.title ?? '',
      level,
      order,
      children: [],
    }

    preOrder.push(normalized)
    byId.set(node.id, normalized)

    // Empilha os filhos (em ordem reversa para preservar a ordem original).
    const children = Array.isArray(node.children) ? node.children : []
    if (children.length > 0) {
      const childStack: Frame[] = []
      for (let c = children.length - 1; c >= 0; c--) {
        childStack.push([children, c, code, level + 1, node.id])
      }
      // childStack está [último…primeiro]; empilhar nessa ordem faz o primeiro
      // filho ficar no topo da pilha LIFO → é processado primeiro. SEM reverse.
      for (const frame of childStack) stack.push(frame)
    }
  }

  // 2ª passada: REMONTA a estrutura aninhada. Processa a pré-ordem de trás para
  // frente — assim todo nó é anexado ao pai DEPOIS de seus próprios filhos já
  // estarem anexados. `unshift` preserva a ordem original dos irmãos.
  const rootsOut: EapNode[] = []
  for (let i = preOrder.length - 1; i >= 0; i--) {
    const current = preOrder[i]
    if (current.parentId === null) {
      rootsOut.push(current)
      continue
    }
    const parent = byId.get(current.parentId)
    if (parent) parent.children.unshift(current)
    else rootsOut.push(current) // pai sumiu (caso extremo): mantém como raiz
  }
  rootsOut.reverse()

  return rootsOut
}

/** Conta o total de nós (para limites). Iterativo. */
export function countNodes(roots: EapNode[]): number {
  let total = 0
  const stack: EapNode[] = [...roots]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    total++
    for (const child of node.children ?? []) stack.push(child)
  }
  return total
}

/** Profundidade máxima da árvore (raiz = 1). Iterativo. */
export function maxDepth(roots: EapNode[]): number {
  let max = 0
  const stack: Array<{ node: EapNode; depth: number }> = roots.map(node => ({ node, depth: 1 }))
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!
    if (depth > max) max = depth
    for (const child of node.children ?? []) stack.push({ node: child, depth: depth + 1 })
  }
  return max
}

/** Achatamento em pré-ordem (DFS) — usado pela página textual e selects. */
export function flattenTree(roots: EapNode[]): EapNode[] {
  const flat: EapNode[] = []
  const stack: EapNode[] = [...roots].reverse()
  while (stack.length > 0) {
    const node = stack.pop()!
    flat.push(node)
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i])
  }
  return flat
}

/** Busca um nó pelo id (em qualquer profundidade). Retorna null se não achar. */
export function findNode(roots: EapNode[], id: string): EapNode | null {
  const stack: EapNode[] = [...roots]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.id === id) return node
    for (const child of node.children ?? []) stack.push(child)
  }
  return null
}

/**
 * Lista os ids de TODOS os descendentes de um nó (incluindo ele mesmo).
 * Usada na prevenção de ciclos do mover e na exclusão/duplicação.
 */
export function collectSubtreeIds(roots: EapNode[], id: string): Set<string> {
  const ids = new Set<string>()
  const root = findNode(roots, id)
  if (!root) return ids
  const stack: EapNode[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    ids.add(node.id)
    for (const child of node.children ?? []) stack.push(child)
  }
  return ids
}