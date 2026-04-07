import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projetoService'
import prisma from '@/lib/prisma'
import ProjetoMembrosClient from '@/components/projetos/ProjetoMembrosClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProjetoMembrosPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role } = await verifySession()

  if (role !== 'admin' && role !== 'gerente') {
    notFound()
  }

  const [projeto, membros, todosUsuarios] = await Promise.all([
    findById(projetoId),
    prisma.usuarioProjeto.findMany({
      where: { projetoId, ativo: true },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
      orderBy: { dataEntrada: 'asc' },
    }),
    prisma.user.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!projeto) notFound()

  const membroIds = new Set(membros.map(m => m.userId))
  const disponiveis = todosUsuarios.filter(u => !membroIds.has(u.id))

  const membrosData = membros.map(m => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    role: m.user.role,
    cargo: m.cargo,
    departamento: m.departamento,
    valorHora: m.valorHora,
    dataEntrada: m.dataEntrada.toISOString(),
  }))

  const disponiveisData = disponiveis.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    role: u.role,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/projetos/${projetoId}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Membros — {projeto.nome}</h1>
          <p className="text-sm text-gray-500">{membros.length} membro{membros.length !== 1 ? 's' : ''}</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <ProjetoMembrosClient
          projetoId={projetoId}
          membros={membrosData}
          disponiveis={disponiveisData}
        />
      </main>
    </div>
  )
}
