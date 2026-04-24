import { verifySession } from '@/lib/dal'
import { projectsApi } from '@/lib/api-client'
import { STATUS_CONFIG } from '@/lib/statusConfig'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'
import DeleteProjectButton from '@/components/projetos/DeleteProjectButton'

export const dynamic = 'force-dynamic'

// --- ÍCONES SVG REFINADOS ---
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
)
const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
)
const IconCalendar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
)

// Helper para Logo Fallback com Gradientes Premium
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getGradient(name: string) {
  const gradients = [
    'from-blue-500 to-cyan-400',
    'from-violet-500 to-purple-400',
    'from-emerald-500 to-teal-400',
    'from-rose-500 to-orange-400',
    'from-amber-500 to-yellow-400',
    'from-indigo-500 to-blue-400'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

// Helper para formatar data curta (ex: 12/Jan/2026)
function formatDateShort(date?: Date | string | null) {
  if (!date) return '--/--/----'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ de /g, '/').replace('.', '')
}

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await verifySession()

  const params = await searchParams
  const currentPage = Number(params?.page) || 1
  const limit = 9 // Grid 3x3 perfeito

  const { items: projetos, total } = await projectsApi.list(currentPage, limit)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      {/* BACKGROUND DECORATIVO (Glow sutil no topo) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[300px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 py-10 relative z-10">
        {projetos.length === 0 ? (
          <div className="mt-12 bg-white rounded-3xl border border-slate-200/60 p-10 shadow-sm">
            <EmptyState
              heading="Nenhum projeto encontrado"
              subtext="Você ainda não possui projetos ativos ou na página atual."
              size="md"
            />
          </div>
        ) : (
          <>
            {/* GRID DE PROJETOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projetos.map(projeto => {
                const s = STATUS_CONFIG[projeto.status ?? 'ACTIVE'] ?? STATUS_CONFIG.ACTIVE
                const qtdMembros = (projeto as { _count?: { members?: number } })._count?.members ?? 0

                return (
                  <div 
                    key={projeto.id}
                    className="group flex flex-col relative bg-white rounded-[20px] border border-slate-200/60 hover:border-blue-300 hover:shadow-[0_8px_30px_rgb(59,130,246,0.08)] transition-all duration-300 overflow-hidden h-full"
                  >
                    {/* Link principal (cobre quase todo o card) */}
                    <Link href={`/projetos/${projeto.id}`} className="absolute inset-0 z-10" aria-label={`Acessar projeto ${projeto.name}`} />

                    <div className="p-6 pb-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-5 relative z-20">
                        {/* LOGO DO PROJETO */}
                        <div className="flex items-center gap-4">
                          {projeto.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={projeto.logoUrl} alt="Logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0" />
                          ) : (
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradient(projeto.name)} text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0`}>
                              {getInitials(projeto.name)}
                            </div>
                          )}
                          
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
                              {s.label}
                            </span>
                          </div>
                        </div>

                        {/* BOTÕES DE AÇÃO (Flutuantes no canto direito) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center bg-white/90 backdrop-blur-sm border border-slate-200/80 shadow-sm rounded-xl p-1 -mt-2 -mr-2">
                          <Link 
                            href={`/projetos/novo?edit=${projeto.id}`} 
                            title="Editar Projeto"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <IconEdit />
                          </Link>
                          {/* O botão Delete é Client Component, então precisa estar acima do z-10 do Link */}
                          <div className="relative z-20">
                            <DeleteProjectButton id={projeto.id} name={projeto.name} />
                          </div>
                        </div>
                      </div>

                      {/* CONTEÚDO (TÍTULO E DESCRIÇÃO) */}
                      <div className="flex flex-col flex-1">
                        <h2 className="text-xl font-bold text-slate-800 line-clamp-1 mb-2 group-hover:text-blue-600 transition-colors">
                          {projeto.name}
                        </h2>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                          {projeto.slogan || "Nenhuma descrição detalhada fornecida para este projeto."}
                        </p>
                      </div>
                    </div>

                    {/* RODAPÉ DO CARTÃO (Datas de Início e Fim) */}
                    <div className="mt-auto bg-slate-50/50 border-t border-slate-100/80 px-6 py-4 flex items-center justify-between relative z-20 pointer-events-none">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-400">
                          <IconUsers />
                        </div>
                        <span>{qtdMembros} <span className="font-normal text-slate-500">{qtdMembros === 1 ? 'membro' : 'membros'}</span></span>
                      </div>
                      
                      {/* --- NOVO BLOCO DE DATAS --- */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <IconCalendar />
                        <div className="flex flex-col leading-tight">
                          <span>{formatDateShort(projeto.startDate)}</span>
                          <span className="text-slate-400 text-[10px]">até {formatDateShort(projeto.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PAGINAÇÃO MODERNA (Pill Style) */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center">
                <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                  {currentPage > 1 ? (
                    <Link href={`/projetos?page=${currentPage - 1}`} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      Anterior
                    </Link>
                  ) : (
                    <span className="px-4 py-2 text-sm font-semibold text-slate-300 cursor-not-allowed">Anterior</span>
                  )}
                  
                  <div className="px-4 py-2 flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-400">Página</span>
                    <span className="text-sm font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{currentPage}</span>
                    <span className="text-sm font-medium text-slate-400">de {totalPages}</span>
                  </div>

                  {currentPage < totalPages ? (
                    <Link href={`/projetos?page=${currentPage + 1}`} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      Próxima
                    </Link>
                  ) : (
                    <span className="px-4 py-2 text-sm font-semibold text-slate-300 cursor-not-allowed">Próxima</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}