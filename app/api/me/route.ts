import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'
import { authApi, projectsApi } from '@/lib/api-client'

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const token = cookieHeader.match(/session=([^;]+)/)?.[1]
  const session = await decrypt(token)

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await authApi.me()

    if (!user.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectManagerIn = await projectsApi
      .getUserProjects(user.id)
      .catch(() => []) as Array<{ projectId?: string; id?: string; role?: string }>

    const managerProjects = projectManagerIn
      .filter(p => /gerente/i.test(p.role ?? ''))
      .map(p => p.projectId ?? p.id ?? '')

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl, projectManagerIn: managerProjects },
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
