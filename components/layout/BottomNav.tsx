'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// ── Icons ──────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function IconSprints() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function IconPerfil() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function IconProjetos() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

function IconAdmin() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function IconAlertas({ count }: { count: number }) {
  return (
    <span className="relative inline-flex">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  )
}

// ── Tab definitions ────────────────────────────────────────

const MEMBRO_TABS = [
  { label: 'Sprints', href: '/sprints', icon: <IconSprints /> },
  { label: 'Perfil', href: '/perfil', icon: <IconPerfil /> },
]

const GERENTE_TABS = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
  { label: 'Projetos', href: '/projetos', icon: <IconProjetos /> },
  { label: 'Sprints', href: '/sprints', icon: <IconSprints /> },
  { label: 'Perfil', href: '/perfil', icon: <IconPerfil /> },
]

const ADMIN_TABS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <IconDashboard /> },
  { label: 'Projetos', href: '/projetos', icon: <IconProjetos /> },
  { label: 'Usuários', href: '/admin/users', icon: <IconAdmin /> },
  { label: 'Admin', href: '/admin', icon: <IconAdmin /> },
  { label: 'Perfil', href: '/perfil', icon: <IconPerfil /> },
]

// ── Component ──────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => { if (d?.user?.role) setRole(d.user.role) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!role) return
    fetch('/api/notificacoes/count')
      .then(r => r.json())
      .then(d => { if (typeof d?.count === 'number') setUnreadCount(d.count) })
      .catch(() => {})
  }, [role])

  if (['/login', '/register', '/recuperar-senha', '/alterar-senha'].some(p => pathname.startsWith(p))) return null

  const baseTabs = role === 'admin'
    ? ADMIN_TABS
    : role === 'gerente'
    ? GERENTE_TABS
    : MEMBRO_TABS

  // Inject alertas tab for non-admin roles (admin sees full panel)
  const tabs = role === 'admin'
    ? baseTabs
    : [
        ...baseTabs.slice(0, -1), // all except Perfil
        {
          label: 'Alertas',
          href: '/notificacoes',
          icon: <IconAlertas count={unreadCount} />,
        },
        baseTabs[baseTabs.length - 1], // Perfil last
      ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-200 h-16 flex items-center"
      aria-label="Navegação principal"
    >
      <div className="flex w-full overflow-x-auto">
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors min-w-0 ${
                isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
