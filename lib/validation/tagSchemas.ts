import { z } from 'zod'

export const TagCreateSchema = z.object({
  name: z.string().trim().min(1, 'Nome da tag é obrigatório'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve ser um hex de 6 dígitos (ex: #ef4444)')
    .default('#6b7280'),
  userId: z.string().min(1, 'userId é obrigatório'),
  boardId: z.string().min(1, 'boardId é obrigatório'),
})

export type TagCreateInput = z.infer<typeof TagCreateSchema>
