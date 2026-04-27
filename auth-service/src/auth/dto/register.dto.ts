import { z } from 'zod'

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  tenantId: z.string().min(1, 'tenantId é obrigatório'),
  role: z.enum(['admin', 'gerente', 'member']).optional().default('member'),
  forcePasswordChange: z.boolean().optional().default(false),
})

export type RegisterDto = z.infer<typeof RegisterSchema>
