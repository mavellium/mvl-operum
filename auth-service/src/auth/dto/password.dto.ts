import { z } from 'zod'

export const PasswordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[0-9]/, 'Pelo menos 1 número')
  .regex(/[^A-Za-z0-9]/, 'Pelo menos 1 caractere especial')

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: PasswordSchema,
})

export const RequestResetSchema = z.object({
  email: z.string().email(),
  subdomain: z.string().min(1).optional(),
})

export const ValidateCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(8).regex(/^[A-Z2-9]+$/, 'Código inválido'),
  subdomain: z.string().min(1).optional(),
})

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(8).regex(/^[A-Z2-9]+$/, 'Código inválido'),
  newPassword: PasswordSchema,
  subdomain: z.string().min(1).optional(),
})

export const AlterarSenhaSchema = z.object({
  password: PasswordSchema,
})

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>
export type RequestResetDto = z.infer<typeof RequestResetSchema>
export type ValidateCodeDto = z.infer<typeof ValidateCodeSchema>
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>
export type AlterarSenhaDto = z.infer<typeof AlterarSenhaSchema>
