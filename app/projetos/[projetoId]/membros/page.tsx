import { redirect } from 'next/navigation'

export default async function ProjetoMembrosPage({
  params,
}: {
  params: Promise<{ projetoId: string }>
}) {
  const { projetoId } = await params
  redirect(`/projetos/${projetoId}/stakeholders`)
}
