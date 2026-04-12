import { verifySession } from '@/lib/dal'
import { findAllByUser } from '@/services/notificacaoService'
import NotificacaoList from '@/components/notificacoes/NotificacaoList'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function NotificacoesPage() {
  const { userId } = await verifySession()
  const notifications = await findAllByUser(userId, { limit: 100 })

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length

  const notificacoesData = notifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    reference: n.reference ?? null,
    referenceType: n.referenceType ?? null,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sprints" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notificações</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <NotificacaoList initialNotificacoes={notificacoesData} />
      </main>
    </div>
  )
}
