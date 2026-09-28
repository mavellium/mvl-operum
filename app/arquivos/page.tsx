import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { getProjectsWhereManager } from '@/services/projectRoleService'
import prisma from '@/lib/prisma'
import ArquivosClient from '@/components/arquivos/ArquivosClient'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Arquivos' }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function ArquivosPage() {
  const { role, userId, tenantId } = await verifySession()
  if (role !== 'admin') {
    const manages = await getProjectsWhereManager(userId)
    if (manages.length === 0) redirect('/projetos')
  }

  const attachments = await prisma.attachment.findMany({
    // Só anexos de cards do tenant da sessão (antes listava todos os tenants).
    where: {
      deletedAt: null,
      card: { OR: [{ project: { tenantId } }, { sprint: { project: { tenantId } } }] },
    },
    include: {
      card: {
        select: {
          id: true,
          title: true,
          projectId: true,
          sprint: { select: { id: true, name: true, projectId: true } },
          responsibles: {
            select: { user: { select: { id: true, name: true } } },
            take: 1,
          },
        },
      },
    },
    orderBy: { uploadedAt: 'desc' },
  })

  const data = attachments.map(a => ({
    id: a.id,
    fileName: a.fileName,
    fileType: a.fileType,
    fileSize: a.fileSize,
    fileSizeFormatted: formatBytes(a.fileSize),
    filePath: a.filePath,
    isCover: a.isCover,
    uploadedAt: a.uploadedAt.toISOString(),
    card: {
      id: a.card.id,
      title: a.card.title,
      // Card do backlog não tem sprint.
      sprintId: a.card.sprint?.id ?? null,
      sprintName: a.card.sprint?.name ?? null,
      projectId: a.card.sprint?.projectId ?? a.card.projectId,
    },
    uploadedBy: a.card.responsibles[0]?.user?.name ?? null,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={role === 'admin' ? '/admin' : '/projetos'} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Arquivos</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ArquivosClient initialAttachments={data} />
      </main>
    </div>
  )
}
