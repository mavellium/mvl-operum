import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager, getProjectRoleForMember } from '@/services/projectRoleService'
import prisma from '@/lib/prisma'
import ProjetoStakeholdersClient, {
  type StakeholderUnificado,
  type UsuarioDisponivel,
  type StakeholderExterno,
} from '@/components/projetos/ProjetoStakeholdersClient'

export const dynamic = 'force-dynamic'

export default async function ProjetoStakeholdersPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role, userId } = await verifySession()

  const isManager = role === 'admin' || await isProjectManager(userId, projetoId)
  if (!isManager) notFound()

  const userRole: 'admin' | 'gerente' = role === 'admin' ? 'admin' : 'gerente'

  const [project, projectStakeholders, allGlobalStakeholders, userProjects, allUsers, rolesDb, departmentsDb] =
    await Promise.all([
      findById(projetoId),
      prisma.projectStakeholder.findMany({
        where: { projectId: projetoId },
        include: { stakeholder: true },
        orderBy: { stakeholder: { name: 'asc' } },
      }),
      prisma.stakeholder.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.userProject.findMany({
        where: { projectId: projetoId, active: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
              phone: true,
              cep: true,
              logradouro: true,
              numero: true,
              complemento: true,
              bairro: true,
              cidade: true,
              estado: true,
              notes: true,
              deletedAt: true,
              isActive: true,
            },
          },
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
        where: { tenantId, deletedAt: null },
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

  // ── External stakeholders
  const linkedStakeholderIds = new Set(projectStakeholders.map(ps => ps.stakeholderId))

  const stakeholdersDisponiveis: StakeholderExterno[] = allGlobalStakeholders
    .filter(s => !linkedStakeholderIds.has(s.id))
    .map(s => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      logoUrl: s.logoUrl,
      company: s.company,
      competence: s.competence,
      email: s.email,
      phone: s.phone,
      cep: s.cep,
      logradouro: s.logradouro,
      numero: s.numero,
      complemento: s.complemento,
      bairro: s.bairro,
      cidade: s.cidade,
      estado: s.estado,
      notes: s.notes,
      isActive: s.isActive,
    }))

  // ── Internal members
  const memberUserIds = new Set(userProjects.map(up => up.userId))

  const usuariosDisponiveis: UsuarioDisponivel[] = allUsers
    .filter(u => !memberUserIds.has(u.id))
    .map(u => ({ id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, role: u.role }))

  // ── Build unified list — fetch gerente roles in parallel
  const membrosComRole = await Promise.all(
    userProjects
      .filter(up => up.user.deletedAt === null && up.user.isActive)
      .map(async (up): Promise<StakeholderUnificado> => {
        const projectRole = await getProjectRoleForMember(up.userId, projetoId)
        const cargos = up.role
          ? up.role.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []

        return {
          id: up.userId,
          tipo: 'interno',
          userId: up.userId,
          name: up.user.name,
          email: up.user.email,
          avatarUrl: up.user.avatarUrl,
          phone: up.user.phone,
          cep: up.user.cep,
          logradouro: up.user.logradouro,
          numero: up.user.numero,
          complemento: up.user.complemento,
          bairro: up.user.bairro,
          cidade: up.user.cidade,
          estado: up.user.estado,
          notes: up.user.notes,
          cargos,
          departamento: up.department?.name ? [up.department.name] : [],
          isGerente: projectRole === 'gerente',
          hourlyRate: up.hourlyRate,
          startDate: up.startDate.toISOString(),
          userRole: up.user.role,
        }
      }),
  )

  const stakeholdersExternos: StakeholderUnificado[] = projectStakeholders.map(ps => ({
    id: ps.stakeholder.id,
    tipo: 'externo',
    stakeholderId: ps.stakeholder.id,
    tenantId: ps.stakeholder.tenantId,
    name: ps.stakeholder.name,
    email: ps.stakeholder.email,
    avatarUrl: ps.stakeholder.logoUrl,
    phone: ps.stakeholder.phone,
    cep: ps.stakeholder.cep,
    logradouro: ps.stakeholder.logradouro,
    numero: ps.stakeholder.numero,
    complemento: ps.stakeholder.complemento,
    bairro: ps.stakeholder.bairro,
    cidade: ps.stakeholder.cidade,
    estado: ps.stakeholder.estado,
    notes: ps.stakeholder.notes,
    company: ps.stakeholder.company,
    competence: ps.stakeholder.competence,
    isActive: ps.stakeholder.isActive,
  }))

  const todosStakeholders: StakeholderUnificado[] = [...membrosComRole, ...stakeholdersExternos]

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <ProjetoStakeholdersClient
          projetoId={projetoId}
          stakeholders={todosStakeholders}
          stakeholdersDisponiveis={stakeholdersDisponiveis}
          usuariosDisponiveis={usuariosDisponiveis}
          funcoesExistentes={rolesDb.map(r => r.name)}
          departamentosExistentes={departmentsDb.map(d => d.name)}
          userRole={userRole}
        />
      </main>
    </div>
  )
}
