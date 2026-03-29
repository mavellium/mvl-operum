import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function listAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      cargo: true,
      departamento: true,
      valorHora: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  })
}

export async function adminCreateUser(data: {
  name: string
  email: string
  password: string
  cargo?: string
  departamento?: string
  valorHora?: number
}) {
  const passwordHash = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'member',
      isActive: true,
      cargo: data.cargo,
      departamento: data.departamento,
      valorHora: data.valorHora ?? 0,
    },
    select: {
      id: true,
      name: true,
      email: true,
      cargo: true,
      departamento: true,
      valorHora: true,
      role: true,
      isActive: true,
      avatarUrl: true,
    },
  })
}

export async function adminUpdateUser(
  userId: string,
  data: {
    name?: string
    email?: string
    password?: string
    cargo?: string
    departamento?: string
    valorHora?: number
  },
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) throw new Error('Usuário não encontrado')

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.cargo !== undefined) updateData.cargo = data.cargo
  if (data.departamento !== undefined) updateData.departamento = data.departamento
  if (data.valorHora !== undefined) updateData.valorHora = data.valorHora
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10)

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      cargo: true,
      departamento: true,
      valorHora: true,
      role: true,
      isActive: true,
      avatarUrl: true,
    },
  })
}

export async function toggleUserActive(userId: string, active: boolean) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) throw new Error('Usuário não encontrado')

  const data: Record<string, unknown> = { isActive: active }
  if (!active) {
    data.tokenVersion = existing.tokenVersion + 1
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: true,
      tokenVersion: true,
    },
  })
}

export async function setUserRole(userId: string, role: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) throw new Error('Usuário não encontrado')

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })
}
