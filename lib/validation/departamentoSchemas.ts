import { z } from 'zod'

export const CreateDepartamentoSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  description: z.string().trim().optional(),
  hourlyRate: z.number().min(0, 'Valor hora não pode ser negativo').optional(),
})

export const UpdateDepartamentoSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').optional(),
  description: z.string().trim().optional(),
  active: z.boolean().optional(),
  hourlyRate: z.number().min(0, 'Valor hora não pode ser negativo').optional(),
})

export type CreateDepartamentoInput = z.infer<typeof CreateDepartamentoSchema>
export type UpdateDepartamentoInput = z.infer<typeof UpdateDepartamentoSchema>
