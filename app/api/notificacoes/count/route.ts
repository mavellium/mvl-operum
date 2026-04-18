import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'

export async function GET() {
  try {
    const { userId } = await verifySession()
    const serviceUrl = process.env.NOTIFICATION_SERVICE_URL

    if (serviceUrl) {
      const res = await fetch(`${serviceUrl}/notifications/count?userId=${userId}`, { cache: 'no-store' })
      const data = await res.json()
      return NextResponse.json(data)
    }

    const { countUnread } = await import('@/services/notificacaoService')
    const count = await countUnread(userId)
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
