import { z } from 'zod'

export const PasswordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[0-9]/, 'Pelo menos 1 número')
  .regex(/[^A-Za-z0-9]/, 'Pelo menos 1 caractere especial')

export const SignupSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().email('Email inválido'),
  password: PasswordSchema,
})

export const LoginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

// ── Reset de senha ────────────────────────────────────────────────────────────

export const RequestResetSchema = z.object({
  email: z.string().trim().email('Email inválido'),
})

export const ValidateCodeSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  code: z
    .string()
    .length(8, 'O código deve ter 8 caracteres')
    .regex(/^[A-Z2-9]+$/, 'Código inválido'),
})

export const ResetPasswordSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  code: z
    .string()
    .length(8, 'O código deve ter 8 caracteres')
    .regex(/^[A-Z2-9]+$/, 'Código inválido'),
  newPassword: PasswordSchema,
})

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type RequestResetInput = z.infer<typeof RequestResetSchema>
export type ValidateCodeInput = z.infer<typeof ValidateCodeSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
