import { z } from 'zod'

const CommentTypeEnum = z.enum(['COMMENT', 'FEEDBACK'])

export const CreateComentarioSchema = z.object({
  content: z.string().trim().min(1, 'Content is required'),
  cardId: z.string().min(1, 'CardId is required'),
  userId: z.string().min(1, 'UserId is required'),
  type: CommentTypeEnum.optional(),
  reactions: z.record(z.string(), z.any()).optional(),
})

export const UpdateComentarioSchema = z.object({
  content: z.string().trim().min(1, 'Content is required').optional(),
  type: CommentTypeEnum.optional(),
  reactions: z.record(z.string(), z.any()).optional(),
})

export type CreateComentarioInput = z.infer<typeof CreateComentarioSchema>
export type UpdateComentarioInput = z.infer<typeof UpdateComentarioSchema>
