import prisma from '@/lib/prisma'

export async function getOrCreateGerenteProjetoRole(tenantId: string) {
  const existing = await prisma.role.findFirst({
    where: { tenantId, nameKey: 'gerente', scope: 'PROJETO' },
  })
  if (existing) return existing
  return prisma.role.create({
    data: { tenantId, name: 'Gerente de Projeto', nameKey: 'gerente', scope: 'PROJETO' },
  })
}

export async function setProjectManagerRole(userId: string, projectId: string, tenantId: string) {
  const role = await getOrCreateGerenteProjetoRole(tenantId)
  const existing = await prisma.userProjectRole.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
  if (existing) {
    return prisma.userProjectRole.update({
      where: { id: existing.id },
      data: { roleId: role.id, deletedAt: null },
    })
  }
  return prisma.userProjectRole.create({
    data: { userId, projectId, roleId: role.id },
  })
}

export async function removeProjectRole(userId: string, projectId: string) {
  const existing = await prisma.userProjectRole.findUnique({
    where: { userId_projectId: { userId, projectId } },
  })
  if (existing) {
    await prisma.userProjectRole.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })
  }
}

export async function isProjectManager(userId: string, projectId: string): Promise<boolean> {
  const entry = await prisma.userProjectRole.findFirst({
    where: {
      userId,
      projectId,
      deletedAt: null,
      role: {
        is: {
          nameKey: 'gerente',
          scope: 'PROJETO',
        },
      },
    },
  })
  return entry !== null
}

export async function countProjectManagers(projectId: string): Promise<number> {
  return prisma.userProjectRole.count({
    where: { projectId, deletedAt: null, role: { nameKey: 'gerente', scope: 'PROJETO' } },
  })
}

export async function getProjectsWhereManager(userId: string): Promise<string[]> {
  const entries = await prisma.userProjectRole.findMany({
    where: { userId, deletedAt: null, role: { nameKey: 'gerente', scope: 'PROJETO' } },
    select: { projectId: true },
  })
  return entries.map(e => e.projectId)
}

export async function getProjectRoleForMember(userId: string, projectId: string): Promise<'gerente' | 'member'> {
  const pm = await isProjectManager(userId, projectId)
  return pm ? 'gerente' : 'member'
}
