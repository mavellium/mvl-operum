import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projetoService'
import prisma from '@/lib/prisma'
import ProjetoMembrosClient from '@/components/projetos/ProjetoMembrosClient'

export const dynamic = 'force-dynamic'

export default async function ProjetoMembrosPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { tenantId, role } = await verifySession()

  if (role !== 'admin' && role !== 'gerente') {
    notFound()
  }

  // Adicionamos as buscas de role (funções) e departamentos na mesma Promise para ser rápido
  const [projeto, membros, todosUsuarios, funcoesDb, departamentosDb] = await Promise.all([
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
    // Busca as funções reais (tabela role)
    prisma.role.findMany({
      where: { tenantId },
      select: { nome: true },
      orderBy: { nome: 'asc' }
    }),
    // Busca os departamentos reais (Ajuste 'departamento' para o nome exato da sua tabela se precisar)
    prisma.departamento.findMany({
      where: { tenantId },
      select: { nome: true },
      orderBy: { nome: 'asc' }
    })
  ])

  if (!projeto) notFound()

  const membroIds = new Set(membros.map(m => m.userId))
  const disponiveis = todosUsuarios.filter(u => !membroIds.has(u.id))

  const membrosData = membros.map(m => {
    
    const cargosArray = m.cargo 
      ? m.cargo.split(',').map(s => s.trim()).filter(Boolean) 
      : []
      
    const departamentosArray = m.departamento 
      ? m.departamento.split(',').map(s => s.trim()).filter(Boolean) 
      : []

    return {
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.user.role,
      
      // Passando as novas propriedades em formato de Array
      cargos: cargosArray,
      departamentos: departamentosArray,
      
      // Mantendo as antigas para não quebrar a tipagem interna caso precise
      cargo: m.cargo,
      departamento: m.departamento,
      
      valorHora: m.valorHora,
      dataEntrada: m.dataEntrada.toISOString(),
    }
  })

  const disponiveisData = disponiveis.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    role: u.role,
  }))

  const funcoesExistentes = funcoesDb.map(f => f.nome)
  const departamentosExistentes = departamentosDb.map(d => d.nome)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <ProjetoMembrosClient
          projetoId={projetoId}
          membros={membrosData}
          disponiveis={disponiveisData}
          funcoesExistentes={funcoesExistentes}
          departamentosExistentes={departamentosExistentes}
          currentUserRole={role}
        />
      </main>
    </div>
  )
}