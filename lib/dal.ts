import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/session'

export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  let session = null

  try {
    if (token) {
      session = await decrypt(token)
    }
  } catch (error) {
    // Falhas de decodificação (expirado, assinatura inválida) caem aqui.
    // Ignoramos o erro propositalmente para que a variável 'session' 
    // continue nula e acione a trava de segurança abaixo.
    console.warn('Sessão rejeitada localmente:', error)
  }

  // A validação e o redirecionamento ficam FORA do try/catch.
  // Isso garante que o NEXT_REDIRECT não seja interceptado por acidente.
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