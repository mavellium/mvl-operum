'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftOpen } from 'lucide-react'
import Tooltip from '@/components/ui/Tooltip'
import SidebarLayout from '@/components/layout/SidebarLayout'

interface Props {
  projetoId: string
  canManageMembers: boolean
}

const STORAGE_KEY = 'wbs-project-sidebar-collapsed'

const DashboardIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const SprintsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
)

const StakeholdersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
  </svg>
)

const CargosIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const DepartamentosIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const DocumentosIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const WbsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm7 0a1 1 0 011-1h7a1 1 0 011 1v2a1 1 0 01-1 1h-7a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zm7 0a1 1 0 011-1h7a1 1 0 011 1v2a1 1 0 01-1 1h-7a1 1 0 01-1-1v-2z" />
  </svg>
)

const CustosIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

export default function ProjectSidebar({ projetoId, canManageMembers }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [animated, setAnimated] = useState(false)

  // Lido do localStorage só no client, depois do primeiro paint, para não gerar
  // divergência de hidratação entre servidor e navegador. `animated` só liga as
  // transições depois do paint (senão o estado salvo animaria ao carregar).
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const navItems = [
    { href: `/projetos/${projetoId}/dashboard`, label: 'Dashboard', Icon: DashboardIcon },
    { href: `/projetos/${projetoId}/sprints`, label: 'Sprints', Icon: SprintsIcon },
    { href: `/projetos/${projetoId}/wbs`, label: 'EAP / WBS', Icon: WbsIcon },
    { href: `/projetos/${projetoId}/documentacao`, label: 'Documentação', Icon: DocumentosIcon },
    { href: `/projetos/${projetoId}/planilha-custos`, label: 'Planilha de Custos', Icon: CustosIcon },
    ...(canManageMembers
      ? [
          { href: `/projetos/${projetoId}/stakeholders`, label: 'Stakeholders', Icon: StakeholdersIcon },
          { href: `/projetos/${projetoId}/funcoes`, label: 'Funções', Icon: CargosIcon },
          { href: `/projetos/${projetoId}/departamentos`, label: 'Departamentos', Icon: DepartamentosIcon }
        ]
      : []),
  ]

  // Contexto da busca conforme a sub-rota do projeto.
  const subRoute = pathname.split('/')[3] ?? ''
  const search: { placeholder: string; context: 'global_projects' | 'project_items' | 'sprint_items' | 'project_members' | 'default'; contextId?: string } = (
    subRoute === 'membros'
      ? { placeholder: 'Buscar membros no projeto...', context: 'project_members', contextId: projetoId }
      : subRoute === 'funcoes' || subRoute === 'departamentos'
        ? { placeholder: 'Buscar cards e sprints no projeto...', context: 'default' }
        : { placeholder: 'Buscar cards e sprints no projeto...', context: 'project_items', contextId: projetoId }
  )

  const title = navItems.find(i => isActive(i.href))?.label ?? 'Projeto'

  // Recolhido: nenhuma coluna reservada — só um botão flutuante sobre o conteúdo,
  // para o main ocupar 100% do espaço horizontal.
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
        {navItems.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon />
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