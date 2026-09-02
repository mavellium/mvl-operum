'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { PanelLeftClose, LogOut } from 'lucide-react'
import UserAvatar from '@/components/user/UserAvatar'
import GlobalSearch from '@/components/search/GlobalSearch'
import TenantSwitcher from '@/components/layout/TenantSwitcher'
import Tooltip from '@/components/ui/Tooltip'
import { logoutAction } from '@/app/actions/auth'
import { fetchWithSession } from '@/lib/clientFetch'

interface SidebarLayoutProps {
  title: string
  searchPlaceholder: string
  searchContext: 'global_projects' | 'project_items' | 'sprint_items' | 'project_members' | 'default'
  contextId?: string
  collapsed?: boolean
  animated?: boolean
  onToggleCollapse?: () => void
  logoHref?: string
  children: React.ReactNode
}

/**
 * Estrutura padrão da sidebar:
 *   Logo do software + ícone hambúrguer → espaçamento → título da página →
 *   barra de pesquisa → lista de itens da página (children) → rodapé com
 *   notificações, troca de tenant e usuário.
 *
 * `collapsed` recolhe com animação de largura (o conteúdo desliza para fora).
 * `animated` só liga as transições depois do primeiro paint (para não animar
 * ao restaurar o estado salvo no localStorage).
 * `logoHref` personaliza o destino da logo (ex.: admin → /admin/dashboard).
 */
export default function SidebarLayout({
  title,
  searchPlaceholder,
  searchContext,
  contextId,
  collapsed = false,
  animated = false,
  onToggleCollapse,
  logoHref = '/',
  children,
}: SidebarLayoutProps) {
  const [user, setUser] = useState<{ name: string; avatarUrl?: string | null; role?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetchWithSession('/api/me')
      .then(r => r.json())
      .then(d => { if (d?.user) setUser(d.user) })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!user) return
    function fetchCount() {
      fetchWithSession('/api/notificacoes/count')
        .then(r => r.json())
        .then(d => { if (typeof d?.count === 'number') setUnreadCount(d.count) })
        .catch(() => { })
    }
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [user])

  return (
    <aside
      className={`shrink-0 bg-white flex flex-col overflow-hidden ${
        collapsed ? 'w-0' : 'w-56 border-r border-gray-200'
      } ${animated ? 'transition-[width] duration-300 ease-in-out' : ''}`}
    >
      <div
        className={`w-56 flex flex-col h-full ${
          collapsed ? '-translate-x-full' : 'translate-x-0'
        } ${animated ? 'transition-transform duration-300 ease-in-out' : ''}`}
      >
      {/* Logo do software + ícone hambúrguer */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Link href={logoHref} className="flex items-center gap-2 min-w-0 flex-1" aria-label="Operum">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg shadow-sm flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight truncate">Operum</span>
        </Link>
        {onToggleCollapse && (
          <Tooltip label="Recolher menu" side="bottom">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Recolher menu lateral"
              className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Espaçamento + título da página atual */}
      <div className="px-4 pt-4 pb-1">
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest truncate">{title}</h2>
      </div>

      {/* Barra de pesquisa */}
      <div className="px-3 pt-2 pb-1">
        <GlobalSearch placeholder={searchPlaceholder} searchContext={searchContext} contextId={contextId} />
      </div>

      <div className="mx-3 mt-3 mb-1 border-b border-gray-100" />

      {/* Lista de itens dessa página */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {children}
      </nav>

      {/* Rodapé: notificações, troca de tenant, usuário */}
      <div className="border-t border-gray-100 px-3 py-3">
        <div className="flex items-center justify-between gap-1">
          <Link
            href="/notificacoes"
            aria-label="Notificações"
            className="relative p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="min-w-0 flex-1 flex justify-center">
            <TenantSwitcher />
          </div>

          <Link
            href="/perfil"
            aria-label="Meu perfil"
            className="rounded-full p-0.5 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          </Link>

          <Tooltip label="Sair" side="bottom">
            <button
              type="button"
              onClick={() => startTransition(() => logoutAction())}
              disabled={isPending}
              aria-label="Sair"
              className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
      </div>
    </aside>
  )
}