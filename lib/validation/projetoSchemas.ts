import { z } from 'zod'

const ProjetoStatusEnum = z.enum(['ATIVO', 'INATIVO', 'CONCLUIDO', 'ARQUIVADO'])

export const CreateProjetoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  descricao: z.string().trim().optional(),
})

export const UpdateProjetoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  descricao: z.string().trim().optional(),
  status: ProjetoStatusEnum.optional(),
})

export type CreateProjetoInput = z.infer<typeof CreateProjetoSchema>
export type UpdateProjetoInput = z.infer<typeof UpdateProjetoSchema>
