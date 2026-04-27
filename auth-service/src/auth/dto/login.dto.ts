import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  subdomain: z.string().optional(),
})

export type LoginDto = z.infer<typeof LoginSchema>
