import { z } from 'zod'

export const UserProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email'),
  cargo: z.string().trim().optional(),
  departamento: z.string().trim().optional(),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative'),
})

export const ChangePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
    novaSenha: z
      .string()
      .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
      .regex(/\d/, 'Nova senha deve conter pelo menos um número')
      .regex(/[^a-zA-Z0-9]/, 'Nova senha deve conter pelo menos um caractere especial'),
    confirmacao: z.string().min(1, 'Confirmação é obrigatória'),
  })
  .refine((data) => data.novaSenha === data.confirmacao, {
    message: 'As senhas não coincidem',
    path: ['confirmacao'],
  })

export type UserProfileInput = z.infer<typeof UserProfileSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
