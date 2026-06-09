import { z } from 'zod'

export const SwitchTenantSchema = z.object({
  targetTenantId: z.string().min(1, 'targetTenantId é obrigatório'),
})

export type SwitchTenantDto = z.infer<typeof SwitchTenantSchema>
