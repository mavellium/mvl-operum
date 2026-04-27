import { z } from 'zod'

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export const RequestResetSchema = z.object({
  email: z.string().email(),
})

export const ValidateCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6),
})

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6),
  newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export const AlterarSenhaSchema = z.object({
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>
export type RequestResetDto = z.infer<typeof RequestResetSchema>
export type ValidateCodeDto = z.infer<typeof ValidateCodeSchema>
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>
export type AlterarSenhaDto = z.infer<typeof AlterarSenhaSchema>
