import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { projectsApi } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { userId, role } = await verifySession()

  if (role === 'admin') redirect('/admin')

  const projects = await projectsApi.getUserProjects(userId) as { projectId: string }[]

  if (projects.length === 0) redirect('/no-project')
  if (projects.length === 1) redirect(`/projetos/${projects[0].projectId}/dashboard`)
  redirect('/projetos')
}
