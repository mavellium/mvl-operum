import prisma from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma'
import { registrarAcao } from './auditoriaService'
import { recalcCodes } from '@/lib/wbsCode'
import type { WbsNodeClient, WbsNodeStyle, WbsNodeProperties, WbsLayoutOrientation } from '@/types/wbs'
import { WBS_LIMITS } from '@/lib/validation/wbsSchemas'
import type {
  InsertChildInput,
  InsertSiblingInput,
  DeleteNodeInput,
  MoveNodeInput,
  RenameNodeInput,
  UpdateNodeStyleInput,
  UpdateNodePropertiesInput,
  SetLayoutInput,
  SetCollapsedInput,
  SaveTreeInput,
} from '@/lib/validation/wbsSchemas'

// ── Error types ──────────────────────────────────────────────────────────────

export class WbsConflictError extends Error {
  constructor() { super('A EAP foi modificada por outro usuário'); this.name = 'WbsConflictError' }
}

export class WbsNotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'WbsNotFoundError' }
}

export class WbsValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'WbsValidationError' }
}

// ── Public result types ──────────────────────────────────────────────────────

export interface GetTreeResult {
  nodes: Record<string, WbsNodeClient>
  rootId: string | null
  serverVersion: number
}

export interface MutationResult {
  serverVersion: number
}

export interface InsertResult extends MutationResult {
  nodeId: string
}

export type SaveResult =
  | ({ ok: true } & MutationResult)
  | { ok: false; reason: 'CONFLICT' }

// ── Internal ─────────────────────────────────────────────────────────────────

const DEFAULT_STYLE: WbsNodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#d1d5db',
  textColor: '#111827',
  borderWidth: 1,
  fontSize: 14,
  borderRadius: 6,
}

type Tx = Prisma.TransactionClient

const toJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue

type DbRow = {
  id: string
  parentId: string | null
  order: number
  code: string
  title: string
  layout: string
  collapsed: boolean
  style: unknown
  properties: unknown
  version: number
}

function buildClientMap(rows: DbRow[]): Record<string, WbsNodeClient> {
  const nodes: Record<string, WbsNodeClient> = {}
  for (const row of rows) {
    nodes[row.id] = {
      id: row.id,
      parentId: row.parentId,
      order: row.order,
      code: row.code,
      title: row.title,
      layout: row.layout as WbsLayoutOrientation,
      collapsed: row.collapsed,
      style: row.style as WbsNodeStyle,
      properties: row.properties as WbsNodeProperties,
      childrenIds: [],
    }
  }
  // rows are ORDER BY order ASC from DB — children push in correct order
  for (const row of rows) {
    if (row.parentId && nodes[row.parentId]) {
      nodes[row.parentId].childrenIds.push(row.id)
    }
  }
  return nodes
}

/**
 * Recalculates WBS codes for all project nodes in memory, then batch-updates
 * only the nodes whose code changed.
 */
async function syncCodes(tx: Tx, projectId: string, tenantId: string): Promise<void> {
  const rows = await tx.wbsNode.findMany({
    where: { projectId, tenantId },
    orderBy: { order: 'asc' },
  })
  const nodes = buildClientMap(rows)
  const recalculated = recalcCodes(nodes)
  for (const row of rows) {
    const newCode = recalculated[row.id]?.code
    if (newCode !== undefined && newCode !== row.code) {
      await tx.wbsNode.update({ where: { id: row.id }, data: { code: newCode } })
    }
  }
}

/** Increments the root node's version field and returns the new value. */
async function bumpVersion(tx: Tx, projectId: string, tenantId: string): Promise<number> {
  const root = await tx.wbsNode.findFirst({
    where: { projectId, tenantId, parentId: null },
    select: { id: true, version: true },
  })
  if (!root) return 0
  const updated = await tx.wbsNode.update({
    where: { id: root.id },
    data: { version: root.version + 1 },
    select: { version: true },
  })
  return updated.version
}

/**
 * Shifts siblings at >= startOrder up by 1 to make room for an insert.
 * Processes DESC to avoid (parentId, order) unique-constraint violations.
 */
async function shiftSiblingsUp(
  tx: Tx,
  parentId: string,
  projectId: string,
  tenantId: string,
  startOrder: number,
): Promise<void> {
  const toShift = await tx.wbsNode.findMany({
    where: { parentId, projectId, tenantId, order: { gte: startOrder } },
    orderBy: { order: 'desc' },
    select: { id: true, order: true },
  })
  for (const n of toShift) {
    await tx.wbsNode.update({ where: { id: n.id }, data: { order: n.order + 1 } })
  }
}

/**
 * Recompacts children to 0, 1, 2, … after a deletion or move.
 * Processes ASC to avoid violations when decrementing.
 */
async function recompactChildren(
  tx: Tx,
  parentId: string | null,
  projectId: string,
  tenantId: string,
): Promise<void> {
  const children = await tx.wbsNode.findMany({
    where: { parentId, projectId, tenantId },
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  })
  for (let i = 0; i < children.length; i++) {
    if (children[i].order !== i) {
      await tx.wbsNode.update({ where: { id: children[i].id }, data: { order: i } })
    }
  }
}

/** Walks parent chain to compute depth of nodeId (root = 1). Max 20 iterations. */
async function calcDepth(tx: Tx, nodeId: string): Promise<number> {
  let depth = 1
  let currentId: string | null = nodeId
  const seen = new Set<string>()
  while (currentId) {
    if (seen.has(currentId)) break
    seen.add(currentId)
    const row: { parentId: string | null } | null = await tx.wbsNode.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    })
    if (!row?.parentId) break
    currentId = row.parentId
    depth++
  }
  return depth
}

/** BFS to collect all descendant IDs of nodeId (inclusive). */
async function collectSubtreeIds(tx: Tx, nodeId: string): Promise<string[]> {
  const ids: string[] = []
  const queue = [nodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    ids.push(id)
    const children = await tx.wbsNode.findMany({
      where: { parentId: id },
      select: { id: true },
    })
    queue.push(...children.map(c => c.id))
  }
  return ids
}

// ── Public service functions ─────────────────────────────────────────────────

/**
 * Returns the full WBS tree for a project. Single DB query, O(n) in-memory assembly.
 */
export async function getTree(projectId: string, tenantId: string): Promise<GetTreeResult> {
  const rows = await prisma.wbsNode.findMany({
    where: { projectId, tenantId },
    orderBy: { order: 'asc' },
  })
  const nodes = buildClientMap(rows)
  const root = rows.find(r => r.parentId === null) ?? null
  return { nodes, rootId: root?.id ?? null, serverVersion: root?.version ?? 0 }
}

/**
 * Inserts a new child node under parentId. Recalculates all codes.
 */
export async function insertChild(
  input: InsertChildInput,
  userId?: string,
): Promise<InsertResult> {
  return prisma.$transaction(async tx => {
    const { parentId, projectId, tenantId } = input

    const [count, parent] = await Promise.all([
      tx.wbsNode.count({ where: { projectId, tenantId } }),
      tx.wbsNode.findFirst({ where: { id: parentId, projectId, tenantId } }),
    ])
    if (!parent) throw new WbsNotFoundError('Nó pai não encontrado')
    if (count >= WBS_LIMITS.MAX_NODES) {
      throw new WbsValidationError(`Máximo de ${WBS_LIMITS.MAX_NODES} nós por projeto`)
    }
    const depth = await calcDepth(tx, parentId)
    if (depth >= WBS_LIMITS.MAX_DEPTH) {
      throw new WbsValidationError(`Profundidade máxima de ${WBS_LIMITS.MAX_DEPTH} atingida`)
    }

    const childCount = await tx.wbsNode.count({ where: { parentId, projectId, tenantId } })
    const newNode = await tx.wbsNode.create({
      data: {
        tenantId, projectId, parentId,
        order: childCount,
        code: '',
        title: 'Novo elemento',
        layout: 'LADO_A_LADO',
        collapsed: false,
        style: toJson(DEFAULT_STYLE),
        properties: toJson({}),
      },
    })

    await syncCodes(tx, projectId, tenantId)
    const serverVersion = await bumpVersion(tx, projectId, tenantId)

    if (userId) {
      await registrarAcao({
        tenantId, userId, action: 'CREATE', entity: 'WbsNode',
        entityId: newNode.id, details: { parentId },
      })
    }
    return { nodeId: newNode.id, serverVersion }
  })
}

/**
 * Inserts a sibling immediately after siblingId. Root cannot have siblings.
 */
export async function insertSibling(
  input: InsertSiblingInput,
  userId?: string,
): Promise<InsertResult> {
  return prisma.$transaction(async tx => {
    const { siblingId, projectId, tenantId } = input

    const [count, sibling] = await Promise.all([
      tx.wbsNode.count({ where: { projectId, tenantId } }),
      tx.wbsNode.findFirst({ where: { id: siblingId, projectId, tenantId } }),
    ])
    if (!sibling) throw new WbsNotFoundError('Nó irmão não encontrado')
    if (!sibling.parentId) throw new WbsValidationError('A raiz não pode ter irmão')
    if (count >= WBS_LIMITS.MAX_NODES) {
      throw new WbsValidationError(`Máximo de ${WBS_LIMITS.MAX_NODES} nós por projeto`)
    }

    const newOrder = sibling.order + 1
    await shiftSiblingsUp(tx, sibling.parentId, projectId, tenantId, newOrder)

    const newNode = await tx.wbsNode.create({
      data: {
        tenantId, projectId,
        parentId: sibling.parentId,
        order: newOrder,
        code: '',
        title: 'Novo elemento',
        layout: sibling.layout,
        collapsed: false,
        style: toJson(sibling.style),
        properties: toJson({}),
      },
    })

    await syncCodes(tx, projectId, tenantId)
    const serverVersion = await bumpVersion(tx, projectId, tenantId)

    if (userId) {
      await registrarAcao({
        tenantId, userId, action: 'CREATE', entity: 'WbsNode',
        entityId: newNode.id, details: { parentId: sibling.parentId },
      })
    }
    return { nodeId: newNode.id, serverVersion }
  })
}

/**
 * Deletes a node and its entire subtree. Root cannot be deleted here — use resetTree.
 */
export async function deleteNode(
  input: DeleteNodeInput,
  userId?: string,
): Promise<MutationResult> {
  return prisma.$transaction(async tx => {
    const { nodeId, projectId, tenantId } = input

    const node = await tx.wbsNode.findFirst({ where: { id: nodeId, projectId, tenantId } })
    if (!node) throw new WbsNotFoundError('Nó não encontrado')
    if (!node.parentId) throw new WbsValidationError('Use resetTree para limpar a EAP inteira')

    const subtreeIds = await collectSubtreeIds(tx, nodeId)
    // delete children-first to satisfy FK order; deleteMany with CASCADE handles it in PG
    await tx.wbsNode.deleteMany({ where: { id: { in: subtreeIds }, projectId, tenantId } })
    await recompactChildren(tx, node.parentId, projectId, tenantId)
    await syncCodes(tx, projectId, tenantId)
    const serverVersion = await bumpVersion(tx, projectId, tenantId)

    if (userId) {
      await registrarAcao({
        tenantId, userId, action: 'DELETE', entity: 'WbsNode',
        entityId: nodeId, details: { subtreeSize: subtreeIds.length },
      })
    }
    return { serverVersion }
  })
}

/**
 * Moves a node to a new position with cycle-prevention.
 * INSIDE → becomes last child of target.
 * BEFORE / AFTER → becomes sibling of target at the respective position.
 *
 * Temporarily detaches the node (parentId: null, order: -1) to avoid
 * unique-constraint conflicts during sibling recompaction. This is safe because
 * PostgreSQL treats NULLs as distinct in multi-column unique indexes.
 */
export async function moveNode(
  input: MoveNodeInput,
  userId?: string,
): Promise<MutationResult> {
  return prisma.$transaction(async tx => {
    const { nodeId, targetId, position, projectId, tenantId } = input

    if (nodeId === targetId) throw new WbsValidationError('Nó não pode ser movido para si mesmo')

    const [node, target] = await Promise.all([
      tx.wbsNode.findFirst({ where: { id: nodeId, projectId, tenantId } }),
      tx.wbsNode.findFirst({ where: { id: targetId, projectId, tenantId } }),
    ])
    if (!node) throw new WbsNotFoundError('Nó a mover não encontrado')
    if (!target) throw new WbsNotFoundError('Nó destino não encontrado')
    if (!node.parentId) throw new WbsValidationError('A raiz não pode ser movida')

    // Cycle prevention
    const subtreeIds = await collectSubtreeIds(tx, nodeId)
    if (subtreeIds.includes(targetId)) {
      throw new WbsValidationError('Movimento criaria ciclo na hierarquia')
    }

    // Depth check for INSIDE moves
    if (position === 'INSIDE') {
      const targetDepth = await calcDepth(tx, targetId)
      if (targetDepth + 1 > WBS_LIMITS.MAX_DEPTH) {
        throw new WbsValidationError(`Movimento excederia profundidade máxima de ${WBS_LIMITS.MAX_DEPTH}`)
      }
    }

    const oldParentId = node.parentId

    // Detach temporarily — safe because (null, -1) is always distinct in PG unique index
    await tx.wbsNode.update({ where: { id: nodeId }, data: { parentId: null, order: -1 } })
    await recompactChildren(tx, oldParentId, projectId, tenantId)

    let newParentId: string
    let newOrder: number

    if (position === 'INSIDE') {
      newParentId = targetId
      newOrder = await tx.wbsNode.count({ where: { parentId: targetId, projectId, tenantId } })
    } else {
      if (!target.parentId) throw new WbsValidationError('Não é possível inserir irmão da raiz')
      newParentId = target.parentId
      // Re-read after possible recompaction of the same parent
      const freshTarget = await tx.wbsNode.findUnique({
        where: { id: targetId },
        select: { order: true },
      })
      const baseOrder = freshTarget?.order ?? target.order
      newOrder = position === 'BEFORE' ? baseOrder : baseOrder + 1
      await shiftSiblingsUp(tx, newParentId, projectId, tenantId, newOrder)
    }

    await tx.wbsNode.update({
      where: { id: nodeId },
      data: { parentId: newParentId, order: newOrder },
    })

    await syncCodes(tx, projectId, tenantId)
    const serverVersion = await bumpVersion(tx, projectId, tenantId)

    if (userId) {
      await registrarAcao({
        tenantId, userId, action: 'UPDATE', entity: 'WbsNode',
        entityId: nodeId, details: { action: 'MOVE', targetId, position },
      })
    }
    return { serverVersion }
  })
}

/** Renames a node title. */
export async function renameNode(input: RenameNodeInput): Promise<MutationResult> {
  return prisma.$transaction(async tx => {
    const { nodeId, title, projectId, tenantId } = input
    const node = await tx.wbsNode.findFirst({ where: { id: nodeId, projectId, tenantId } })
    if (!node) throw new WbsNotFoundError('Nó não encontrado')
    await tx.wbsNode.update({ where: { id: nodeId }, data: { title } })
    const serverVersion = await bumpVersion(tx, projectId, tenantId)
    return { serverVersion }
  })
}

/** Merges a partial style update into the node's existing style. */
export async function updateNodeStyle(input: UpdateNodeStyleInput): Promise<MutationResult> {
  return prisma.$transaction(async tx => {
    const { nodeId, style, projectId, tenantId } = input
    const node = await tx.wbsNode.findFirst({ where: { id: nodeId, projectId, tenantId } })
    if (!node) throw new WbsNotFoundError('Nó não encontrado')
    await tx.wbsNode.update({
      where: { id: nodeId },
      data: { style: toJson({ ...(node.style as object), ...style }) },
    })
    const serverVersion = await bumpVersion(tx, projectId, tenantId)
    return { serverVersion }
  })
}

/** Merges properties (cost, durationDays, owner, description) into the node. */
export async function updateNodeProperties(input: UpdateNodePropertiesInput): Promise<MutationResult> {
  return prisma.$transaction(async tx => {
    const { nodeId, properties, projectId, tenantId } = input
    const node = await tx.wbsNode.findFirst({ where: { id: nodeId, projectId, tenantId } })
    if (!node) throw new WbsNotFoundError('Nó não encontrado')
    await tx.wbsNode.update({
      where: { id: nodeId },
      data: { properties: toJson({ ...(node.properties as object), ...properties }) },
    })
    const serverVersion = await bumpVersion(tx, projectId, tenantId)
    return { serverVersion }
  })
}

/** Changes the layout orientation of a node. */
export async function setLayout(input: SetLayoutInput): Promise<MutationResult> {
  return prisma.$transaction(async tx => {
    const { nodeId, layout, projectId, tenantId } = input
    const node = await tx.wbsNode.findFirst({ where: { id: nodeId, projectId, tenantId } })
    if (!node) throw new WbsNotFoundError('Nó não encontrado')
    await tx.wbsNode.update({ where: { id: nodeId }, data: { layout } })
    const serverVersion = await bumpVersion(tx, projectId, tenantId)
    return { serverVersion }
  })
}

/** Collapses or expands a node in the tree view. */
export async function setCollapsed(input: SetCollapsedInput): Promise<MutationResult> {
  return prisma.$transaction(async tx => {
    const { nodeId, collapsed, projectId, tenantId } = input
    const node = await tx.wbsNode.findFirst({ where: { id: nodeId, projectId, tenantId } })
    if (!node) throw new WbsNotFoundError('Nó não encontrado')
    await tx.wbsNode.update({ where: { id: nodeId }, data: { collapsed } })
    const serverVersion = await bumpVersion(tx, projectId, tenantId)
    return { serverVersion }
  })
}

/**
 * Full-tree atomic replace (autosave).
 *
 * Checks serverVersion for optimistic concurrency — returns CONFLICT if another
 * session has written since the client loaded the tree.
 * Server always recalculates codes (client-supplied codes are ignored).
 */
export async function saveTree(
  input: SaveTreeInput,
  userId?: string,
): Promise<SaveResult> {
  return prisma.$transaction(async tx => {
    const { projectId, tenantId, serverVersion, nodes, rootId } = input

    // Optimistic concurrency check via root node's version field
    const currentRoot = rootId
      ? await tx.wbsNode.findFirst({
          where: { id: rootId, projectId, tenantId },
          select: { version: true },
        })
      : await tx.wbsNode.findFirst({
          where: { projectId, tenantId, parentId: null },
          select: { version: true },
        })
    const currentVersion = currentRoot?.version ?? 0
    if (currentVersion !== serverVersion) {
      return { ok: false, reason: 'CONFLICT' as const }
    }

    const recalculated = rootId ? recalcCodes(nodes) : nodes
    const nodeValues = Object.values(recalculated)
    const newVersion = serverVersion + 1

    await tx.wbsNode.deleteMany({ where: { projectId, tenantId } })
    if (nodeValues.length > 0) {
      await tx.wbsNode.createMany({
        data: nodeValues.map(n => ({
          id: n.id,
          tenantId,
          projectId,
          parentId: n.parentId,
          order: n.order,
          code: n.code,
          title: n.title,
          layout: n.layout,
          collapsed: n.collapsed,
          style: toJson(n.style),
          properties: toJson(n.properties),
          // Version is only tracked on root; rest default to 0
          version: n.parentId === null ? newVersion : 0,
        })),
      })
    }

    if (userId) {
      await registrarAcao({
        tenantId, userId, action: 'UPDATE', entity: 'WbsNode',
        entityId: projectId, details: { action: 'SAVE_TREE', nodeCount: nodeValues.length },
      })
    }
    return { ok: true, serverVersion: newVersion }
  })
}

/**
 * Deletes all nodes for the project and creates a single root node.
 * Audited. Used for "novo projeto" and "redefinir EAP" flows.
 */
export async function resetTree(
  input: { projectId: string; tenantId: string; rootTitle?: string },
  userId: string,
): Promise<InsertResult> {
  return prisma.$transaction(async tx => {
    const { projectId, tenantId, rootTitle = 'Projeto' } = input

    await tx.wbsNode.deleteMany({ where: { projectId, tenantId } })
    const root = await tx.wbsNode.create({
      data: {
        tenantId, projectId,
        parentId: null,
        order: 0,
        code: '1',
        title: rootTitle,
        layout: 'LADO_A_LADO',
        collapsed: false,
        style: toJson(DEFAULT_STYLE),
        properties: toJson({}),
        version: 1,
      },
    })

    await registrarAcao({
      tenantId, userId, action: 'DELETE', entity: 'WbsNode',
      entityId: projectId, details: { action: 'RESET_TREE', rootTitle },
    })
    return { nodeId: root.id, serverVersion: 1 }
  })
}
