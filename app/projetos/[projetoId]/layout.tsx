import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projetoService'
import ProjectSidebar from '@/components/layout/ProjectSidebar'

export default async function ProjetoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  const { role } = await verifySession()
  const projeto = await findById(projetoId)

  if (!projeto) notFound()

  const canManageMembers = role === 'admin' || role === 'gerente'

  return (
    <div className="flex flex-1">
      <ProjectSidebar
        projetoId={projetoId}
        projetoNome={projeto.nome}
        canManageMembers={canManageMembers}
      />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}
