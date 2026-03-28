import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { SignupSchema, LoginSchema } from '@/lib/validation/authSchemas'

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function register(input: { name: string; email: string; password: string }) {
  const parsed = SignupSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { name, email, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new ConflictError('Email já cadastrado')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeUser } = user
  return safeUser
}

export async function login(input: { email: string; password: string }) {
  const parsed = LoginSchema.safeParse(input)
  if (!parsed.success) {
    throw new AuthError('Credenciais inválidas')
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AuthError('Credenciais inválidas')
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    throw new AuthError('Credenciais inválidas')
  }

  return { userId: user.id, role: user.role }
}
