import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager, getProjectRoleForMember } from '@/services/projectRoleService'
import prisma from '@/lib/prisma'
import ProjetoMembrosClient from '@/components/projetos/ProjetoMembrosClient'

export const dynamic = 'force-dynamic'

export default async function ProjetoMembrosPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role, userId } = await verifySession()

  const isManager = role === 'admin' || await isProjectManager(userId, projetoId)
  if (!isManager) {
    notFound()
  }
  const userRole: 'admin' | 'gerente' = role === 'admin' ? 'admin' : 'gerente'

  const [project, members, allUsers, rolesDb, departmentsDb] = await Promise.all([
    findById(projetoId),
    prisma.userProject.findMany({
      where: { projectId: projetoId, active: true },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true, phone: true, address: true, notes: true } },
        department: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    }),
    prisma.user.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.role.findMany({
      where: { tenantId },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!project) notFound()

  const memberIds = new Set(members.map(m => m.userId))
  const available = allUsers.filter(u => !memberIds.has(u.id))

  const membersData = await Promise.all(
    members.map(async m => {
      const rolesArray = m.role
        ? m.role.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []

      const projectRole = await getProjectRoleForMember(m.userId, projetoId)
      

      return {
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        phone: m.user.phone,
        address: m.user.address,
        notes: m.user.notes,
        role: projectRole,
        isGerente: projectRole === 'gerente',
        cargos: rolesArray,
        departamento: m.department?.name ? [m.department.name] : [],
        hourlyRate: m.hourlyRate,
        startDate: m.startDate.toISOString(),
      }
    }),
  )

  const availableData = available.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    role: u.role,
  }))

  const existingRoles = rolesDb.map(f => f.name)
  const existingDepartments = departmentsDb.map(d => d.name)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <ProjetoMembrosClient
          projetoId={projetoId}
          membros={membersData}
          disponiveis={availableData}
          funcoesExistentes={existingRoles}
          departamentosExistentes={existingDepartments}
          userRole={userRole}  
        />
      </main>
    </div>
  )
}
