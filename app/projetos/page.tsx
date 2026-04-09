import { verifySession } from '@/lib/dal'
import { findAllByTenant } from '@/services/projetoService'
import { STATUS_CONFIG } from '@/lib/statusConfig'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProjetosPage() {
  const { tenantId, role } = await verifySession()
  const projetos = await findAllByTenant(tenantId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {role === 'admin' && (
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <h1 className="text-xl font-bold text-gray-900">Projetos</h1>
        </div>
        <Link
          href="/projetos/novo"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
        >
          + Novo Projeto
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {projetos.length === 0 ? (
          <EmptyState
            heading="Nenhum projeto encontrado"
            subtext="Crie seu primeiro projeto para começar"
            size="md"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projetos.map(projeto => {
              const s = STATUS_CONFIG[projeto.status] ?? STATUS_CONFIG.ATIVO
              return (
                <Link
                  key={projeto.id}
                  href={`/projetos/${projeto.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {projeto.nome}
                    </h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  {projeto.descricao && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{projeto.descricao}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Criado em {projeto.createdAt.toLocaleDateString('pt-BR')}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
