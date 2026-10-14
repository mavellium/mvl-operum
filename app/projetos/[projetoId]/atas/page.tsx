import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * As atas ficam em Documentação > Atas de Reunião. Esta rota antiga só redireciona,
 * para links e favoritos antigos não caírem em 404.
 */
export default async function AtasPage({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  redirect(`/projetos/${projetoId}/documentacao?doc=atas`)
}
