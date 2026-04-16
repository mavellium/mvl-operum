import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { UserProfileSchema, ChangePasswordSchema, type UserProfileInput } from '@/lib/validation/userSchemas'

export type UserProfile = {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  cargo: string | null
  departamento: string | null
  hourlyRate: number
  phone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      cargo: true,
      departamento: true,
      hourlyRate: true,
      phone: true,
      cep: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function updateUserProfile(
  userId: string,
  input: UserProfileInput,
) {
  const parsed = UserProfileSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }
  return prisma.user.update({ where: { id: userId }, data: parsed.data })
}

export async function changePassword(
  userId: string,
  input: { senhaAtual: string; novaSenha: string; confirmacao: string },
) {
  const parsed = ChangePasswordSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
  if (!user) throw new Error('User not found')

  const valid = await bcrypt.compare(input.senhaAtual, user.passwordHash)
  if (!valid) throw new Error('Incorrect current password')

  const passwordHash = await bcrypt.hash(input.novaSenha, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl } })
}
