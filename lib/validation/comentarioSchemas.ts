import { z } from 'zod'

const ComentarioTipoEnum = z.enum(['COMENTARIO', 'FEEDBACK'])

export const CreateComentarioSchema = z.object({
  texto: z.string().trim().min(1, 'Texto é obrigatório'),
  cardId: z.string().min(1, 'CardId é obrigatório'),
  userId: z.string().min(1, 'UserId é obrigatório'),
  tipo: ComentarioTipoEnum.optional(),
  reacoes: z.record(z.string(), z.any()).optional(),
})

export const UpdateComentarioSchema = z.object({
  texto: z.string().trim().min(1, 'Texto é obrigatório').optional(),
  tipo: ComentarioTipoEnum.optional(),
  reacoes: z.record(z.string(), z.any()).optional(),
})

export type CreateComentarioInput = z.infer<typeof CreateComentarioSchema>
export type UpdateComentarioInput = z.infer<typeof UpdateComentarioSchema>
