import Link from 'next/link'
import UserAvatar from '@/components/user/UserAvatar'
import { sprintPath } from '@/lib/sprintPath'

interface OverdueCard {
  id: string
  title: string
  color: string
  endDate: Date | string | null
  sprint: { id: string; name: string; projectId?: string | null } | null
  sprintColumn: { title: string } | null
  responsibles: {
    user: { id: string; name: string; avatarUrl: string | null }
  }[]
}

interface Props {
  cards: OverdueCard[]
}

function daysOverdue(endDate: Date | string): number {
  const end = new Date(endDate)
  const now = new Date()
  return Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
}

export default function OverdueCardsList({ cards }: Props) {
  return (
    <div className="space-y-2">
      {cards.map(card => {
        const days = card.endDate ? daysOverdue(card.endDate) : 0
        return (
          <div
            key={card.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
            style={{ borderLeftWidth: '3px', borderLeftColor: card.color }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 truncate">{card.title}</span>
                {card.sprint && (
                  <Link
                    href={sprintPath(card.sprint.id, card.sprint.projectId, card.id)}
                    className="text-xs text-blue-500 hover:underline shrink-0"
                  >
                    {card.sprint.name}
                  </Link>
                )}
                {card.sprintColumn && (
                  <span className="text-xs text-gray-400 shrink-0">· {card.sprintColumn.title}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-red-500 font-medium">
                  {days === 0 ? 'Vence hoje' : `${days}d atrasado`}
                </span>
                {card.responsibles.length > 0 && (
                  <div className="flex items-center gap-1">
                    {card.responsibles.slice(0, 3).map(r => (
                      <UserAvatar key={r.user.id} name={r.user.name} avatarUrl={r.user.avatarUrl} size="xs" />
                    ))}
                    {card.responsibles.length > 3 && (
                      <span className="text-xs text-gray-400">+{card.responsibles.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
