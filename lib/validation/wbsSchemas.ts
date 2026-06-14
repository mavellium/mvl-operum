import { z } from 'zod'

// ── Limites globais (§8) ─────────────────────────────────────────────────────
export const WBS_LIMITS = {
  MAX_NODES: 5_000,
  MAX_DEPTH: 20,
  MAX_IMPORT_BYTES: 5 * 1024 * 1024, // 5 MB
} as const

// ── Enums ────────────────────────────────────────────────────────────────────
export const WbsLayoutOrientationSchema = z.enum(['LADO_A_LADO', 'ABAIXO', 'ABAIXO_L'])
export const DropPositionSchema = z.enum(['INSIDE', 'BEFORE', 'AFTER'])

// ── Primitivos de nó ─────────────────────────────────────────────────────────
export const WbsNodeStyleSchema = z.object({
  backgroundColor: z.string().min(1),
  borderColor: z.string().min(1),
  textColor: z.string().min(1),
  borderWidth: z.number().int().min(0).max(20),
  fontSize: z.number().int().min(8).max(72),
  borderRadius: z.number().int().min(0).max(50),
})

export const WbsNodePropertiesSchema = z.object({
  cost: z.number().min(0).optional(),
  durationDays: z.number().min(0).optional(),
  ownerUserId: z.string().optional(),
  description: z.string().max(2000).optional(),
})

// ── Nó completo (usado em saveTree e import) ─────────────────────────────────
export const WbsNodeClientSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  order: z.number().int().min(0),
  code: z.string().max(255),
  title: z.string().min(1).max(500),
  layout: WbsLayoutOrientationSchema,
  collapsed: z.boolean(),
  style: WbsNodeStyleSchema,
  properties: WbsNodePropertiesSchema,
  childrenIds: z.array(z.string()),
})

// ── Payloads das actions (contêm tenantId/projectId para escopo) ─────────────

export const InsertChildSchema = z.object({
  parentId: z.string().min(1),
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const InsertSiblingSchema = z.object({
  siblingId: z.string().min(1),
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const DeleteNodeSchema = z.object({
  nodeId: z.string().min(1),
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const MoveNodeSchema = z.object({
  nodeId: z.string().min(1),
  targetId: z.string().min(1),
  position: DropPositionSchema,
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const RenameNodeSchema = z.object({
  nodeId: z.string().min(1),
  title: z.string().trim().min(1, 'Título obrigatório').max(500),
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const UpdateNodeStyleSchema = z.object({
  nodeId: z.string().min(1),
  style: WbsNodeStyleSchema.partial(),
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const UpdateNodePropertiesSchema = z.object({
  nodeId: z.string().min(1),
  properties: WbsNodePropertiesSchema,
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const SetLayoutSchema = z.object({
  nodeId: z.string().min(1),
  layout: WbsLayoutOrientationSchema,
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

export const SetCollapsedSchema = z.object({
  nodeId: z.string().min(1),
  collapsed: z.boolean(),
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
})

// ── saveTree (autosave com concorrência otimista) ────────────────────────────
export const SaveTreeSchema = z.object({
  projectId: z.string().min(1),
  tenantId: z.string().min(1),
  serverVersion: z.number().int().min(0),
  rootId: z.string().nullable(),
  nodes: z
    .record(z.string(), WbsNodeClientSchema)
    .refine(n => Object.keys(n).length <= WBS_LIMITS.MAX_NODES, {
      message: `Máximo de ${WBS_LIMITS.MAX_NODES} nós por projeto`,
    }),
})

// ── Import .wbs ──────────────────────────────────────────────────────────────
export const WbsImportSchema = z.object({
  version: z.number().int().min(1),
  rootId: z.string().nullable(),
  nodes: z
    .record(z.string(), WbsNodeClientSchema)
    .refine(n => Object.keys(n).length <= WBS_LIMITS.MAX_NODES, {
      message: `Máximo de ${WBS_LIMITS.MAX_NODES} nós por projeto`,
    }),
})

// ── Tipos inferidos ──────────────────────────────────────────────────────────
export type InsertChildInput = z.infer<typeof InsertChildSchema>
export type InsertSiblingInput = z.infer<typeof InsertSiblingSchema>
export type DeleteNodeInput = z.infer<typeof DeleteNodeSchema>
export type MoveNodeInput = z.infer<typeof MoveNodeSchema>
export type RenameNodeInput = z.infer<typeof RenameNodeSchema>
export type UpdateNodeStyleInput = z.infer<typeof UpdateNodeStyleSchema>
export type UpdateNodePropertiesInput = z.infer<typeof UpdateNodePropertiesSchema>
export type SetLayoutInput = z.infer<typeof SetLayoutSchema>
export type SetCollapsedInput = z.infer<typeof SetCollapsedSchema>
export type SaveTreeInput = z.infer<typeof SaveTreeSchema>
export type WbsImportData = z.infer<typeof WbsImportSchema>
