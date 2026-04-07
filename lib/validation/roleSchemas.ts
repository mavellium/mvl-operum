import { z } from 'zod'

const RoleScopeEnum = z.enum(['TENANT', 'PROJETO'])

export const CreateRoleSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  escopo: RoleScopeEnum,
  descricao: z.string().trim().optional(),
})

export const UpdateRoleSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').optional(),
  descricao: z.string().trim().optional(),
})

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
