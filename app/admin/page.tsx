import { verifySession } from '@/lib/dal'
import { adminApi, projectsApi, notificationsApi } from '@/lib/api-client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getAdminStats(userId: string) {
  const [users, projects, notifications] = await Promise.all([
    adminApi.listAllUsers().catch(() => []),
    projectsApi.list(1, 1000).catch(() => ({ items: [], total: 0 })),
    notificationsApi.list(userId, { status: 'UNREAD', limit: '1000' }).catch(() => []),
  ])
  const totalUsers = users.length
  const activeUsers = users.filter((u: { isActive?: boolean }) => u.isActive).length
  const totalProjetos = projects.total
  const activeProjetos = projects.items.filter((p: { status?: string }) => p.status === 'ACTIVE').length
  const unreadAlerts = notifications.length
  return { totalUsers, activeUsers, totalProjetos, activeProjetos, unreadAlerts }
}

export default async function AdminPage() {
  const { userId } = await verifySession()
  const stats = await getAdminStats(userId)

  const navCards = [
    {
      href: '/admin/users',
      title: 'Usuários',
      description: 'Gerenciar contas, papéis e permissões',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      stat: `${stats.activeUsers} actives de ${stats.totalUsers}`,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      href: '/admin/dashboard',
      title: 'Dashboard Global',
      description: 'Visão geral de projetos, custos e métricas',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      stat: `${stats.activeProjetos} projetos actives`,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      href: '/projetos',
      title: 'Projetos',
      description: 'Criar e gerenciar projetos e equipes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      stat: `${stats.totalProjetos} no total`,
      color: 'bg-green-50 text-green-600',
    },
    {
      href: '/arquivos',
      title: 'Arquivos',
      description: 'Gerenciar uploads e downloads de arquivos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      ),
      stat: null,
      color: 'bg-orange-50 text-orange-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Painel Administractive</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie usuários, projetos e configurações do sistema</p>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Usuários actives</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.activeProjetos}</p>
            <p className="text-xs text-gray-500 mt-1">Projetos actives</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.unreadAlerts}</p>
            <p className="text-xs text-gray-500 mt-1">Alertas não lidos</p>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {navCards.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{card.description}</p>
                  {card.stat && (
                    <p className="text-xs text-gray-400 mt-2">{card.stat}</p>
                  )}
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
