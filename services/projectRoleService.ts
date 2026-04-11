import prisma from '@/lib/prisma'

export async function getOrCreateGerenteProjetoRole(tenantId: string) {
  const existing = await prisma.role.findFirst({
    where: { tenantId, nome: 'gerente', escopo: 'PROJETO' },
  })
  if (existing) return existing
  return prisma.role.create({
    data: { tenantId, nome: 'gerente', escopo: 'PROJETO' },
  })
}

export async function setProjectManagerRole(userId: string, projetoId: string, tenantId: string) {
  const role = await getOrCreateGerenteProjetoRole(tenantId)
  const existing = await prisma.userProjectRole.findUnique({
    where: { userId_projetoId: { userId, projetoId } },
  })
  if (existing) {
    return prisma.userProjectRole.update({
      where: { id: existing.id },
      data: { roleId: role.id, deletedAt: null },
    })
  }
  return prisma.userProjectRole.create({
    data: { userId, projetoId, roleId: role.id },
  })
}

export async function removeProjectRole(userId: string, projetoId: string) {
  const existing = await prisma.userProjectRole.findUnique({
    where: { userId_projetoId: { userId, projetoId } },
  })
  if (existing) {
    await prisma.userProjectRole.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })
  }
}

export async function isProjectManager(userId: string, projetoId: string): Promise<boolean> {
  const entry = await prisma.userProjectRole.findFirst({
    where: { userId, projetoId, deletedAt: null, role: { nome: 'gerente', escopo: 'PROJETO' } },
  })
  return entry !== null
}

export async function countProjectManagers(projetoId: string): Promise<number> {
  return prisma.userProjectRole.count({
    where: { projetoId, deletedAt: null, role: { nome: 'gerente', escopo: 'PROJETO' } },
  })
}

export async function getProjectsWhereManager(userId: string): Promise<string[]> {
  const entries = await prisma.userProjectRole.findMany({
    where: { userId, deletedAt: null, role: { nome: 'gerente', escopo: 'PROJETO' } },
    select: { projetoId: true },
  })
  return entries.map(e => e.projetoId)
}

export async function getProjectRoleForMember(userId: string, projetoId: string): Promise<'gerente' | 'member'> {
  const pm = await isProjectManager(userId, projetoId)
  return pm ? 'gerente' : 'member'
}
