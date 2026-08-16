import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import ProjectSidebar from '@/components/layout/ProjectSidebar'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projetoId: string }>
}): Promise<Metadata> {
  const { projetoId } = await params
  const projeto = await findById(projetoId)
  if (!projeto) return { title: 'Projeto' }
  return {
    title: {
      default: projeto.name,
      template: `%s - ${projeto.name}`,
    },
  }
}

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
    <div className="flex flex-1 overflow-hidden">
      <ProjectSidebar
        projetoId={projetoId}
        canManageMembers={canManageMembers}
      />
      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
