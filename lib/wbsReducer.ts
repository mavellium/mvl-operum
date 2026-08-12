import { v4 as uuidv4 } from 'uuid'
import type {
  WbsTreeState, WbsNodeClient, WbsNodeStyle, WbsNodeProperties,
  WbsLayoutOrientation, WbsHistoryEntry, WbsViewport, DropPosition,
} from '@/types/wbs'
import { recalcCodes } from './wbsCode'

const MAX_HISTORY = 50

export const DEFAULT_STYLE: WbsNodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#d1d5db',
  textColor: '#111827',
  borderWidth: 1,
  fontSize: 14,
  borderRadius: 6,
}

export type WbsAction =
  | { type: 'INSERT_CHILD'; payload: { parentId: string } }
  | { type: 'INSERT_SIBLING'; payload: { siblingId: string } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'RENAME_NODE'; payload: { nodeId: string; title: string } }
  | { type: 'MOVE_NODE'; payload: { nodeId: string; targetId: string; position: DropPosition } }
  | { type: 'SET_LAYOUT'; payload: { nodeId: string; layout: WbsLayoutOrientation } }
  | { type: 'UPDATE_STYLE'; payload: { style: Partial<WbsNodeStyle> } }
  | { type: 'UPDATE_PROPERTIES'; payload: { nodeId: string; properties: Partial<WbsNodeProperties> } }
  | { type: 'SET_COLLAPSED'; payload: { nodeId: string; collapsed: boolean } }
  | { type: 'COPY_STYLE'; payload: { nodeId: string } }
  | { type: 'PASTE_STYLE'; payload: { nodeIds: string[] } }
  | { type: 'PASTE_STYLE_TO_SELECTED' }
  | { type: 'COPY'; payload: { nodeIds: string[] } }
  | { type: 'CUT'; payload: { nodeIds: string[] } }
  | { type: 'PASTE'; payload: { parentId: string } }
  | { type: 'SET_SELECTION'; payload: { nodeIds: string[] } }
  | { type: 'SET_EDITING'; payload: { nodeId: string | null } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_VIEWPORT'; payload: WbsViewport }
  | { type: 'SET_SYNC_STATUS'; payload: Partial<WbsTreeState['sync']> }
  | { type: 'RESET_TREE'; payload?: { rootTitle?: string } }

// ── Helpers ──────────────────────────────────────────────────────────────────

function collectSubtree(rootId: string, nodes: Record<string, WbsNodeClient>): Set<string> {
  const ids = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (ids.has(id) || !nodes[id]) continue
    ids.add(id)
    nodes[id].childrenIds.forEach(cid => stack.push(cid))
  }
  return ids
}

function isInSubtree(candidate: string, subtreeRoot: string, nodes: Record<string, WbsNodeClient>): boolean {
  return collectSubtree(subtreeRoot, nodes).has(candidate)
}

/** Recompacta orders 0,1,2… e atualiza childrenIds do pai. */
function recompactChildren(parentId: string, nodes: Record<string, WbsNodeClient>): Record<string, WbsNodeClient> {
  const result = { ...nodes }
  const parent = result[parentId]
  if (!parent) return result

  const sorted = parent.childrenIds
    .map(id => result[id])
    .filter((n): n is WbsNodeClient => Boolean(n))
    .sort((a, b) => a.order - b.order)

  sorted.forEach((child, idx) => {
    result[child.id] = { ...result[child.id], order: idx }
  })
  result[parentId] = { ...result[parentId], childrenIds: sorted.map(c => c.id) }
  return result
}

function pushHistory(state: WbsTreeState): WbsTreeState['history'] {
  const entry: WbsHistoryEntry = { nodes: state.nodes, rootId: state.rootId }
  return {
    past: [...state.history.past.slice(-(MAX_HISTORY - 1)), entry],
    future: [],
  }
}

function makeNode(parentId: string | null, order: number, style: WbsNodeStyle): WbsNodeClient {
  return {
    id: uuidv4(),
    parentId,
    order,
    code: '',
    title: 'Novo elemento',
    layout: 'LADO_A_LADO',
    collapsed: false,
    style: { ...style },
    properties: {},
    childrenIds: [],
  }
}

/** Clone profundo iterativo — novos IDs, mantém estrutura interna. */
function cloneSubtree(
  rootId: string,
  nodes: Record<string, WbsNodeClient>
): { cloned: Record<string, WbsNodeClient>; newRootId: string } {
  const idMap = new Map<string, string>()
  const stack = [rootId]
  const order: string[] = []

  while (stack.length > 0) {
    const id = stack.pop()!
    if (!nodes[id] || idMap.has(id)) continue
    idMap.set(id, uuidv4())
    order.push(id)
    for (let i = nodes[id].childrenIds.length - 1; i >= 0; i--) {
      stack.push(nodes[id].childrenIds[i])
    }
  }

  const cloned: Record<string, WbsNodeClient> = {}
  for (const id of order) {
    const n = nodes[id]
    const newId = idMap.get(id)!
    cloned[newId] = {
      ...n,
      id: newId,
      parentId: n.parentId ? (idMap.get(n.parentId) ?? null) : null,
      childrenIds: n.childrenIds.map(cid => idMap.get(cid) ?? cid),
    }
  }
  return { cloned, newRootId: idMap.get(rootId)! }
}

// ── Reducer ──────────────────────────────────────────────────────────────────

export function wbsReducer(state: WbsTreeState, action: WbsAction): WbsTreeState {
  switch (action.type) {

    case 'INSERT_CHILD': {
      const { parentId } = action.payload
      const parent = state.nodes[parentId]
      if (!parent) return state

      const newNode = makeNode(parentId, parent.childrenIds.length, parent.style)
      let newNodes: Record<string, WbsNodeClient> = {
        ...state.nodes,
        [newNode.id]: newNode,
        [parentId]: { ...parent, childrenIds: [...parent.childrenIds, newNode.id] },
      }
      newNodes = recalcCodes(newNodes)
      return { ...state, nodes: newNodes, history: pushHistory(state), sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'INSERT_SIBLING': {
      const { siblingId } = action.payload
      const sibling = state.nodes[siblingId]
      if (!sibling || sibling.parentId === null) return state

      const parentId = sibling.parentId
      const parent = state.nodes[parentId]
      if (!parent) return state

      const newOrder = sibling.order + 1
      let newNodes: Record<string, WbsNodeClient> = { ...state.nodes }

      // Deslocar irmãos posteriores
      for (const cid of parent.childrenIds) {
        const child = newNodes[cid]
        if (child && child.order >= newOrder) {
          newNodes[cid] = { ...child, order: child.order + 1 }
        }
      }

      const newNode = makeNode(parentId, newOrder, sibling.style)
      newNodes[newNode.id] = newNode

      const allChildren = [...parent.childrenIds, newNode.id]
        .map(id => newNodes[id])
        .filter((n): n is WbsNodeClient => Boolean(n))
        .sort((a, b) => a.order - b.order)

      newNodes[parentId] = { ...newNodes[parentId], childrenIds: allChildren.map(c => c.id) }
      newNodes = recalcCodes(newNodes)
      return { ...state, nodes: newNodes, history: pushHistory(state), sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'DELETE_NODE': {
      const { nodeId } = action.payload
      const node = state.nodes[nodeId]
      if (!node) return state

      const toDelete = collectSubtree(nodeId, state.nodes)
      let newNodes: Record<string, WbsNodeClient> = { ...state.nodes }
      toDelete.forEach(id => { delete newNodes[id] })

      const parentId = node.parentId
      if (parentId && newNodes[parentId]) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          childrenIds: newNodes[parentId].childrenIds.filter(id => !toDelete.has(id)),
        }
        newNodes = recompactChildren(parentId, newNodes)
      }

      const newRootId = toDelete.has(state.rootId ?? '') ? null : state.rootId
      if (newRootId) newNodes = recalcCodes(newNodes)

      return {
        ...state,
        nodes: newNodes,
        rootId: newRootId,
        selectedNodeIds: state.selectedNodeIds.filter(id => !toDelete.has(id)),
        editingNodeId: toDelete.has(state.editingNodeId ?? '') ? null : state.editingNodeId,
        history: pushHistory(state),
        sync: { ...state.sync, status: 'DIRTY' },
      }
    }

    case 'RENAME_NODE': {
      const { nodeId, title } = action.payload
      const node = state.nodes[nodeId]
      if (!node) return state
      return { ...state, nodes: { ...state.nodes, [nodeId]: { ...node, title } }, sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'MOVE_NODE': {
      const { nodeId, targetId, position } = action.payload
      const node = state.nodes[nodeId]
      const target = state.nodes[targetId]
      if (!node || !target) return state

      // Prevenção de ciclo
      if (targetId === nodeId || isInSubtree(targetId, nodeId, state.nodes)) return state

      const newParentId = position === 'INSIDE' ? targetId : target.parentId
      const oldParentId = node.parentId

      // 1. Remover do pai antigo
      let newNodes: Record<string, WbsNodeClient> = { ...state.nodes }
      if (oldParentId && newNodes[oldParentId]) {
        newNodes[oldParentId] = {
          ...newNodes[oldParentId],
          childrenIds: newNodes[oldParentId].childrenIds.filter(id => id !== nodeId),
        }
        newNodes = recompactChildren(oldParentId, newNodes)
      }

      // 2. Calcular order de inserção (usando ordens pós-recompact)
      let insertOrder: number
      if (position === 'INSIDE') {
        insertOrder = newNodes[targetId]?.childrenIds.length ?? 0
      } else {
        const updatedTarget = newNodes[targetId]
        if (!updatedTarget) return state
        insertOrder = position === 'BEFORE' ? updatedTarget.order : updatedTarget.order + 1
      }

      // 3. Deslocar irmãos no novo pai
      if (newParentId && newNodes[newParentId]) {
        for (const cid of newNodes[newParentId].childrenIds) {
          if (newNodes[cid] && newNodes[cid].order >= insertOrder) {
            newNodes[cid] = { ...newNodes[cid], order: newNodes[cid].order + 1 }
          }
        }
      }

      // 4. Posicionar o nó
      newNodes[nodeId] = { ...newNodes[nodeId], parentId: newParentId, order: insertOrder }

      // 5. Atualizar childrenIds do novo pai e recompactar
      if (newParentId && newNodes[newParentId]) {
        const newChildIds = [...newNodes[newParentId].childrenIds, nodeId]
          .filter(id => newNodes[id])
          .sort((a, b) => newNodes[a].order - newNodes[b].order)
        newNodes[newParentId] = { ...newNodes[newParentId], childrenIds: newChildIds }
        newNodes = recompactChildren(newParentId, newNodes)
      }

      // 6. Recalcular codes
      if (state.rootId) newNodes = recalcCodes(newNodes)

      return { ...state, nodes: newNodes, history: pushHistory(state), sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'SET_LAYOUT': {
      const { nodeId, layout } = action.payload
      const node = state.nodes[nodeId]
      if (!node) return state
      return { ...state, nodes: { ...state.nodes, [nodeId]: { ...node, layout } }, sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'UPDATE_STYLE': {
      const { style } = action.payload
      if (state.selectedNodeIds.length === 0) return state
      const updated = { ...state.nodes }
      for (const id of state.selectedNodeIds) {
        if (!updated[id]) continue
        updated[id] = { ...updated[id], style: { ...updated[id].style, ...style } }
      }
      return { ...state, nodes: updated, history: pushHistory(state), sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'UPDATE_PROPERTIES': {
      const { nodeId, properties } = action.payload
      const node = state.nodes[nodeId]
      if (!node) return state
      return {
        ...state,
        nodes: { ...state.nodes, [nodeId]: { ...node, properties: { ...node.properties, ...properties } } },
        sync: { ...state.sync, status: 'DIRTY' },
      }
    }

    case 'SET_COLLAPSED': {
      const { nodeId, collapsed } = action.payload
      const node = state.nodes[nodeId]
      if (!node) return state
      return { ...state, nodes: { ...state.nodes, [nodeId]: { ...node, collapsed } } }
    }

    case 'COPY_STYLE': {
      const node = state.nodes[action.payload.nodeId]
      if (!node) return state
      return { ...state, clipboard: { ...state.clipboard, copiedStyle: { ...node.style }, actionType: null } }
    }

    case 'PASTE_STYLE': {
      const style = state.clipboard.copiedStyle
      if (!style) return state
      const newNodes = { ...state.nodes }
      for (const id of action.payload.nodeIds) {
        if (newNodes[id]) newNodes[id] = { ...newNodes[id], style: { ...style } }
      }
      return { ...state, nodes: newNodes, sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'PASTE_STYLE_TO_SELECTED': {
      const style = state.clipboard.copiedStyle
      if (!style || state.selectedNodeIds.length === 0) return state
      const updated = { ...state.nodes }
      for (const id of state.selectedNodeIds) {
        if (!updated[id]) continue
        updated[id] = { ...updated[id], style: { ...style } }
      }
      return { ...state, nodes: updated, history: pushHistory(state), sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'COPY': {
      const allNodes: WbsNodeClient[] = []
      const seen = new Set<string>()
      for (const id of action.payload.nodeIds) {
        collectSubtree(id, state.nodes).forEach(sid => {
          if (!seen.has(sid)) { seen.add(sid); allNodes.push(state.nodes[sid]) }
        })
      }
      return { ...state, clipboard: { ...state.clipboard, nodes: allNodes, actionType: 'COPY' } }
    }

    case 'CUT': {
      const allNodes: WbsNodeClient[] = []
      const seen = new Set<string>()
      let newNodes = { ...state.nodes }
      let newRootId = state.rootId

      for (const id of action.payload.nodeIds) {
        const subtree = collectSubtree(id, state.nodes)
        subtree.forEach(sid => {
          if (!seen.has(sid)) { seen.add(sid); allNodes.push(state.nodes[sid]) }
          delete newNodes[sid]
        })
        const parentId = state.nodes[id]?.parentId
        if (parentId && newNodes[parentId]) {
          newNodes[parentId] = { ...newNodes[parentId], childrenIds: newNodes[parentId].childrenIds.filter(cid => !subtree.has(cid)) }
          newNodes = recompactChildren(parentId, newNodes)
        }
        if (subtree.has(newRootId ?? '')) newRootId = null
      }

      if (newRootId) newNodes = recalcCodes(newNodes)
      return {
        ...state,
        nodes: newNodes,
        rootId: newRootId,
        clipboard: { ...state.clipboard, nodes: allNodes, actionType: 'CUT' },
        selectedNodeIds: [],
        history: pushHistory(state),
        sync: { ...state.sync, status: 'DIRTY' },
      }
    }

    case 'PASTE': {
      const { parentId } = action.payload
      const parent = state.nodes[parentId]
      if (!parent || state.clipboard.nodes.length === 0) return state

      const clipMap: Record<string, WbsNodeClient> = {}
      state.clipboard.nodes.forEach(n => { clipMap[n.id] = n })
      const clipIds = new Set(state.clipboard.nodes.map(n => n.id))
      const roots = state.clipboard.nodes.filter(n => !n.parentId || !clipIds.has(n.parentId))

      let newNodes = { ...state.nodes }
      let insertOrder = parent.childrenIds.length

      for (const root of roots) {
        const { cloned, newRootId } = cloneSubtree(root.id, clipMap)
        Object.assign(newNodes, cloned)
        newNodes[newRootId] = { ...newNodes[newRootId], parentId, order: insertOrder }
        newNodes[parentId] = { ...newNodes[parentId], childrenIds: [...newNodes[parentId].childrenIds, newRootId] }
        insertOrder++
      }

      if (state.rootId) newNodes = recalcCodes(newNodes)
      return { ...state, nodes: newNodes, history: pushHistory(state), sync: { ...state.sync, status: 'DIRTY' } }
    }

    case 'SET_SELECTION':
      return { ...state, selectedNodeIds: action.payload.nodeIds }

    case 'SET_EDITING':
      return { ...state, editingNodeId: action.payload.nodeId }

    case 'UNDO': {
      if (state.history.past.length === 0) return state
      const past = [...state.history.past]
      const entry = past.pop()!
      const current: WbsHistoryEntry = { nodes: state.nodes, rootId: state.rootId }
      return { ...state, nodes: entry.nodes, rootId: entry.rootId, history: { past, future: [current, ...state.history.future] } }
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state
      const [entry, ...future] = state.history.future
      const current: WbsHistoryEntry = { nodes: state.nodes, rootId: state.rootId }
      return { ...state, nodes: entry.nodes, rootId: entry.rootId, history: { past: [...state.history.past, current], future } }
    }

    case 'SET_VIEWPORT':
      return { ...state, viewport: action.payload }

    case 'SET_SYNC_STATUS':
      return { ...state, sync: { ...state.sync, ...action.payload } }

    case 'RESET_TREE': {
      const rootId = uuidv4()
      const root: WbsNodeClient = {
        id: rootId, parentId: null, order: 0, code: '1',
        title: action.payload?.rootTitle ?? 'Projeto',
        layout: 'LADO_A_LADO', collapsed: false,
        style: { ...DEFAULT_STYLE }, properties: {}, childrenIds: [],
      }
      return {
        ...state,
        nodes: { [rootId]: root },
        rootId,
        selectedNodeIds: [],
        editingNodeId: null,
        history: pushHistory(state),
        sync: { ...state.sync, status: 'DIRTY' },
      }
    }

    default:
      return state
  }
}
