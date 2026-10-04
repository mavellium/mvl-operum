import { notFound } from 'next/navigation'
import DocumentacaoLayout from '@/components/projetos/documentacao/DocumentacaoLayout'
import type { Metadata } from 'next'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectAccess'
import { canProjectPermission } from '@/services/projectAccess'
import { listarAtasPorProjeto } from '@/services/ataService'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Documentação' }

export default async function DocumentacaoPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { userId, role, tenantId } = await verifySession()

  const project = await findById(projetoId)
  if (!project) notFound()

  if (!(await canProjectPermission({ tenantId, role, userId }, projetoId, 'documentos:ver'))) notFound()

  let atas: Awaited<ReturnType<typeof listarAtasPorProjeto>> = []
  try {
    atas = await listarAtasPorProjeto(projetoId)
  } catch (err) {
    console.error('[DocumentacaoPage] falha ao listar atas:', err)
  }
  const gerente = await canProjectPermission({ tenantId, role, userId }, projetoId, 'documentos:excluir')

  // Membros da equipe (responsáveis/aprovadores dos documentos devem ser membros).
  // `pendente` indica cadastro iniciado de forma simples e ainda não concluído (1º acesso).
  const membros = (
    await prisma.userProject.findMany({
      where: { projectId: projetoId, active: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            signatureUrl: true,
            deletedAt: true,
            isActive: true,
            forcePasswordChange: true,
          },
        },
        department: { select: { name: true } },
      },
      orderBy: { order: 'asc' },
    })
  )
    .filter(up => up.user.deletedAt === null && up.user.isActive)
    .map(up => {
      const cargos = up.role
        ? up.role.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
      const setor = cargos[0] ?? up.department?.name ?? null
      return {
        id: up.userId,
        name: up.user.name,
        setor,
        pendente: up.user.forcePasswordChange || undefined,
      }
    })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <DocumentacaoLayout
        projetoId={projetoId}
        atas={atas.map(a => ({
          id: a.id,
          numero: a.numero,
          data: (a.data ?? a.createdAt)?.toISOString() ?? '',
          elaboradoPor: a.elaboradoPor ?? '',
          local: a.local,
        }))}
        gerente={gerente}
        membros={membros}
      />
    </div>
  )
}