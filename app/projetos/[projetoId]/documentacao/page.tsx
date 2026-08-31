import { notFound } from 'next/navigation'
import DocumentacaoLayout from '@/components/projetos/documentacao/DocumentacaoLayout'
import type { Metadata } from 'next'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import { listarAtasPorProjeto } from '@/services/ataService'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Documentação' }

export default async function DocumentacaoPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { userId, role } = await verifySession()

  const project = await findById(projetoId)
  if (!project) notFound()

  const isMember = role === 'admin' || (await isProjectManager(userId, projetoId))
  if (!isMember) {
    const entry = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId: projetoId } },
    })
    if (!entry?.active) notFound()
  }

  const atas = await listarAtasPorProjeto(projetoId)
  const gerente = (await isProjectManager(userId, projetoId)) || role === 'admin'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <DocumentacaoLayout
        projetoId={projetoId}
        atas={atas.map(a => ({
          id: a.id,
          numero: a.numero,
          data: a.data.toISOString(),
          elaboradoPor: a.elaboradoPor,
          local: a.local,
        }))}
        gerente={gerente}
      />
    </div>
  )
}
