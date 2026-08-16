import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import { getTree, resetTree } from '@/services/wbsService'
import WbsCanvas from '@/components/wbs/WbsCanvas'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'EAP / WBS' }

export default async function WbsPage({
  params,
}: {
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  const { userId, tenantId, role } = await verifySession()

  const projeto = await findById(projetoId)
  if (!projeto) notFound()

  const canEdit = role === 'admin' || await isProjectManager(userId, projetoId)
  let initialTree = await getTree(projetoId, tenantId)

  // Auto-initialize on first access
  if (!initialTree.rootId) {
    await resetTree({ projectId: projetoId, tenantId, rootTitle: projeto.name }, userId)
    initialTree = await getTree(projetoId, tenantId)
  }

  return (
    <WbsCanvas
      projetoId={projetoId}
      tenantId={tenantId}
      userId={userId}
      canEdit={canEdit}
      initialTree={initialTree}
    />
  )
}
