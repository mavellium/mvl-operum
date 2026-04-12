import { z } from 'zod'

const RoleScopeEnum = z.enum(['TENANT', 'PROJETO'])

export const CreateRoleSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  tenantId: z.string().min(1, 'TenantId is required'),
  scope: RoleScopeEnum,
  description: z.string().trim().optional(),
})

export const UpdateRoleSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  description: z.string().trim().optional(),
})

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
