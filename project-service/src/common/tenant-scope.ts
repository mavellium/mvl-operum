import { NotFoundException } from '@nestjs/common'
import { prisma } from '../prisma'

// Recursos de outro tenant respondem 404 (não 403) para não confirmar a existência do id.

export async function assertProjectInTenant(projectId: string, tenantId: string): Promise<void> {
  if (!tenantId) throw new NotFoundException('Projeto não encontrado')
  const found = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!found) throw new NotFoundException('Projeto não encontrado')
}

export async function assertUserInTenant(userId: string, tenantId: string): Promise<void> {
  if (!tenantId) throw new NotFoundException('Usuário não encontrado')
  const found = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } })
  if (!found) throw new NotFoundException('Usuário não encontrado')
}
