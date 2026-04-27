import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { prisma } from '../prisma'
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

@Injectable()
export class AdminService {
  private requireAdmin(role: string) {
    if (role !== 'admin') throw new ForbiddenException('Acesso restrito a administradores')
  }

  async listUsers(tenantId: string, role: string) {
    this.requireAdmin(role)
    return prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
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
        forcePasswordChange: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async createUser(
    tenantId: string,
    role: string,
    data: {
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
    },
  ) {
    this.requireAdmin(role)
    const existing = await prisma.user.findFirst({
      where: { email: data.email, tenantId, deletedAt: null },
    })
    if (existing) throw new ConflictException('Email já cadastrado')

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS)
    const { password: _password, isAdmin: _isAdmin, ...rest } = data
    return prisma.user.create({
      data: {
        ...rest,
        tenantId,
        passwordHash,
        role: _isAdmin ? 'admin' : 'member',
        forcePasswordChange: data.forcePasswordChange ?? false,
      },
    })
  }

  async updateUser(
    userId: string,
    callerRole: string,
    data: {
      name?: string
      email?: string
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
      password?: string
      cargo?: string
      departamento?: string
      hourlyRate?: number
    },
  ) {
    this.requireAdmin(callerRole)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    const { password, ...rest } = data
    const updateData: Record<string, unknown> = { ...rest }
    if (password) updateData.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    return prisma.user.update({ where: { id: userId }, data: updateData })
  }

  async toggleActive(userId: string, callerRole: string, active: boolean) {
    this.requireAdmin(callerRole)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')

    return prisma.user.update({
      where: { id: userId },
      data: {
        isActive: active,
        ...(active ? {} : { tokenVersion: { increment: 1 } }),
      },
      select: { id: true, name: true, email: true, isActive: true, role: true, tokenVersion: true },
    })
  }

  async setRole(userId: string, callerRole: string, role: string) {
    this.requireAdmin(callerRole)
    if (!['admin', 'member'].includes(role)) {
      throw new ForbiddenException('Role inválida')
    }
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
  }

  async listAllForTenant(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true, isActive: true },
      orderBy: { name: 'asc' },
    })
  }
}
