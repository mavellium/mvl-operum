import { z } from 'zod'

export const CreateApiTokenSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  scopes: z.array(z.enum(['read', 'write'])).min(1, 'Ao menos um escopo é obrigatório'),
  expiresInDays: z.number().int().positive().max(365).optional(),
})

export type CreateApiTokenDto = z.infer<typeof CreateApiTokenSchema>
