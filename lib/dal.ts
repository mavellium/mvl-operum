import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/session'

// Verifies the session JWT locally (no DB round-trip).
// Token validity (expiry, signature) is checked here.
// Session invalidation (password change, logout) is enforced by the API gateway
// on every downstream API call via the Redis session store.
export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await decrypt(token)

  if (!session?.userId) {
    redirect('/login')
  }

  return {
    isAuth: true as const,
    userId: session.userId as string,
    role: session.role as string,
    tenantId: session.tenantId as string,
    token: token!,
  }
})

export const verifyProjectAccess = cache(async () => {
  const session = await verifySession()

  if (session.role !== 'admin') {
    const { projectsApi } = await import('./api-client')
    const projects = await projectsApi.getUserProjects(session.userId).catch(() => [] as unknown[])
    if ((projects as unknown[]).length === 0) {
      redirect('/no-project')
    }
  }

  return session
})
