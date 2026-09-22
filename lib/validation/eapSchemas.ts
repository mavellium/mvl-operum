import { z } from 'zod'
import type { EapNode } from '@/types/eap'

/**
 * Validação do módulo EAP (template documental).
 * Alinhada à convenção do app (lib/validation/wbsSchemas.ts) e aos limites da
 * SPEC §8: ≤ 5.000 nós, profundidade ≤ 20.
 */

export const EAP_LIMITS = {
  MAX_NODES: 5_000,
  MAX_DEPTH: 20,
} as const

const baseNodeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  code: z.string().max(255).optional(),
  title: z.string().trim().max(500).default(''),
  level: z.number().int().min(1).optional(),
  order: z.number().int().min(0).optional(),
})

const EapNodeSchemaBase = baseNodeSchema.extend({
  children: z.lazy(() => z.array(z.custom<EapNode>())).default([]),
})

export const EapNodeSchema = EapNodeSchemaBase
export type EapNodeSchemaType = z.infer<typeof EapNodeSchema>

export const EapNodesSchema = z
  .array(EapNodeSchema)
  .max(EAP_LIMITS.MAX_NODES, `Máximo de ${EAP_LIMITS.MAX_NODES} nós por documento`)
  .refine(nodes => nodes.length === 0 || nodes.length === 1, {
    message: 'O documento deve ter exatamente uma raiz ("1").',
  })

/** Payload de criação/edição dos metadados + árvore. */
export const SaveEapDocumentSchema = z.object({
  projectName: z.string().trim().max(300).default(''),
  projectManager: z.string().trim().max(300).default(''),
  preparedBy: z.string().trim().max(300).default(''),
  version: z.string().trim().max(50).default('1.0'),
  approvedBy: z.string().trim().max(300).default(''),
  signature: z.string().trim().max(300).default(''),
  approvalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato aaaa-mm-dd')
    .nullable()
    .optional(),
  nodes: EapNodesSchema,
})

export type SaveEapDocumentInput = z.infer<typeof SaveEapDocumentSchema>

/** Valida profundidade máxima (raiz = 1). */
export function validateEapDepth(nodes: EapNodeSchemaType[], depth = 1, max = EAP_LIMITS.MAX_DEPTH): boolean {
  if (depth > max) return false
  for (const node of nodes) {
    if (!validateEapDepth(node.children ?? [], depth + 1, max)) return false
  }
  return true
}