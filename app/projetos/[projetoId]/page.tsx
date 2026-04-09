import { redirect } from 'next/navigation'

export default async function ProjetoRootPage({
  params,
}: {
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  redirect(`/projetos/${projetoId}/dashboard`)
}
