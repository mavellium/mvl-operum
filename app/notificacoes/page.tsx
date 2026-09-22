import { verifySession } from '@/lib/dal'
import { findAllByUser } from '@/services/notificacaoService'
import { cardsApi } from '@/lib/api-client'
import NotificacaoList from '@/components/notificacoes/NotificacaoList'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Notificações' }

// IDs de card (cuid) que notificações antigas gravavam crus em `reference`.
const CARD_ID_RE = /^c[a-z0-9]{20,30}$/

type NotificacaoLeve = { id: string; referenceType: string | null; reference: string | null }

/**
 * Notificações antigas de atribuição guardavam o ID cru do card em `reference`
 * (a UI usa esse campo como href do link "Ver"/clique). Aqui resolvemos esses
 * IDs para um deep link do board: /projetos/:projectId/sprints/:sprintId?card=:cardId.
 * Best-effort: card inexistente, removido ou só no backlog fica sem link.
 */
async function healLegacyCardReferences(notifications: NotificacaoLeve[]): Promise<Map<string, string>> {
  const healed = new Map<string, string>()
  const legacy = notifications.filter(n => n.referenceType === 'CARD' && n.reference && CARD_ID_RE.test(n.reference))
  if (legacy.length === 0) return healed

  const results = await Promise.all(
    legacy.map(async n => {
      try {
        const card = (await cardsApi.get(n.reference!)) as { sprintId?: string | null; projectId?: string | null }
        if (!card.sprintId) return null // card no backlog ou removido: sem deep link
        const base = card.projectId
          ? `/projetos/${card.projectId}/sprints/${card.sprintId}`
          : `/sprints/${card.sprintId}`
        return { id: n.id, path: `${base}?card=${n.reference}` }
      } catch {
        return null // best-effort: sem link
      }
    }),
  )
  for (const r of results) {
    if (r) healed.set(r.id, r.path)
  }
  return healed
}

export default async function NotificacoesPage() {
  const { userId } = await verifySession()
  const notifications = await findAllByUser(userId, { limit: 100 })
  const healed = await healLegacyCardReferences(notifications)

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length

  const notificacoesData = notifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    reference: healed.get(n.id) ?? n.reference ?? null,
    referenceType: n.referenceType ?? null,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projetos" className="text-gray-400 hover:text-gray-600 transition-colors">
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
