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

function IconGerenciar() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

// ── Tab definitions ────────────────────────────────────────

type Tab = { label: string; href: string; icon: React.ReactNode }

const BASE_TABS: Tab[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconDashboard /> },
  { label: 'Projetos',  href: '/projetos',  icon: <IconProjetos /> },
]

const ADMIN_EXTRA: Tab[] = [
  { label: 'Usuários', href: '/admin/users', icon: <IconAdmin /> },
  { label: 'Admin',    href: '/admin',       icon: <IconAdmin /> },
]

const HIDDEN_PATHS = ['/login', '/register', '/recuperar-senha', '/alterar-senha', '/no-project']

// ── Component ──────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => { if (d?.user?.role) setRole(d.user.role) })
      .catch(() => {})
  }, [])

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  const baseTabs: Tab[] = role === 'admin' ? [...BASE_TABS, ...ADMIN_EXTRA] : BASE_TABS

  // Dynamic "Gerenciar" tab — visible when inside a project and role allows member management
  const projetoMatch = pathname.match(/^\/projetos\/([^/]+)/)
  const projetoId = projetoMatch?.[1] ?? null
  const gerenciarTab: Tab[] =
    projetoId && (role === 'gerente' || role === 'admin')
      ? [{ label: 'Gerenciar', href: `/projetos/${projetoId}/membros`, icon: <IconGerenciar /> }]
      : []

  const tabs = [...baseTabs, ...gerenciarTab]

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
