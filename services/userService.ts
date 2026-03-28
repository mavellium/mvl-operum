import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { UserProfileSchema, ChangePasswordSchema } from '@/lib/validation/userSchemas'

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      cargo: true,
      departamento: true,
      valorHora: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return user
}

export async function updateUserProfile(
  userId: string,
  input: { name: string; email: string; cargo?: string; departamento?: string; valorHora: number },
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

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Usuário não encontrado')

  const valid = await bcrypt.compare(input.senhaAtual, user.passwordHash)
  if (!valid) throw new Error('Senha atual incorreta')

  const passwordHash = await bcrypt.hash(input.novaSenha, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl } })
}
