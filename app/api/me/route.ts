import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const token = cookieHeader.match(/session=([^;]+)/)?.[1]
  const session = await decrypt(token)

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { id: true, name: true, email: true, role: true, isActive: true, tokenVersion: true, avatarUrl: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.isActive === false) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.tokenVersion !== undefined && user.tokenVersion !== session.tokenVersion) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
  })
}
