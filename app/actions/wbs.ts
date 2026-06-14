'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import {
  InsertChildSchema,
  InsertSiblingSchema,
  DeleteNodeSchema,
  MoveNodeSchema,
  RenameNodeSchema,
  UpdateNodeStyleSchema,
  UpdateNodePropertiesSchema,
  SetLayoutSchema,
  SetCollapsedSchema,
  SaveTreeSchema,
  WbsImportSchema,
} from '@/lib/validation/wbsSchemas'
import {
  getTree,
  insertChild,
  insertSibling,
  deleteNode,
  moveNode,
  renameNode,
  updateNodeStyle,
  updateNodeProperties,
  setLayout,
  setCollapsed,
  saveTree,
  WbsConflictError,
  WbsValidationError,
} from '@/services/wbsService'
import type { GetTreeResult } from '@/services/wbsService'
import type { WbsImportData } from '@/lib/validation/wbsSchemas'

// ── Helpers ──────────────────────────────────────────────────────────────────

type Ok<T> = { ok: true } & T
type Err = { ok: false; error: string; conflict?: boolean }
type Result<T> = Ok<T> | Err

function err(e: unknown): Err {
  if (e instanceof WbsConflictError) return { ok: false, error: e.message, conflict: true }
  if (e instanceof WbsValidationError) return { ok: false, error: e.message }
  return { ok: false, error: e instanceof Error ? e.message : 'Erro inesperado' }
}

const wbsPath = (projetoId: string) => `/projetos/${projetoId}/wbs`

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getWbsTreeAction(projetoId: string): Promise<Result<GetTreeResult>> {
  try {
    const { tenantId } = await verifySession()
    const tree = await getTree(projetoId, tenantId)
    return { ok: true, ...tree }
  } catch (e) {
    return err(e)
  }
}

// ── Structural mutations ──────────────────────────────────────────────────────

export async function insertChildAction(
  projetoId: string,
  parentId: string,
): Promise<Result<{ nodeId: string; serverVersion: number }>> {
  try {
    const { userId, tenantId } = await verifySession()
    const parsed = InsertChildSchema.safeParse({ parentId, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await insertChild(parsed.data, userId)
    revalidatePath(wbsPath(projetoId))
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

export async function insertSiblingAction(
  projetoId: string,
  siblingId: string,
): Promise<Result<{ nodeId: string; serverVersion: number }>> {
  try {
    const { userId, tenantId } = await verifySession()
    const parsed = InsertSiblingSchema.safeParse({ siblingId, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await insertSibling(parsed.data, userId)
    revalidatePath(wbsPath(projetoId))
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

export async function deleteNodeAction(
  projetoId: string,
  nodeId: string,
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { userId, tenantId } = await verifySession()
    const parsed = DeleteNodeSchema.safeParse({ nodeId, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await deleteNode(parsed.data, userId)
    revalidatePath(wbsPath(projetoId))
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

export async function moveNodeAction(
  projetoId: string,
  payload: { nodeId: string; targetId: string; position: 'INSIDE' | 'BEFORE' | 'AFTER' },
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { userId, tenantId } = await verifySession()
    const parsed = MoveNodeSchema.safeParse({ ...payload, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await moveNode(parsed.data, userId)
    revalidatePath(wbsPath(projetoId))
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

// ── Metadata mutations ────────────────────────────────────────────────────────

export async function renameNodeAction(
  projetoId: string,
  nodeId: string,
  title: string,
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { tenantId } = await verifySession()
    const parsed = RenameNodeSchema.safeParse({ nodeId, title, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await renameNode(parsed.data)
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

export async function updateNodeStyleAction(
  projetoId: string,
  nodeId: string,
  style: Record<string, unknown>,
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { tenantId } = await verifySession()
    const parsed = UpdateNodeStyleSchema.safeParse({ nodeId, style, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await updateNodeStyle(parsed.data)
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

export async function updateNodePropertiesAction(
  projetoId: string,
  nodeId: string,
  properties: Record<string, unknown>,
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { tenantId } = await verifySession()
    const parsed = UpdateNodePropertiesSchema.safeParse({ nodeId, properties, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await updateNodeProperties(parsed.data)
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

export async function setLayoutAction(
  projetoId: string,
  nodeId: string,
  layout: 'LADO_A_LADO' | 'ABAIXO' | 'ABAIXO_L',
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { tenantId } = await verifySession()
    const parsed = SetLayoutSchema.safeParse({ nodeId, layout, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await setLayout(parsed.data)
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

export async function setCollapsedAction(
  projetoId: string,
  nodeId: string,
  collapsed: boolean,
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { tenantId } = await verifySession()
    const parsed = SetCollapsedSchema.safeParse({ nodeId, collapsed, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await setCollapsed(parsed.data)
    return { ok: true, ...result }
  } catch (e) {
    return err(e)
  }
}

// ── Autosave ─────────────────────────────────────────────────────────────────

export async function saveTreeAction(
  payload: Omit<Parameters<typeof saveTree>[0], 'tenantId' | 'projectId'> & { projetoId: string },
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { userId, tenantId } = await verifySession()
    const { projetoId, ...rest } = payload
    const parsed = SaveTreeSchema.safeParse({ ...rest, projectId: projetoId, tenantId })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const result = await saveTree(parsed.data, userId)
    if (!result.ok) return { ok: false, error: 'Conflito de edição detectado', conflict: true }
    return { ok: true, serverVersion: result.serverVersion }
  } catch (e) {
    return err(e)
  }
}

// ── Reset / Import ────────────────────────────────────────────────────────────

export async function importWbsAction(
  projetoId: string,
  rawData: unknown,
): Promise<Result<{ serverVersion: number }>> {
  try {
    const { userId, tenantId } = await verifySession()

    const parsed = WbsImportSchema.safeParse(rawData)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const importData: WbsImportData = parsed.data
    const result = await saveTree(
      {
        projectId: projetoId,
        tenantId,
        serverVersion: 0, // import always overwrites
        rootId: importData.rootId,
        nodes: importData.nodes,
      },
      userId,
    )
    if (!result.ok) return { ok: false, error: 'Conflito de edição detectado', conflict: true }
    revalidatePath(wbsPath(projetoId))
    return { ok: true, serverVersion: result.serverVersion }
  } catch (e) {
    return err(e)
  }
}
