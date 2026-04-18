import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export type AdminUserResult = {
  id: string
  name: string
  email: string
  cargo: string | null
  departamento: string | null
  hourlyRate: number
  role: string
  isActive: boolean
  avatarUrl: string | null
  phone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  notes: string | null
}

export async function listAllUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      cargo: true,
      departamento: true,
      hourlyRate: true,
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
  isAdmin?: boolean
  forcePasswordChange?: boolean
  avatarUrl?: string
  phone?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  notes?: string
  tenantId: string
}): Promise<AdminUserResult> {
  const passwordHash = await bcrypt.hash(data.password, 10)
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.isAdmin ? 'admin' : 'member',
      forcePasswordChange: data.forcePasswordChange ?? false,
      isActive: true,
      tenantId: data.tenantId,
      ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.cep !== undefined && { cep: data.cep }),
      ...(data.logradouro !== undefined && { logradouro: data.logradouro }),
      ...(data.numero !== undefined && { numero: data.numero }),
      ...(data.complemento !== undefined && { complemento: data.complemento }),
      ...(data.bairro !== undefined && { bairro: data.bairro }),
      ...(data.cidade !== undefined && { cidade: data.cidade }),
      ...(data.estado !== undefined && { estado: data.estado }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      cargo: true,
      departamento: true,
      hourlyRate: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      phone: true,
      cep: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      notes: true,
    },
  })
  return user
}

export async function adminUpdateUser(
  userId: string,
  data: {
    name?: string
    email?: string
    avatarUrl?: string
    password?: string
    cargo?: string
    departamento?: string
    hourlyRate?: number
    phone?: string
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    notes?: string
  },
) {
  const existing = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
  if (!existing) throw new Error('Usuário não encontrado')

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null
  if (data.cargo !== undefined) updateData.cargo = data.cargo
  if (data.departamento !== undefined) updateData.departamento = data.departamento
  if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.cep !== undefined) updateData.cep = data.cep
  if (data.logradouro !== undefined) updateData.logradouro = data.logradouro
  if (data.numero !== undefined) updateData.numero = data.numero
  if (data.complemento !== undefined) updateData.complemento = data.complemento
  if (data.bairro !== undefined) updateData.bairro = data.bairro
  if (data.cidade !== undefined) updateData.cidade = data.cidade
  if (data.estado !== undefined) updateData.estado = data.estado
  if (data.notes !== undefined) updateData.notes = data.notes
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
      hourlyRate: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      phone: true,
      cep: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      notes: true,
    },
  })
}

export async function toggleUserActive(userId: string, active: boolean) {
  const existing = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
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
  if (!['admin', 'member'].includes(role)) {
    throw new Error('Role inválida. Permitidas globalmente: admin, member')
  }
  const existing = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
  if (!existing) throw new Error('Usuário não encontrado')

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  })
}
