import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'

export default async function ProjetosLayout({ children }: { children: React.ReactNode }) {
  const { role } = await verifySession()
  if (role !== 'admin' && role !== 'gerente') {
    redirect('/sprints')
  }
  return <>{children}</>
}
