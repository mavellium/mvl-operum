import { z } from 'zod'

export const CreateDepartamentoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  descricao: z.string().trim().optional(),
  valorHora: z.number().min(0, 'Valor hora não pode ser negativo').optional(),
})

export const UpdateDepartamentoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').optional(),
  descricao: z.string().trim().optional(),
  ativo: z.boolean().optional(),
  valorHora: z.number().min(0, 'Valor hora não pode ser negativo').optional(),
})

export type CreateDepartamentoInput = z.infer<typeof CreateDepartamentoSchema>
export type UpdateDepartamentoInput = z.infer<typeof UpdateDepartamentoSchema>
