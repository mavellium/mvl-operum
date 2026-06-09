import { z } from 'zod'

export const JoinTenantSchema = z.object({
  tenantId: z.string().trim().min(1, 'tenantId é obrigatório'),
  // Password is validated here but never logged — only the hash is persisted
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
})

export type JoinTenantDto = z.infer<typeof JoinTenantSchema>
