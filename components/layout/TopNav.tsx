'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import UserAvatar from '@/components/user/UserAvatar'

const HIDDEN_PATHS = ['/login', '/register', '/recuperar-senha', '/alterar-senha', '/no-project']

function isSprintBoard(pathname: string) {
  return /^\/sprints\/[^/]+/.test(pathname)
}

export default function TopNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; avatarUrl?: string | null } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => { if (d?.user) setUser(d.user) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    function fetchCount() {
      fetch('/api/notificacoes/count')
        .then(r => r.json())
        .then(d => { if (typeof d?.count === 'number') setUnreadCount(d.count) })
        .catch(() => {})
    }
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [user])

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p)) || isSprintBoard(pathname)) return null

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100 h-14 flex items-center px-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-sm font-semibold text-gray-900">MVL Operum</span>

        <div className="flex items-center gap-3">
          <Link
            href="/notificacoes"
            aria-label="Notificações"
            className="relative text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {user && (
            <Link href="/perfil" aria-label="Meu perfil">
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
