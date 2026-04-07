import { z } from 'zod'

const TenantStatusEnum = z.enum(['ATIVO', 'INATIVO', 'SUSPENSO', 'REMOVIDO'])

export const CreateTenantSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  subdominio: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Subdomínio deve ter pelo menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Subdomínio deve conter apenas letras, números e hífens'),
  config: z.record(z.string(), z.any()).optional(),
})

export const UpdateTenantSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').optional(),
  status: TenantStatusEnum.optional(),
  config: z.record(z.string(), z.any()).optional(),
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
