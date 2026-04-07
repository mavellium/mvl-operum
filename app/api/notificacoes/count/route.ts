import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { countUnread } from '@/services/notificacaoService'

export async function GET() {
  try {
    const { userId } = await verifySession()
    const count = await countUnread(userId)
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
