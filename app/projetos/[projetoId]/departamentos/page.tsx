import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Funções e departamentos não são mais associados a cada projeto: todo o catálogo
 * (Admin > Cadastros) vale em qualquer projeto. A rota antiga leva aos Stakeholders.
 */
export default async function Page({ params }: { params: Promise<{ projetoId: string }> }) {
  const { projetoId } = await params
  redirect(`/projetos/${projetoId}/stakeholders`)
}
