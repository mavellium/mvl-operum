import { v4 as uuidv4 } from 'uuid'
import type { EapNode } from '@/types/eap'
import {
  collectSubtreeIds,
  recomputeNodeCodes,
} from './eapCode'

/**
 * Operações estruturais da árvore da EAP (SPEC §9–§10).
 *
 * Todas as funções são PURAS: recebem a árvore (EapNode[]) e retornam uma nova
 * árvore NORMALIZADA (códigos, níveis e parentId recalculados). Nada é mutado.
 *
 * Cobertas por testes em __tests__/unit/eap/eapTree.test.ts.
 */

export type IdFactory = () => string

/** Helper: caminha na árvore de forma imutável aplicando `fn` em cada nó. */
function mapTree(roots: EapNode[], fn: (node: EapNode, parentId: string | null) => EapNode): EapNode[] {
  const walk = (nodes: EapNode[], parentId: string | null): EapNode[] =>
    nodes.map(node => {
      const mapped = fn(node, parentId)
      return { ...mapped, children: walk(mapped.children ?? [], mapped.id) }
    })
  return walk(roots, null)
}

/** Clona um nó e toda a subárvore com ids novos (duplicar). */
function deepClone(node: EapNode, idFactory: IdFactory): EapNode {
  const newId = idFactory()
  const clone: EapNode = {
    id: newId,
    parentId: null, // recalculado pelo normalizador
    code: '',
    title: node.title,
    level: 1,
    order: 0,
    children: (node.children ?? []).map(c => deepClone(c, idFactory)),
  }
  return clone
}

const DEFAULT_TITLE = '[PACOTE DE TRABALHO]'

/** Insere um filho no final da lista de filhos de `parentId`. */
export function insertChild(
  roots: EapNode[],
  parentId: string,
  title = DEFAULT_TITLE,
  idFactory: IdFactory = uuidv4,
): EapNode[] {
  let found = false
  const next = mapTree(roots, node => {
    if (node.id === parentId) {
      found = true
      return {
        ...node,
        children: [
          ...(node.children ?? []),
          { id: idFactory(), parentId, code: '', title, level: 0, order: 0, children: [] },
        ],
      }
    }
    return node
  })
  if (!found) return roots
  return recomputeNodeCodes(next)
}

/** Insere um irmão logo após `nodeId` (mesma posição, mesmo pai). */
export function insertSibling(
  roots: EapNode[],
  nodeId: string,
  title = DEFAULT_TITLE,
  idFactory: IdFactory = uuidv4,
): EapNode[] {
  let found = false
  let placedParent: string | null = null

  const addAfter = (siblings: EapNode[], afterId: string): EapNode[] => {
    const idx = siblings.findIndex(n => n.id === afterId)
    if (idx === -1) return siblings
    const before = siblings.slice(0, idx + 1)
    const after = siblings.slice(idx + 1)
    return [...before, { id: idFactory(), parentId: placedParent, code: '', title, level: 0, order: 0, children: [] }, ...after]
  }

  const walk = (nodes: EapNode[], parentId: string | null): EapNode[] => {
    if (found) return nodes
    const idx = nodes.findIndex(n => n.id === nodeId)
    if (idx !== -1) {
      found = true
      placedParent = parentId
      return addAfter(nodes, nodeId)
    }
    return nodes.map(node => {
      const children = node.children ?? []
      const nextChildren = walk(children, node.id)
      return nextChildren === children ? node : { ...node, children: nextChildren }
    })
  }

  const next = walk(roots, null)
  if (!found) return roots
  return recomputeNodeCodes(next)
}

/** Remove um nó e toda a subárvore. */
export function removeNode(roots: EapNode[], nodeId: string): EapNode[] {
  // Se o id não existir, devolve a mesma árvore (sem mutação).
  let found = false
  const prune = (nodes: EapNode[]): EapNode[] => {
    const next = nodes.filter(n => n.id !== nodeId)
    if (next.length !== nodes.length) found = true
    return next.map(node => ({ ...node, children: prune(node.children ?? []) }))
  }
  const next = prune(roots)
  if (!found) return roots
  return recomputeNodeCodes(next)
}

/** Duplica um nó + subárvore, inserindo logo após o original (mesmo pai). */
export function duplicateNode(
  roots: EapNode[],
  nodeId: string,
  idFactory: IdFactory = uuidv4,
): EapNode[] {
  let found = false
  const walk = (nodes: EapNode[], parentId: string | null): EapNode[] => {
    const idx = nodes.findIndex(n => n.id === nodeId)
    if (idx !== -1) {
      found = true
      const before = nodes.slice(0, idx + 1)
      const after = nodes.slice(idx + 1)
      const clone = deepClone(nodes[idx], idFactory)
      return [...before, clone, ...after]
    }
    return nodes.map(node => {
      const children = node.children ?? []
      const nextChildren = walk(children, node.id)
      return nextChildren === children ? node : { ...node, children: nextChildren }
    })
  }

  const next = walk(roots, null)
  if (!found) return roots
  return recomputeNodeCodes(next)
}

/**
 * Move um nó para outro pai (ou raiz) em determinada posição.
 * Prevenção de ciclo: rejeita quando o alvo é o próprio nó ou um descendente.
 */
export function moveNode(
  roots: EapNode[],
  nodeId: string,
  targetParentId: string | null,
  targetOrder = Number.MAX_SAFE_INTEGER,
): EapNode[] {
  const forbidden = collectSubtreeIds(roots, nodeId) // inclui o próprio nó
  if (forbidden.has(targetParentId ?? '')) return roots

  const source = findNodeIn(roots, nodeId)
  if (!source) return roots

  // Remove o nó da posição atual.
  let removed: EapNode | null = null
  const walkRemove = (nodes: EapNode[]): EapNode[] => {
    const idx = nodes.findIndex(n => n.id === nodeId)
    if (idx !== -1) {
      removed = nodes[idx]
      return [...nodes.slice(0, idx), ...nodes.slice(idx + 1)]
    }
    return nodes.map(node => ({
      ...node,
      children: walkRemove(node.children ?? []),
    }))
  }
  const without = walkRemove(roots)
  const foundNode = removed as EapNode | null
  if (!foundNode) return roots

  // Insere no destino.
  const detached: EapNode = { ...foundNode, children: foundNode.children ?? [] }
  const insert = (nodes: EapNode[], parentId: string | null): EapNode[] => {
    if (parentId === null) {
      const list = [...nodes, detached]
      return list
    }
    return nodes.map(node => {
      if (node.id === parentId) {
        const siblings = [...(node.children ?? []), detached]
        if (node.id === nodeId) {
          // Não pode acontecer (forbidden), mas segurança extra.
          return node
        }
        return { ...node, children: siblings }
      }
      return { ...node, children: insert(node.children ?? [], parentId) }
    })
  }

  const inserted = insert(without, targetParentId)
  if (!findNodeIn(inserted, nodeId)) return roots

  // Reordena os filhos do destino conforme targetOrder (append quando 0/MAX).
  return recomputeNodeCodes(reorderChildren(inserted, targetParentId, nodeId, targetOrder))
}

function reorderChildren(
  roots: EapNode[],
  parentId: string | null,
  nodeId: string,
  targetOrder: number,
): EapNode[] {
  const place = (nodes: EapNode[], pid: string | null): EapNode[] => {
    if (pid === null) {
      const idx = nodes.findIndex(n => n.id === nodeId)
      if (idx === -1) return nodes
      const list = [...nodes]
      const [moved] = list.splice(idx, 1)
      const at = Math.min(Math.max(targetOrder, 0), list.length)
      list.splice(at, 0, moved)
      return list
    }
    return nodes.map(node => {
      if (node.id !== pid) return { ...node, children: place(node.children ?? [], pid) }
      const idx = (node.children ?? []).findIndex(n => n.id === nodeId)
      if (idx === -1) return node
      const list = [...(node.children ?? [])]
      const [moved] = list.splice(idx, 1)
      const at = Math.min(Math.max(targetOrder, 0), list.length)
      list.splice(at, 0, moved)
      return { ...node, children: list }
    })
  }
  return place(roots, parentId)
}

function findNodeIn(roots: EapNode[], id: string): EapNode | null {
  const stack: EapNode[] = [...roots]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.id === id) return node
    for (const c of node.children ?? []) stack.push(c)
  }
  return null
}

/** Move um nó para cima (-1) ou para baixo (+1) entre os irmãos. */
export function moveNodeRelative(roots: EapNode[], nodeId: string, delta: -1 | 1): EapNode[] {
  const source = findNodeIn(roots, nodeId)
  if (!source) return roots

  const parentId = findParentId(roots, nodeId)
  const list = parentId === null ? roots : (findNodeIn(roots, parentId)?.children ?? [])
  const idx = list.findIndex(n => n.id === nodeId)
  if (idx === -1) return roots
  const targetIdx = idx + delta
  if (targetIdx < 0 || targetIdx >= list.length) return roots
  return moveNode(roots, nodeId, parentId, targetIdx)
}

/** Pai imediato do nó (null para raiz). */
export function findParentId(roots: EapNode[], nodeId: string): string | null {
  const stack: Array<{ node: EapNode; parentId: string | null }> = roots.map(node => ({ node, parentId: null }))
  while (stack.length > 0) {
    const { node, parentId } = stack.pop()!
    if (node.id === nodeId) return parentId
    for (const c of node.children ?? []) stack.push({ node: c, parentId: node.id })
  }
  return null
}

/** Atualiza o título de um nó. */
export function updateTitle(roots: EapNode[], nodeId: string, title: string): EapNode[] {
  return recomputeNodeCodes(
    mapTree(roots, node => (node.id === nodeId ? { ...node, title } : node)),
  )
}

/** Nós candidatos a "pai" no mover (exclui o próprio nó e descendentes). */
export function listCandidateParents(roots: EapNode[], nodeId: string): EapNode[] {
  const forbidden = collectSubtreeIds(roots, nodeId)
  return flattenForParents(roots).filter(n => !forbidden.has(n.id))
}

function flattenForParents(roots: EapNode[]): EapNode[] {
  const flat: EapNode[] = []
  const stack: EapNode[] = [...roots]
  while (stack.length > 0) {
    const node = stack.pop()!
    flat.push(node)
    for (const c of node.children ?? []) stack.push(c)
  }
  return flat
}