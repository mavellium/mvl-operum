import { validatedSession } from '@/lib/validatedSession'
import prisma from '@/lib/prisma'
import type { SessionPayload } from '@/types/auth'

export async function verifyRouteSession(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const sessionToken = cookieHeader.match(/session=([^;]+)/)?.[1]
  const session = await validatedSession(sessionToken)
  if (!session?.userId) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { tokenVersion: true, isActive: true, deletedAt: true },
  })
  if (
    !dbUser ||
    dbUser.deletedAt !== null ||
    !dbUser.isActive ||
    (session.tokenVersion !== undefined && dbUser.tokenVersion !== session.tokenVersion)
  ) return null

  return session
}
