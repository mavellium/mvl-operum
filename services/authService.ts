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

export async function register(input: { name: string; email: string; password: string; tenantId: string }) {
  const parsed = SignupSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const { name, email, password } = parsed.data
  const { tenantId } = input

  const existing = await prisma.user.findFirst({
    where: { email, tenantId, deletedAt: null },
  })
  if (existing) {
    throw new ConflictError('Email já cadastrado')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, tenantId },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, ...safeUser } = user
  return safeUser
}

export async function login(input: { email: string; password: string; tenantId: string }) {
  const parsed = LoginSchema.safeParse(input)
  if (!parsed.success) {
    throw new AuthError('Credenciais inválidas')
  }

  const { email, password } = parsed.data
  const { tenantId } = input

  const user = await prisma.user.findFirst({
    where: { email, tenantId, deletedAt: null },
  })
  if (!user) {
    throw new AuthError('Credenciais inválidas')
  }

  if (user.status !== 'ativo' || !user.isActive) {
    throw new AuthError('Conta inativa ou bloqueada')
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: (user.loginAttempts ?? 0) + 1 },
    })
    throw new AuthError('Credenciais inválidas')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date(), loginAttempts: 0 },
  })

  return { userId: user.id, role: user.role, tenantId: user.tenantId, tokenVersion: user.tokenVersion, forcePasswordChange: user.forcePasswordChange }
}
