'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import UserAvatar from '@/components/user/UserAvatar'
import BoardActionMenu from '../board/BoardActionMenu'
import GlobalSearch from '../search/GlobalSearch'

const HIDDEN_PATHS = ['/login', '/register', '/recuperar-senha', '/alterar-senha', '/no-project']

type HeaderConfig = {
  title: string
  showBoardActions: boolean
  icon: React.ReactNode
  search: {
    placeholder: string
    context: 'global_projects' | 'project_items' | 'sprint_items' | 'project_members' | 'default'
    contextId?: string
  }
  button: {
    text: string
    href: string
  } | null
}

function getHeaderContext(pathname: string, role?: string, projectManagerIn: string[] = []): HeaderConfig {
  const parts = pathname.split('/').filter(Boolean)
  const baseRoute = parts[0]
  const idParam = parts[1]
  const subRoute = parts[2]

  const icons = {
    sprint: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    dashboard: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    default: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }

  // 1. Contexto: Sprints Internas (/sprints/:id)
  if (baseRoute === 'sprints' && idParam) {
    return {
      title: 'Sprints',
      showBoardActions: true,
      icon: icons.sprint,
      search: {
        placeholder: 'Buscar cards e tarefas na sprint...',
        context: 'sprint_items',
        contextId: idParam,
      },
      button: null
    }
  }

  // 2. Contexto: Projeto Específico (/projetos/:id/...)
  if (baseRoute === 'projetos' && idParam && idParam !== 'novo') {
    const isManagerOrAdmin = role === 'admin' || projectManagerIn.includes(idParam)

    // Sub-rota: Membros
    if (subRoute === 'membros') {
      return {
        title: 'Membros',
        showBoardActions: false,
        icon: icons.users,
        search: {
          placeholder: 'Buscar membros no projeto...',
          context: 'project_members',
          contextId: idParam,
        },
        button: null
      }
    }

    // Sub-rota: Funções e Departamentos (Não devem ter botão de nova sprint)
    if (subRoute === 'funcoes' || subRoute === 'cargos' || subRoute === 'departamentos') {
      return {
        title: subRoute === 'departamentos' ? 'Departamentos' : 'Funções',
        showBoardActions: false,
        icon: icons.users,
        search: {
          placeholder: `Buscar cards e sprints no projeto...`,
          context: 'default',
        },
        button: null
      }
    }

    // Sub-rota Exata: Visão Geral do Projeto (/projetos/:id sem sub-rota)
    if (!subRoute) {
      return {
        title: 'Projeto',
        showBoardActions: false,
        icon: icons.default,
        search: {
          placeholder: 'Buscar cards e sprints no projeto...',
          context: 'project_items',
          contextId: idParam,
        },
        button: null
      }
    }

    // Sub-rotas: Dashboard ou Sprints
    return {
      title: subRoute === 'dashboard' ? 'Dashboard' : 'Sprints',
      showBoardActions: false,
      icon: subRoute === 'dashboard' ? icons.dashboard : icons.sprint,
      search: {
        placeholder: 'Buscar cards e sprints no projeto...',
        context: 'project_items',
        contextId: idParam,
      },
      button: isManagerOrAdmin ? { text: '+ Nova Sprint', href: `/projetos/${idParam}/nova-sprint` } : null
    }
  }

  // 3. Contexto: Lista de Projetos (/projetos ou /)
  if (baseRoute === 'projetos' || pathname === '/') {
    return {
      title: 'Projetos',
      showBoardActions: false,
      icon: icons.default,
      search: {
        placeholder: role === 'admin' ? 'Buscar em todos os projetos...' : 'Buscar meus projetos...',
        context: 'global_projects',
      },
      button: { text: '+ Novo Projeto', href: '/projetos/novo' }
    }
  }

  // 4. Fallback (Páginas globais)
  return {
    title: baseRoute === 'dashboard' ? 'Dashboard Global' : 'Operum',
    showBoardActions: false,
    icon: baseRoute === 'dashboard' ? icons.dashboard : icons.default,
    search: {
      placeholder: 'Buscar...',
      context: 'default',
    },
    button: null
  }
}

export default function TopNav() {
  const pathname = usePathname()

  const [user, setUser] = useState<{ name: string; avatarUrl?: string | null; role?: string; projectManagerIn?: string[] } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [csvOpen, setCsvOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => { if (d?.user) setUser(d.user) })
      .catch(() => { })
  }, [])

  useEffect(() => {
    if (!user) return
    function fetchCount() {
      fetch('/api/notificacoes/count')
        .then(r => r.json())
        .then(d => { if (typeof d?.count === 'number') setUnreadCount(d.count) })
        .catch(() => { })
    }
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [user])

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  const { title, icon, showBoardActions, search, button } = getHeaderContext(pathname, user?.role, user?.projectManagerIn ?? [])

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 h-16 bg-white backdrop-blur-sm border-b border-gray-100 transition-all duration-200">

      <Link href={'/'}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shadow-sm flex items-center justify-center">
            {icon}
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Operum</span>
        </div>
      </Link>

      <div className="flex items-center gap-3 md:gap-4 flex-1 justify-center max-w-2xl px-4">
        
        <div className="flex-1 max-w-md">
          <GlobalSearch 
            placeholder={search.placeholder}
            searchContext={search.context}
            contextId={search.contextId}
          />
        </div>

        {button && (
          <Link
            href={button.href}
            className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            {button.text}
          </Link>
        )}

      </div>

      <div className="flex items-center gap-3 md:gap-4 ml-4">
        
        {user?.role === 'admin' && (
          <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors" title="Painel Admin">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        )}

        <Link
          href="/notificacoes"
          aria-label="Notificações"
          className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 rounded-full md:rounded-lg p-1 md:px-2 md:py-1 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {user.name.split(' ')[0]}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                <Link href="/perfil" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setUserMenuOpen(false)}>Meu Perfil</Link>
                <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setUserMenuOpen(false)}>Dashboard</Link>
                <form action="/api/logout" method="POST">
                  <button type="submit" className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">Sair</button>
                </form>
              </div>
            )}
          </div>
        )}

        {showBoardActions && (
          <div className="">
            <BoardActionMenu onImportCsv={() => setCsvOpen(true)} onCreateSprint={() => setShowCreate(true)} onManageTags={() => setTagOpen(true)} />
          </div>
        )}
      </div>
    </header>
  )
}