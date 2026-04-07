import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projetoService'
import { findAllByProjeto } from '@/services/sprintService'
import prisma from '@/lib/prisma'
import ProjetoTabs from '@/components/projetos/ProjetoTabs'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ATIVO:     { label: 'Ativo',     cls: 'bg-green-100 text-green-700' },
  INATIVO:   { label: 'Inativo',   cls: 'bg-gray-100 text-gray-500' },
  CONCLUIDO: { label: 'Concluído', cls: 'bg-blue-100 text-blue-700' },
  ARQUIVADO: { label: 'Arquivado', cls: 'bg-amber-100 text-amber-700' },
}

const SPRINT_STATUS: Record<string, { label: string; cls: string }> = {
  PLANNED:   { label: 'Planejada',  cls: 'bg-gray-100 text-gray-600' },
  ACTIVE:    { label: 'Ativa',      cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Concluída',  cls: 'bg-blue-100 text-blue-700' },
}

export default async function ProjetoDetailPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { role } = await verifySession()

  const [projeto, sprints, membros] = await Promise.all([
    findById(projetoId),
    findAllByProjeto(projetoId),
    prisma.usuarioProjeto.findMany({
      where: { projetoId, dataSaida: null },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, cargo: true, role: true } } },
    }),
  ])

  if (!projeto) notFound()

  const s = STATUS_CONFIG[projeto.status] ?? STATUS_CONFIG.ATIVO
  const canEdit = role === 'admin' || role === 'gerente'

  const sprintsData = sprints.map(sprint => ({
    id: sprint.id,
    name: sprint.name,
    status: sprint.status,
    startDate: sprint.startDate?.toISOString() ?? null,
    endDate: sprint.endDate?.toISOString() ?? null,
    createdAt: sprint.createdAt.toISOString(),
  }))

  const membrosData = membros.map(m => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    cargo: m.user.cargo,
    role: m.user.role,
    dataEntrada: m.dataEntrada.toISOString(),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projetos" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{projeto.nome}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                  {s.label}
                </span>
              </div>
              {projeto.descricao && (
                <p className="text-sm text-gray-500 mt-0.5">{projeto.descricao}</p>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/projetos/${projetoId}/dashboard`}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Dashboard
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <ProjetoTabs
          projetoId={projetoId}
          projeto={{
            id: projeto.id,
            nome: projeto.nome,
            descricao: projeto.descricao ?? null,
            status: projeto.status,
            createdAt: projeto.createdAt.toISOString(),
            updatedAt: projeto.updatedAt.toISOString(),
          }}
          sprints={sprintsData}
          membros={membrosData}
          sprintStatusConfig={SPRINT_STATUS}
          canEdit={canEdit}
        />
      </main>
    </div>
  )
}
