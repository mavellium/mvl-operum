import { getSprintsWithMetricsAction } from '@/app/actions/dashboard'
import { getCurrentUserAction } from '@/app/actions/users'
import { verifyProjectAccess } from '@/lib/dal'
import prisma from '@/lib/prisma'
import SprintListPage from '@/components/sprint/SprintListPage'

export const dynamic = 'force-dynamic'

export default async function SprintsPage() {
  const { userId } = await verifyProjectAccess()

  const [result, currentUser, tags] = await Promise.all([
    getSprintsWithMetricsAction(),
    getCurrentUserAction(),
    prisma.tag.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
  ])

  const sprintsWithMetrics = Array.isArray(result) ? result.map(item => ({
    sprint: {
      ...item.sprint,
      status: item.sprint.status as 'PLANNED' | 'ACTIVE' | 'COMPLETED',
    },
    metrics: item.metrics,
  })) : []

  return (
    <SprintListPage
      sprintsWithMetrics={sprintsWithMetrics}
      currentUser={currentUser}
      tags={tags}
    />
  )
}
