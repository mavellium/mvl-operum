import { z } from 'zod'

const NotificationTypeEnum = z.enum(['COMMENT', 'ASSIGNMENT', 'UPDATE', 'COMPLETION', 'MENTIONED', 'INVITATION'])
const NotificationStatusEnum = z.enum(['UNREAD', 'READ', 'ARCHIVED'])

export const CreateNotificacaoSchema = z.object({
  userId: z.string().min(1, 'UserId is required'),
  type: NotificationTypeEnum,
  title: z.string().trim().min(1, 'Title is required'),
  message: z.string().trim().min(1, 'Message is required'),
  reference: z.string().optional(),
  referenceType: z.string().optional(),
})

export const UpdateNotificacaoSchema = z.object({
  status: NotificationStatusEnum.optional(),
})

export type CreateNotificacaoInput = z.infer<typeof CreateNotificacaoSchema>
export type UpdateNotificacaoInput = z.infer<typeof UpdateNotificacaoSchema>
