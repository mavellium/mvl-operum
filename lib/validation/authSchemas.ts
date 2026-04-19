import { z } from 'zod'

export const PasswordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/\d/, 'Senha deve conter pelo menos um número')
  .regex(/[^a-zA-Z0-9]/, 'Senha deve conter pelo menos um caractere especial')

export const SignupSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().email('Email inválido'),
  password: PasswordSchema,
})

export const LoginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export type SignupInput = z.infer<typeof SignupSchema>
export type LoginInput = z.infer<typeof LoginSchema>
