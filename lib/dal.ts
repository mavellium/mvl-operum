import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'

export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = await decrypt(token)

  if (!session?.userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: {
      id: true,
      role: true,
      tenantId: true,
      isActive: true,
      status: true,
      tokenVersion: true,
      deletedAt: true,
      forcePasswordChange: true,
    },
  })

  if (!user) {
    cookieStore.delete('session')
    redirect('/login')
  }

  if (user.deletedAt !== null) {
    cookieStore.delete('session')
    redirect('/login')
  }

  if (user.isActive === false || user.status !== 'ativo') {
    cookieStore.delete('session')
    redirect('/login')
  }

  if (session.tokenVersion !== undefined && user.tokenVersion !== session.tokenVersion) {
    cookieStore.delete('session')
    redirect('/login')
  }

  if (user.forcePasswordChange) {
    redirect('/alterar-senha')
  }

  return {
    isAuth: true,
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
  }
})
