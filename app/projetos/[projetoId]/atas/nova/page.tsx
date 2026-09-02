import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import prisma from '@/lib/prisma'
import AtaFormClient from '@/components/atas/AtaFormClient'
import type { MemberOption } from '@/components/atas/MemberSelect'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Nova Ata' }

export default async function NovaAtaPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { userId, role } = await verifySession()

  const project = await findById(projetoId)
  if (!project) notFound()

  const isMember =
    role === 'admin' || (await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId: projetoId } },
    }))?.active
  if (!isMember) notFound()

  const members: MemberOption[] = (
    await prisma.userProject.findMany({
      where: { projectId: projetoId, active: true },
      include: {
        user: { select: { id: true, name: true, signatureUrl: true, deletedAt: true, isActive: true } },
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
      return { id: up.userId, name: up.user.name, setor, signatureUrl: up.user.signatureUrl }
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href={`/projetos/${projetoId}/atas`} className="text-sm text-blue-600 hover:underline">
          ← Voltar às atas
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-3 mb-1">Nova Ata de Reunião</h1>
        <p className="text-sm text-gray-500 mb-6">Projeto: {project.name}</p>
        <AtaFormClient projetoId={projetoId} mode="create" members={members} />
      </main>
    </div>
  )
}
