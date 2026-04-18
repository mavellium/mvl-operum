import { z } from 'zod'

export const CreateNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['COMMENT', 'ASSIGNMENT', 'UPDATE', 'COMPLETION', 'MENTIONED', 'INVITATION']),
  title: z.string().min(1),
  message: z.string().min(1),
  reference: z.string().optional(),
  referenceType: z.string().optional(),
})

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>
