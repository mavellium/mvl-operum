import { z } from 'zod'

export const IntrospectApiTokenSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
})

export type IntrospectApiTokenDto = z.infer<typeof IntrospectApiTokenSchema>
