import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import ProjectSidebar from '@/components/layout/ProjectSidebar'

export default async function ProjetoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  const { role, userId } = await verifySession()
  const projeto = await findById(projetoId)

  if (!projeto) notFound()

  const canManageMembers = role === 'admin' || await isProjectManager(userId, projetoId)

  return (
    <div className="flex flex-1">
      <ProjectSidebar
        projetoId={projetoId}
        projetoNome={projeto.name}
        canManageMembers={canManageMembers}
      />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
