import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getUserActiveProjects } from '@/services/projectService'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { userId, role, tenantId } = await verifySession()

  if (role === 'admin') redirect('/admin')

  const projects = await getUserActiveProjects(userId, tenantId)

  if (projects.length === 0) redirect('/no-project')
  if (projects.length === 1) redirect(`/projetos/${projects[0].projectId}/dashboard`)
  redirect('/projetos')
}
