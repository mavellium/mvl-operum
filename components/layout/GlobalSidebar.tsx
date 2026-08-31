'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban, Paperclip, BellRing, PanelLeftOpen, Users } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'
import SidebarLayout from '@/components/layout/SidebarLayout'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/projetos', label: 'Projetos', Icon: FolderKanban },
  { href: '/arquivos', label: 'Arquivos', Icon: Paperclip },
  { href: '/notificacoes', label: 'Notificações', Icon: BellRing },
  { href: '/equipe', label: 'Equipe de Desenvolvimento', Icon: Users },
]

const FALLBACK_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  projetos: 'Projetos',
  arquivos: 'Arquivos',
  notificacoes: 'Notificações',
  sprints: 'Sprints',
  perfil: 'Perfil',
  admin: 'Admin',
  'alterar-senha': 'Alterar senha',
  equipe: 'Equipe de Desenvolvimento',
}

const STORAGE_KEY = 'wbs-global-sidebar-collapsed'

/** Sidebar global do app (páginas sem sidebar própria). */
export default function GlobalSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === '1') setCollapsed(true)
    const raf = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  const parts = pathname.split('/').filter(Boolean)
  let search: { placeholder: string; context: 'global_projects' | 'project_items' | 'sprint_items' | 'project_members' | 'default'; contextId?: string } = {
    placeholder: 'Buscar...',
    context: 'default',
  }
  if (parts[0] === 'sprints' && parts[1]) {
    search = { placeholder: 'Buscar cards e tarefas na sprint...', context: 'sprint_items', contextId: parts[1] }
  } else if (parts[0] === 'projetos' || pathname === '/') {
    search = { placeholder: 'Buscar projetos...', context: 'global_projects' }
  } else if (parts[0] === 'dashboard') {
    search = { placeholder: 'Buscar...', context: 'default' }
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const title = NAV_ITEMS.find(i => isActive(i.href))?.label
    ?? FALLBACK_TITLES[parts[0]]
    ?? 'Operum'

  return (
    <>
      <SidebarLayout
        title={title}
        searchPlaceholder={search.placeholder}
        searchContext={search.context}
        contextId={search.contextId}
        collapsed={collapsed}
        animated={animated}
        onToggleCollapse={toggleCollapsed}
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </SidebarLayout>

      {collapsed && (
        <Tooltip label="Expandir menu" side="bottom">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={false}
            aria-label="Expandir menu lateral"
            className="fixed top-3.5 left-2 z-30 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </Tooltip>
      )}
    </>
  )
}