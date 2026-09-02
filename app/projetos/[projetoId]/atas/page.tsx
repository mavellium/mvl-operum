import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { findById } from '@/services/projectService'
import { isProjectManager } from '@/services/projectRoleService'
import { listarAtasPorProjeto } from '@/services/ataService'
import prisma from '@/lib/prisma'
import { removerAtaAction } from '@/app/actions/atas'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Atas de Reunião' }

const fmtDate = (d: Date | null | undefined): string => {
  if (!d) return '—'
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR')
}

export default async function AtasPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  const { userId, role } = await verifySession()

  const project = await findById(projetoId)
  if (!project) notFound()

  const isMember = role === 'admin' || (await isProjectManager(userId, projetoId))
  if (!isMember) {
    const entry = await prisma.userProject.findUnique({
      where: { userId_projectId: { userId, projectId: projetoId } },
    })
    if (!entry?.active) notFound()
  }

  // Memória: no ambiente do cliente a listagem já quebrou com 500 por dado
  // específico (migration de Ata não aplicada, ata incompleta, relação ausente).
  // Em vez de 500, mostramos um estado informativo e seguimos com o restante da página.
  let ataList: Awaited<ReturnType<typeof listarAtasPorProjeto>> = []
  let loadError: string | null = null
  try {
    ataList = await listarAtasPorProjeto(projetoId)
  } catch (err) {
    console.error('[AtasPage] falha ao listar atas:', err)
    loadError = 'Não foi possível carregar as atas agora. Tente novamente em instantes.'
  }

  const gerente = (await isProjectManager(userId, projetoId)) || role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Atas de Reunião</h1>
            <p className="text-sm text-gray-500 mt-1">Registro e exportação das atas do projeto {project.name}.</p>
          </div>
          <Link
            href={`/projetos/${projetoId}/atas/nova`}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            + Nova Ata
          </Link>
        </div>

        {loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            <p className="font-medium">Atas indisponíveis</p>
            <p className="mt-1 text-amber-700">
              {loadError} Se o problema persistir, verifique se as migrações de banco foram aplicadas no ambiente.
            </p>
          </div>
        )}

        {!loadError && ataList.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500">Nenhuma ata registrada ainda.</p>
            <p className="text-sm text-gray-400 mt-1">Clique em “+ Nova Ata” para criar a primeira.</p>
          </div>
        ) : !loadError ? (
          <div className="space-y-3">
            {ataList.map(ata => (
              <div
                key={ata.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold">
                    {String(ata.numero ?? 0).padStart(2, '0')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{fmtDate(ata.data)}</p>
                    <p className="text-sm text-gray-500">
                      Elaborado por {ata.elaboradoPor || '—'}
                      {ata.local ? ` · ${ata.local}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projetos/${projetoId}/atas/${ata.id}`}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                  >
                    Ver / Editar
                  </Link>
                  <a
                    href={`/api/atas/${ata.id}/export`}
                    className="px-3 py-1.5 text-sm text-white bg-gray-800 hover:bg-gray-900 rounded-lg font-medium"
                    download
                  >
                    Exportar .docx
                  </a>
                  {gerente && (
                    <form
                      action={async () => { await removerAtaAction(ata.id, projetoId) }}
                      onSubmit={e => {
                        if (!confirm(`Remover a ata ${String(ata.numero ?? 0).padStart(2, '0')}?`)) e.preventDefault()
                      }}
                    >
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                      >
                        Remover
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  )
}
