import { verifySession } from '@/lib/dal'
import { findAllByTenant } from '@/services/projetoService'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ATIVO:     { label: 'Ativo',     cls: 'bg-green-100 text-green-700' },
  INATIVO:   { label: 'Inativo',   cls: 'bg-gray-100 text-gray-500' },
  CONCLUIDO: { label: 'Concluído', cls: 'bg-blue-100 text-blue-700' },
  ARQUIVADO: { label: 'Arquivado', cls: 'bg-amber-100 text-amber-700' },
}

export default async function ProjetosPage() {
  const { tenantId, role } = await verifySession()
  const projetos = await findAllByTenant(tenantId)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={role === 'admin' ? '/admin' : '/sprints'} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-gray-500 font-medium">Nenhum projeto encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Crie seu primeiro projeto para começar</p>
          </div>
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
